"""
Worker Manager for TalentTriage.

This script manages all worker processes and provides a simple interface to enqueue jobs.
"""
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import redis
from loguru import logger
from rq import Queue, Worker

# Add current directory to path
sys.path.append(str(Path(__file__).parent))
from shared.utils import get_supabase_client

# Initialize Redis connection for RQ
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_conn = redis.from_url(REDIS_URL)

# Create queues
parse_queue = Queue("parse", connection=redis_conn)
embedding_queue = Queue("embedding", connection=redis_conn)
scoring_queue = Queue("scoring", connection=redis_conn)

def enqueue_parse_job(upload_id: str) -> str:
    """
    Enqueue a job to parse a resume.
    
    Args:
        upload_id: ID of the upload record
    
    Returns:
        str: Job ID
    """
    from parse_worker.worker import process_resume_job
    
    logger.info(f"Enqueueing parse job for upload: {upload_id}")
    job = parse_queue.enqueue(process_resume_job, upload_id, job_timeout="10m")
    return job.id

def enqueue_embedding_job(candidate_id: str) -> str:
    """
    Enqueue a job to embed a resume.
    
    Args:
        candidate_id: ID of the candidate/parsed resume
    
    Returns:
        str: Job ID
    """
    from embedding_worker.worker import embed_resume_job
    
    logger.info(f"Enqueueing embedding job for candidate: {candidate_id}")
    job = embedding_queue.enqueue(embed_resume_job, candidate_id, job_timeout="5m")
    return job.id

def enqueue_job_embedding_job(job_id: str) -> str:
    """
    Enqueue a job to embed a job description.
    
    Args:
        job_id: ID of the job
    
    Returns:
        str: Job ID
    """
    from embedding_worker.worker import embed_job_description_job
    
    logger.info(f"Enqueueing embedding job for job description: {job_id}")
    job = embedding_queue.enqueue(embed_job_description_job, job_id, job_timeout="5m")
    return job.id

def enqueue_scoring_job(candidate_id: str, job_id: str) -> str:
    """
    Enqueue a job to score a candidate.
    
    Args:
        candidate_id: ID of the candidate
        job_id: ID of the job
    
    Returns:
        str: Job ID
    """
    from scoring_worker.worker import score_candidate_job
    
    logger.info(f"Enqueueing scoring job for candidate {candidate_id}, job {job_id}")
    job = scoring_queue.enqueue(score_candidate_job, candidate_id, job_id, job_timeout="5m")
    return job.id

def process_pending_uploads() -> int:
    """
    Process all pending uploads.
    
    Returns:
        int: Number of jobs enqueued
    """
    supabase = get_supabase_client()
    
    # Get all uploads with status 'stored'
    response = supabase.table("uploads").select("id").eq("status", "stored").execute()
    
    if not response.data:
        logger.info("No pending uploads to process")
        return 0
    
    count = 0
    for upload in response.data:
        enqueue_parse_job(upload["id"])
        count += 1
    
    logger.info(f"Enqueued {count} parse jobs")
    return count

def process_pending_embeddings() -> int:
    """
    Process all pending embeddings.
    
    Returns:
        int: Number of jobs enqueued
    """
    supabase = get_supabase_client()
    
    # Get parsed resumes without embeddings
    resume_response = supabase.table("parsed_resume").select("candidate_id").is_("embedding", "null").execute()
    
    # Get jobs without embeddings
    job_response = supabase.table("job").select("id").is_("embedding", "null").execute()
    
    count = 0
    
    for resume in resume_response.data:
        enqueue_embedding_job(resume["candidate_id"])
        count += 1
    
    for job in job_response.data:
        enqueue_job_embedding_job(job["id"])
        count += 1
    
    logger.info(f"Enqueued {count} embedding jobs")
    return count

def process_pending_scoring() -> int:
    """
    Process all pending scoring.
    
    Returns:
        int: Number of jobs enqueued
    """
    supabase = get_supabase_client()
    
    # Get candidates with embeddings but no scores
    sql = """
    SELECT pr.candidate_id, pr.job_id
    FROM parsed_resume pr
    LEFT JOIN candidate_score cs ON pr.candidate_id = cs.candidate_id
    WHERE pr.embedding IS NOT NULL
    AND cs.id IS NULL
    """
    
    # Use the correct column names from the parsed_resume table
    response = supabase.table("parsed_resume").select("candidate_id, job_id").not_.is_("embedding", "null").execute()
    
    # Get candidates that don't have scores yet by checking against the candidate_score table
    candidates_with_embeddings = response.data if response.data else []
    
    # Filter out candidates that already have scores
    pending_candidates = []
    for candidate in candidates_with_embeddings:
        score_check = supabase.table("candidate_score").select("id").eq("candidate_id", candidate["candidate_id"]).execute()
        if not score_check.data:
            pending_candidates.append(candidate)
    
    if not pending_candidates:
        logger.info("No pending scoring jobs")
        return 0
    
    count = 0
    for candidate in pending_candidates:
        candidate_id = candidate['candidate_id']
        job_id = candidate['job_id']
        
        enqueue_scoring_job(candidate_id, job_id)
        count += 1
    
    logger.info(f"Enqueued {count} scoring jobs")
    return count

def run_continuous_processing() -> None:
    """
    Run continuous processing of all queues.
    """
    logger.info("Starting continuous processing")
    
    try:
        while True:
            parse_count = process_pending_uploads()
            embedding_count = process_pending_embeddings()
            scoring_count = process_pending_scoring()
            
            total_count = parse_count + embedding_count + scoring_count
            
            if total_count == 0:
                logger.info("No pending jobs, sleeping...")
                time.sleep(10)
            else:
                logger.info(f"Processed {total_count} jobs")
                time.sleep(2)
    
    except KeyboardInterrupt:
        logger.info("Stopping continuous processing")

if __name__ == "__main__":
    logger.info("Starting worker manager")
    run_continuous_processing()
