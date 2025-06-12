"""
Tests for the TalentTriage ingest service

This module contains tests for the FastAPI ingest service endpoints.
"""
import os
import sys
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import io

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the FastAPI app
from ingest_service.main import app

# Create test client
client = TestClient(app)

# Mock environment variables
@pytest.fixture(autouse=True)
def mock_env_vars():
    """Mock environment variables for testing"""
    with patch.dict(os.environ, {
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_KEY": "test-key",
        "STORAGE_BUCKET": "resumes"
    }):
        yield

# Mock Supabase client
@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client for testing"""
    with patch("ingest_service.main.init_supabase_client") as mock_init:
        mock_client = MagicMock()
        
        # Mock storage
        mock_storage = MagicMock()
        mock_client.storage.from_.return_value = mock_storage
        
        # Mock upload
        mock_storage.upload.return_value = {"Key": "test-file-key"}
        
        # Mock from method for database
        mock_from = MagicMock()
        mock_client.from_.return_value = mock_from
        
        # Mock insert method
        mock_insert = MagicMock()
        mock_from.insert.return_value = mock_insert
        
        # Mock execute method
        mock_execute = MagicMock()
        mock_insert.execute.return_value = mock_execute
        mock_execute.data = [{"id": "test-upload-id"}]
        
        mock_init.return_value = mock_client
        yield mock_client

# Test health endpoint
def test_health_endpoint():
    """Test the health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

# Test upload endpoint
def test_upload_endpoint(mock_supabase_client):
    """Test the resume upload endpoint"""
    # Create test file
    test_file = io.BytesIO(b"test file content")
    test_file.name = "test_resume.pdf"
    
    # Make request
    response = client.post(
        "/upload",
        files={"files": (test_file.name, test_file, "application/pdf")},
        data={"job_id": "test-job-id"}
    )
    
    # Check response
    assert response.status_code == 200
    assert "upload_ids" in response.json()
    assert len(response.json()["upload_ids"]) == 1
    
    # Verify Supabase calls
    mock_supabase_client.storage.from_.assert_called_once_with("resumes")
    mock_supabase_client.storage.from_().upload.assert_called_once()
    mock_supabase_client.from_.assert_called_once_with("uploads")
    mock_supabase_client.from_().insert.assert_called_once()

# Test upload endpoint with multiple files
def test_upload_multiple_files(mock_supabase_client):
    """Test uploading multiple resume files"""
    # Create test files
    test_file1 = io.BytesIO(b"test file 1 content")
    test_file1.name = "test_resume1.pdf"
    
    test_file2 = io.BytesIO(b"test file 2 content")
    test_file2.name = "test_resume2.docx"
    
    # Make request
    response = client.post(
        "/upload",
        files=[
            ("files", (test_file1.name, test_file1, "application/pdf")),
            ("files", (test_file2.name, test_file2, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
        ],
        data={"job_id": "test-job-id"}
    )
    
    # Check response
    assert response.status_code == 200
    assert "upload_ids" in response.json()
    assert len(response.json()["upload_ids"]) == 2
    
    # Verify Supabase calls
    assert mock_supabase_client.storage.from_().upload.call_count == 2
    assert mock_supabase_client.from_().insert.call_count == 2

# Test upload endpoint with no files
def test_upload_no_files():
    """Test uploading with no files"""
    response = client.post(
        "/upload",
        data={"job_id": "test-job-id"}
    )
    
    # Check response
    assert response.status_code == 400
    assert "error" in response.json()

# Test upload endpoint with invalid job_id
def test_upload_invalid_job_id():
    """Test uploading with invalid job_id"""
    # Create test file
    test_file = io.BytesIO(b"test file content")
    test_file.name = "test_resume.pdf"
    
    # Make request without job_id
    response = client.post(
        "/upload",
        files={"files": (test_file.name, test_file, "application/pdf")}
    )
    
    # Check response
    assert response.status_code == 422  # Validation error

# Test upload endpoint with unsupported file type
def test_upload_unsupported_file_type(mock_supabase_client):
    """Test uploading an unsupported file type"""
    # Create test file with unsupported extension
    test_file = io.BytesIO(b"test file content")
    test_file.name = "test_file.txt"
    
    # Make request
    response = client.post(
        "/upload",
        files={"files": (test_file.name, test_file, "text/plain")},
        data={"job_id": "test-job-id"}
    )
    
    # Check response
    assert response.status_code == 400
    assert "error" in response.json()
    assert "Unsupported file type" in response.json()["error"]
