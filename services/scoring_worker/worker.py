"""
Scoring Worker for TalentTriage.

This worker calculates multi-factor scores for candidates and categorizes them.
"""
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import redis
from loguru import logger
from rq import Connection, Queue, Worker

# Add parent directory to path to import shared module
sys.path.append(str(Path(__file__).parent.parent))
from shared.utils import (
    calculate_jaccard_similarity,
    determine_category,
    execute_sql,
    get_supabase_client,
    scale_experience_years,
    update_record,
    upsert_record,
)

# Initialize Redis connection for RQ
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_conn = redis.from_url(REDIS_URL)

def score_candidate(candidate_id: str, job_id: str) -> Dict[str, Any]:
    """
    Score a candidate against a job description.
    
    Args:
        candidate_id: ID of the candidate
        job_id: ID of the job
    
    Returns:
        Dict: Score result
    
    Raises:
        Exception: If scoring fails
    """
    logger.info(f"Scoring candidate {candidate_id} for job {job_id}")
    
    supabase = get_supabase_client()
    
    # Get parsed resume
    resume_response = supabase.table("parsed_resume").select("*").eq("candidate_id", candidate_id).execute()
    
    if not resume_response.data:
        raise ValueError(f"Parsed resume not found: {candidate_id}")
    
    resume = resume_response.data[0]
    
    # Get job description
    job_response = supabase.table("job").select("*").eq("id", job_id).execute()
    
    if not job_response.data:
        raise ValueError(f"Job not found: {job_id}")
    
    job = job_response.data[0]
    
    # Check if both have embeddings
    if resume.get("embedding") is None:
        raise ValueError(f"Resume has no embedding: {candidate_id}")
    
    if job.get("embedding") is None:
        raise ValueError(f"Job has no embedding: {job_id}")
    
    try:
        # Calculate semantic similarity score using pgvector
        sql = """
        SELECT 1 - (embedding <-> :jd_vec) AS semantic_score
        FROM parsed_resume
        WHERE candidate_id = :candidate_id
        """
        
        params = {
            "jd_vec": job["embedding"],
            "candidate_id": candidate_id
        }
        
        result = execute_sql(supabase, sql, params)
        
        if not result:
            raise ValueError(f"Failed to calculate semantic score for candidate {candidate_id}")
        
        semantic_score = result[0]["semantic_score"]
        
        # Calculate skills score
        candidate_skills = resume.get("skills", [])
        required_skills = job.get("required_skills", [])
        preferred_skills = job.get("preferred_skills", [])
        
        # Weight required skills higher than preferred
        if required_skills:
            required_score = calculate_jaccard_similarity(candidate_skills, required_skills)
        else:
            required_score = 0.0
        
        if preferred_skills:
            preferred_score = calculate_jaccard_similarity(candidate_skills, preferred_skills)
        else:
            preferred_score = 0.0
        
        # Combined skills score (70% required, 30% preferred)
        skills_score = (0.7 * required_score) + (0.3 * preferred_score)
        
        # Calculate experience score
        candidate_years = resume.get("total_years_exp", 0)
        job_years = job.get("min_years_experience", 0)
        
        experience_score = scale_experience_years(candidate_years, job_years if job_years > 0 else 3.0)
        
        # Calculate education score
        education_score = 0.0
        
        try:
            candidate_education = json.loads(resume.get("education", "[]"))
            preferred_education = job.get("preferred_education", [])
            
            if candidate_education and preferred_education:
                # Simple keyword matching for education
                education_matches = 0
                for edu in candidate_education:
                    degree = edu.get("degree", "").lower()
                    institution = edu.get("institution", "").lower()
                    
                    for pref_edu in preferred_education:
                        pref_edu_lower = pref_edu.lower()
                        if pref_edu_lower in degree or pref_edu_lower in institution:
                            education_matches += 1
                            break
                
                if len(candidate_education) > 0:
                    education_score = min(1.0, education_matches / len(candidate_education))
        except Exception as e:
            logger.error(f"Error calculating education score: {e}")
            education_score = 0.0
        
        # Calculate composite score with weights
        # Semantic: 50%, Skills: 30%, Experience: 15%, Education: 5%
        composite_score = (
            0.5 * semantic_score +
            0.3 * skills_score +
            0.15 * experience_score +
            0.05 * education_score
        )
        
        # Determine category
        category = determine_category(composite_score)
        
        # Create score record
        score_data = {
            "candidate_id": candidate_id,
            "job_id": job_id,
            "semantic_score": round(semantic_score, 4),
            "skills_score": round(skills_score, 4),
            "experience_score": round(experience_score, 4),
            "education_score": round(education_score, 4),
            "composite_score": round(composite_score, 4),
            "category": category
        }
        
        # Save score to database
        upsert_record(supabase, "candidate_score", score_data)
        
        # Update upload status
        upload_id = resume["upload_id"]
        update_record(supabase, "uploads", upload_id, {"status": "scored"})
        
        logger.info(f"Successfully scored candidate {candidate_id}: {category} ({composite_score:.4f})")
        
        return score_data
    
    except Exception as e:
        logger.error(f"Error scoring candidate: {e}")
        # Update upload status to error
        upload_id = resume["upload_id"]
        update_record(supabase, "uploads", upload_id, {
            "status": "error",
            "error_message": f"Scoring error: {str(e)}"
        })
        raise

def process_next_scoring() -> Optional[Dict[str, Any]]:
    """
    Process the next candidate that needs scoring.
    
    Returns:
        Dict or None: Score result if successful, None if nothing to process
    """
    supabase = get_supabase_client()
    
    # Get candidates with embeddings but no scores
    sql = """
    SELECT pr.candidate_id, pr.job_id
    FROM parsed_resume pr
    LEFT JOIN candidate_score cs ON pr.candidate_id = cs.candidate_id
    WHERE pr.embedding IS NOT NULL
    AND cs.id IS NULL
    LIMIT 1
    """
    
    result = execute_sql(supabase, sql, {})
    
    if not result:
        logger.info("No candidates to score")
        return None
    
    candidate_id = result[0]["candidate_id"]
    job_id = result[0]["job_id"]
    
    try:
        return score_candidate(candidate_id, job_id)
    except Exception as e:
        logger.error(f"Failed to score candidate {candidate_id}: {e}")
        return None

# RQ worker functions
def score_candidate_job(candidate_id: str, job_id: str) -> Dict[str, Any]:
    """
    RQ job function to score a candidate.
    
    Args:
        candidate_id: ID of the candidate
        job_id: ID of the job
    
    Returns:
        Dict: Score result
    """
    return score_candidate(candidate_id, job_id)

if __name__ == "__main__":
    logger.info("Starting scoring worker")
    
    with Connection(redis_conn):
        queue = Queue("scoring")
        worker = Worker([queue], connection=redis_conn)
        worker.work()
