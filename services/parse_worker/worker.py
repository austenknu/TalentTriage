"""
Parse Worker for TalentTriage.

This worker processes uploaded resume files, extracts text, and parses structured information.
"""
import io
import json
import os
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import docx2txt
import pdfplumber
import redis
import spacy
from loguru import logger
from pyresparser import ResumeParser
from rq import Connection, Queue, Worker

# Add parent directory to path to import shared module
sys.path.append(str(Path(__file__).parent.parent))
from shared.utils import get_supabase_client, update_record, upsert_record

# Initialize Redis connection for RQ
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_conn = redis.from_url(REDIS_URL)

# Load spaCy model for fallback parsing
try:
    nlp = spacy.load("en_core_web_sm")
    logger.info("Loaded spaCy model: en_core_web_sm")
except Exception as e:
    logger.error(f"Failed to load spaCy model: {e}")
    logger.info("Attempting to download spaCy model...")
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

def extract_text(file_content: bytes, mime_type: str) -> str:
    """
    Extract text from a resume file based on its MIME type.
    
    Args:
        file_content: Raw file content
        mime_type: MIME type of the file
    
    Returns:
        str: Extracted text
    
    Raises:
        ValueError: If file type is unsupported
    """
    logger.info(f"Extracting text from file with MIME type: {mime_type}")
    
    if "pdf" in mime_type:
        # Extract text from PDF using pdfplumber
        with io.BytesIO(file_content) as pdf_file:
            try:
                with pdfplumber.open(pdf_file) as pdf:
                    text = ""
                    for page in pdf.pages:
                        text += page.extract_text() or ""
                    return text.strip()
            except Exception as e:
                logger.error(f"Error extracting text from PDF: {e}")
                # Fall back to Apache Tika if available
                try:
                    import tika
                    from tika import parser
                    tika.initVM()
                    parsed = parser.from_buffer(file_content)
                    return parsed["content"].strip()
                except ImportError:
                    logger.error("Tika not available for fallback")
                    raise
    
    elif "word" in mime_type or "docx" in mime_type:
        # Extract text from DOCX using docx2txt
        with io.BytesIO(file_content) as docx_file:
            try:
                text = docx2txt.process(docx_file)
                return text.strip()
            except Exception as e:
                logger.error(f"Error extracting text from DOCX: {e}")
                raise
    
    else:
        # Try Tika for other file types
        try:
            import tika
            from tika import parser
            tika.initVM()
            parsed = parser.from_buffer(file_content)
            return parsed["content"].strip()
        except ImportError:
            logger.error("Unsupported file type and Tika not available")
            raise ValueError(f"Unsupported file type: {mime_type}")

def parse_resume_with_pyresparser(file_path: str) -> Dict[str, Any]:
    """
    Parse resume using PyResparser.
    
    Args:
        file_path: Path to the resume file
    
    Returns:
        Dict: Parsed resume data
    """
    logger.info(f"Parsing resume with PyResparser: {file_path}")
    try:
        data = ResumeParser(file_path).get_extracted_data()
        return data
    except Exception as e:
        logger.error(f"PyResparser failed: {e}")
        return {}

def parse_resume_with_spacy(text: str) -> Dict[str, Any]:
    """
    Parse resume using spaCy as a fallback.
    
    Args:
        text: Resume text
    
    Returns:
        Dict: Parsed resume data
    """
    logger.info("Parsing resume with spaCy fallback")
    doc = nlp(text)
    
    # Extract name (first PERSON entity)
    name = ""
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            name = ent.text
            break
    
    # Extract email
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = []
    for token in doc:
        if token.like_email:
            emails.append(token.text)
    
    # Extract phone (simple regex pattern)
    phone_pattern = r'\b(?:\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b'
    import re
    phones = re.findall(phone_pattern, text)
    
    # Extract skills (basic approach)
    # This is a simplified approach - in a real system, you'd use a comprehensive skills database
    common_skills = [
        "python", "java", "javascript", "react", "angular", "vue", "node", "express",
        "django", "flask", "fastapi", "sql", "nosql", "mongodb", "postgresql",
        "mysql", "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "git",
        "machine learning", "data science", "ai", "nlp", "tensorflow", "pytorch",
        "product management", "agile", "scrum", "kanban", "jira", "confluence"
    ]
    
    skills = []
    text_lower = text.lower()
    for skill in common_skills:
        if skill in text_lower:
            skills.append(skill)
    
    # Estimate total years of experience
    # This is a very simplified approach
    experience_patterns = [
        r'(\d+)\+?\s*years?\s*(?:of)?\s*experience',
        r'experience\s*(?:of)?\s*(\d+)\+?\s*years?'
    ]
    
    years_exp = 0
    for pattern in experience_patterns:
        matches = re.findall(pattern, text_lower)
        if matches:
            years_exp = max(years_exp, int(matches[0]))
    
    return {
        "name": name,
        "email": emails[0] if emails else "",
        "phone": phones[0] if phones else "",
        "skills": skills,
        "total_experience": years_exp
    }

