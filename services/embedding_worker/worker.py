"""
Embedding Worker for TalentTriage.

This worker generates vector embeddings for parsed resumes using Sentence Transformers.
"""
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np
import redis
from loguru import logger
from rq import Connection, Queue, Worker
from sentence_transformers import SentenceTransformer

# Add parent directory to path to import shared module
sys.path.append(str(Path(__file__).parent.parent))
from shared.utils import get_supabase_client, update_record

# Initialize Redis connection for RQ
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_conn = redis.from_url(REDIS_URL)

# Load embedding model
MODEL_NAME = os.getenv("MODEL_NAME", "all-MiniLM-L6-v2")
EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", "384"))

logger.info(f"Loading embedding model: {MODEL_NAME}")
try:
    model = SentenceTransformer(MODEL_NAME)
    logger.info(f"Model loaded successfully: {MODEL_NAME}")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    raise

def embed_text(text: str) -> List[float]:
    """
    Generate embedding vector for text.
    
    Args:
        text: Text to embed
    
    Returns:
        List[float]: Embedding vector
    """
    logger.debug(f"Generating embedding for text (length: {len(text)})")
    
    # Truncate text if too long (most models have a token limit)
    # This is a simple character-based truncation; in production, use proper tokenization
    max_chars = 10000  # Approximate limit
    if len(text) > max_chars:
        logger.warning(f"Text too long ({len(text)} chars), truncating to {max_chars}")
        text = text[:max_chars]
    
    # Generate embedding
    embedding = model.encode(text, normalize_embeddings=True)
    
    # Convert to list for storage
    return embedding.tolist()

def embed_resume(candidate_id: str) -> Optional[Dict[str, Any]]:
    """
    Generate embedding for a parsed resume.
    
    Args:
        candidate_id: ID of the candidate/parsed resume
    
    Returns:
        Dict or None: Updated resume record if successful
    
    Raises:
        Exception: If embedding generation fails
    """
    logger.info(f"Embedding resume for candidate: {candidate_id}")
    
    supabase = get_supabase_client()
    
    # Get parsed resume
    response = supabase.table("parsed_resume").select("*").eq("candidate_id", candidate_id).execute()
    
    if not response.data:
        logger.error(f"Parsed resume not found for candidate: {candidate_id}")
        return None
    
    resume = response.data[0]
    
    # Check if already embedded
    if resume.get("embedding") is not None:
        logger.info(f"Resume already embedded: {candidate_id}")
        return resume
    
    try:
        # Generate embedding
        raw_text = resume["raw_text"]
        if not raw_text:
            raise ValueError("Resume has no text content")
        
        embedding = embed_text(raw_text)
        
        # Update resume with embedding
        update_data = {"embedding": embedding}
        
        response = supabase.table("parsed_resume").update(update_data).eq("candidate_id", candidate_id).execute()
        
        if not response.data:
            raise ValueError(f"Failed to update resume with embedding: {candidate_id}")
        
        # Update upload status
        upload_id = resume["upload_id"]
        update_record(supabase, "uploads", upload_id, {"status": "embedded"})
        
        logger.info(f"Successfully embedded resume: {candidate_id}")
        
        return response.data[0]
    
    except Exception as e:
        logger.error(f"Error embedding resume: {e}")
        # Update upload status to error
        upload_id = resume["upload_id"]
        update_record(supabase, "uploads", upload_id, {
            "status": "error",
            "error_message": f"Embedding error: {str(e)}"
        })
        raise

def embed_job_description(job_id: str) -> Optional[Dict[str, Any]]:
    """
    Generate embedding for a job description.
    
    Args:
        job_id: ID of the job
    
    Returns:
        Dict or None: Updated job record if successful
    """
    logger.info(f"Embedding job description: {job_id}")
    
    supabase = get_supabase_client()
    
    # Get job description
    response = supabase.table("job").select("*").eq("id", job_id).execute()
    
    if not response.data:
        logger.error(f"Job not found: {job_id}")
        return None
    
    job = response.data[0]
    
    # Check if already embedded
    if job.get("embedding") is not None:
        logger.info(f"Job already embedded: {job_id}")
        return job
    
    try:
        # Generate embedding
        description = job["description"]
        if not description:
            raise ValueError("Job has no description")
        
        embedding = embed_text(description)
        
        # Update job with embedding
        update_data = {"embedding": embedding}
        
        response = supabase.table("job").update(update_data).eq("id", job_id).execute()
        
        if not response.data:
            raise ValueError(f"Failed to update job with embedding: {job_id}")
        
        logger.info(f"Successfully embedded job description: {job_id}")
        
        return response.data[0]
    
    except Exception as e:
        logger.error(f"Error embedding job description: {e}")
        raise

def process_next_embedding() -> Optional[Dict[str, Any]]:
    """
    Process the next resume or job that needs embedding.
    
    Returns:
        Dict or None: Updated record if successful, None if nothing to process
    """
    supabase = get_supabase_client()
    
    # First check for parsed resumes without embeddings
    resume_response = supabase.table("parsed_resume").select("candidate_id").is_("embedding", "null").limit(1).execute()
    
    if resume_response.data:
        candidate_id = resume_response.data[0]["candidate_id"]
        try:
            return embed_resume(candidate_id)
        except Exception as e:
            logger.error(f"Failed to embed resume {candidate_id}: {e}")
            return None
    
    # Then check for jobs without embeddings
    job_response = supabase.table("job").select("id").is_("embedding", "null").limit(1).execute()
    
    if job_response.data:
        job_id = job_response.data[0]["id"]
        try:
            return embed_job_description(job_id)
        except Exception as e:
            logger.error(f"Failed to embed job {job_id}: {e}")
            return None
    
    logger.info("No items to embed")
    return None

# RQ worker functions
def embed_resume_job(candidate_id: str) -> Dict[str, Any]:
    """
    RQ job function to embed a resume.
    
    Args:
        candidate_id: ID of the candidate/parsed resume
    
    Returns:
        Dict: Updated resume record
    """
    return embed_resume(candidate_id)

def embed_job_description_job(job_id: str) -> Dict[str, Any]:
    """
    RQ job function to embed a job description.
    
    Args:
        job_id: ID of the job
    
    Returns:
        Dict: Updated job record
    """
    return embed_job_description(job_id)

if __name__ == "__main__":
    logger.info("Starting embedding worker")
    
    with Connection(redis_conn):
        queue = Queue("embedding")
        worker = Worker([queue], connection=redis_conn)
        worker.work()
