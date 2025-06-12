"""
Ingest Service for TalentTriage.

This service handles file uploads and stores them in Supabase Storage.
"""
import os
import sys
import uuid
from pathlib import Path
from typing import Dict, List, Optional

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from pydantic import BaseModel, UUID4

# Add parent directory to path to import shared module
sys.path.append(str(Path(__file__).parent.parent))
from shared.utils import get_supabase_client, upsert_record

app = FastAPI(
    title="TalentTriage Ingest Service",
    description="Service for uploading resume files to TalentTriage",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Response models
class UploadResponse(BaseModel):
    """Response model for file upload endpoint."""
    uploaded: int
    job_id: UUID4
    file_ids: List[UUID4]

@app.post("/upload", response_model=UploadResponse)
async def upload_files(
    job_id: UUID4 = Form(...),
    files: List[UploadFile] = File(...),
) -> Dict:
    """
    Upload multiple resume files for a specific job.
    
    Args:
        job_id: UUID of the job
        files: List of files to upload
    
    Returns:
        Dict with upload stats
    
    Raises:
        HTTPException: If upload fails
    """
    logger.info(f"Received {len(files)} files for job {job_id}")
    
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    try:
        supabase = get_supabase_client()
        
        # Check if job exists
        job_response = supabase.table("job").select("id").eq("id", str(job_id)).execute()
        if not job_response.data:
            raise HTTPException(status_code=404, detail=f"Job with ID {job_id} not found")
        
        file_ids = []
        
        for file in files:
            # Generate a unique file key
            file_uuid = uuid.uuid4()
            file_extension = Path(file.filename).suffix.lower()
            storage_key = f"{job_id}/{file_uuid}{file_extension}"
            
            # Read file content
            content = await file.read()
            file_size = len(content)
            
            # Upload to Supabase Storage
            logger.debug(f"Uploading file {file.filename} to storage as {storage_key}")
            storage_response = supabase.storage.from_("resumes").upload(
                storage_key, 
                content,
                file_options={"content-type": file.content_type}
            )
            
            if hasattr(storage_response, 'error') and storage_response.error:
                logger.error(f"Storage upload error: {storage_response.error}")
                raise HTTPException(status_code=500, detail=f"Storage upload failed: {storage_response.error}")
            
            # Create database record
            upload_record = {
                "id": str(file_uuid),
                "job_id": str(job_id),
                "file_key": storage_key,
                "original_filename": file.filename,
                "file_size": file_size,
                "mime_type": file.content_type,
                "status": "stored"
            }
            
            upsert_record(supabase, "uploads", upload_record)
            file_ids.append(file_uuid)
            
            logger.info(f"Successfully uploaded {file.filename} for job {job_id}")
        
        return {
            "uploaded": len(files),
            "job_id": job_id,
            "file_ids": file_ids
        }
    
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Health check endpoint.
    
    Returns:
        Dict with service status
    """
    return {"status": "healthy"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting ingest service on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