def process_resume(upload_id: str) -> Dict[str, Any]:
    """
    Process a resume file from Supabase Storage.
    
    Args:
        upload_id: ID of the upload record
    
    Returns:
        Dict: Parsed resume data
    
    Raises:
        Exception: If processing fails
    """
    logger.info(f"Processing resume with upload ID: {upload_id}")
    
    supabase = get_supabase_client()
    
    # Get upload record
    upload_response = supabase.table("uploads").select("*").eq("id", upload_id).execute()
    if not upload_response.data:
        raise ValueError(f"Upload record not found: {upload_id}")
    
    upload = upload_response.data[0]
    file_key = upload["file_key"]
    job_id = upload["job_id"]
    mime_type = upload["mime_type"]
    
    try:
        # Download file from storage
        logger.debug(f"Downloading file from storage: {file_key}")
        storage_response = supabase.storage.from_("resumes").download(file_key)
        
        if not storage_response:
            raise ValueError(f"Failed to download file: {file_key}")
        
        file_content = storage_response
        
        # Extract text from file
        text = extract_text(file_content, mime_type)
        
        if not text:
            raise ValueError("Failed to extract text from file")
        
        # Create a temporary file for PyResparser
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file_key).suffix) as temp_file:
            temp_file.write(file_content)
            temp_path = temp_file.name
        
        try:
            # Try parsing with PyResparser first
            parsed_data = parse_resume_with_pyresparser(temp_path)
            
            # If PyResparser fails or returns incomplete data, fall back to spaCy
            if not parsed_data or "name" not in parsed_data or not parsed_data["name"]:
                logger.warning("PyResparser returned incomplete data, falling back to spaCy")
                parsed_data = parse_resume_with_spacy(text)
            
            # Format work experience
            work_experience = []
            if "experience" in parsed_data and parsed_data["experience"]:
                for exp in parsed_data["experience"]:
                    if isinstance(exp, str):
                        # Try to parse experience strings
                        parts = exp.split(",")
                        if len(parts) >= 2:
                            work_experience.append({
                                "title": parts[0].strip(),
                                "company": parts[1].strip(),
                                "start": "",
                                "end": ""
                            })
            
            # Format education
            education = []
            if "education" in parsed_data and parsed_data["education"]:
                for edu in parsed_data["education"]:
                    if isinstance(edu, str):
                        education.append({
                            "degree": edu.strip(),
                            "institution": "",
                            "year": None
                        })
            
            # Get skills
            skills = parsed_data.get("skills", [])
            
            # Get total years of experience
            total_years_exp = parsed_data.get("total_experience", 0)
            if isinstance(total_years_exp, str):
                try:
                    total_years_exp = float(total_years_exp.replace("+", ""))
                except ValueError:
                    total_years_exp = 0
            
            # Create candidate record
            candidate_id = upload_id  # Use upload ID as candidate ID for simplicity
            
            parsed_resume = {
                "candidate_id": candidate_id,
                "job_id": job_id,
                "upload_id": upload_id,
                "raw_text": text,
                "name": parsed_data.get("name", ""),
                "email": parsed_data.get("email", ""),
                "phone": parsed_data.get("mobile_number", parsed_data.get("phone", "")),
                "skills": skills,
                "work_experience": json.dumps(work_experience),
                "education": json.dumps(education),
                "total_years_exp": total_years_exp
            }
            
            # Save parsed resume to database
            upsert_record(supabase, "parsed_resume", parsed_resume)
            
            # Update upload status
            update_record(supabase, "uploads", upload_id, {"status": "parsed"})
            
            logger.info(f"Successfully parsed resume: {candidate_id}")
            
            return parsed_resume
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.error(f"Error removing temporary file: {e}")
    
    except Exception as e:
        logger.error(f"Error processing resume: {e}")
        # Update upload status to error
        update_record(supabase, "uploads", upload_id, {
            "status": "error",
            "error_message": str(e)
        })
        raise

def process_next_resume() -> Optional[Dict[str, Any]]:
    """
    Process the next resume in the queue.
    
    Returns:
        Dict or None: Parsed resume data if successful, None if no resumes to process
    """
    supabase = get_supabase_client()
    
    # Get next upload with status 'stored'
    response = supabase.table("uploads").select("id").eq("status", "stored").limit(1).execute()
    
    if not response.data:
        logger.info("No resumes to process")
        return None
    
    upload_id = response.data[0]["id"]
    
    try:
        return process_resume(upload_id)
    except Exception as e:
        logger.error(f"Failed to process resume {upload_id}: {e}")
        return None

# RQ worker functions
def process_resume_job(upload_id: str) -> Dict[str, Any]:
    """
    RQ job function to process a resume.
    
    Args:
        upload_id: ID of the upload record
    
    Returns:
        Dict: Parsed resume data
    """
    return process_resume(upload_id)

if __name__ == "__main__":
    logger.info("Starting parse worker")
    
    with Connection(redis_conn):
        queue = Queue("parse")
        worker = Worker([queue], connection=redis_conn)
        worker.work()
