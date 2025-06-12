# TalentTriage API Documentation

## Overview

This document provides comprehensive documentation for the TalentTriage API endpoints, request/response formats, and authentication requirements.

## Base URL

All API endpoints are relative to the base URL:

- Development: `http://localhost:8000`
- Production: `https://api.talenttriage.yourdomain.com` (replace with actual production URL)

## Authentication

The API uses Supabase authentication. Include the following headers with each request:

```
Authorization: Bearer <supabase_access_token>
```

## Endpoints

### Health Check

**GET /health**

Check the health status of the API service.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-06-11T18:51:41-07:00"
}
```

### Resume Upload

**POST /upload**

Upload one or more resume files for processing.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `job_id`: UUID of the job to associate with the uploads (required)
  - `files`: One or more resume files (PDF or DOCX format) (required)

**Response:**
```json
{
  "upload_ids": ["uuid1", "uuid2", "..."],
  "message": "Files uploaded successfully and queued for processing"
}
```

**Error Responses:**
- 400: Bad Request - Invalid file type or missing job_id
- 413: Payload Too Large - File size exceeds limit
- 500: Internal Server Error - Upload failed

### Resume Processing Status

**GET /status/{upload_id}**

Get the processing status of a specific resume upload.

**Response:**
```json
{
  "upload_id": "uuid",
  "status": "scored", // One of: stored, parsed, embedded, scored, error
  "error_message": null, // Present only if status is "error"
  "candidate_id": "uuid", // Present only if status is "parsed", "embedded", or "scored"
  "score": { // Present only if status is "scored"
    "composite_score": 0.85,
    "category": "top"
  }
}
```

### Reprocess Resume

**POST /reprocess/{upload_id}**

Trigger reprocessing of a specific resume upload.

**Response:**
```json
{
  "upload_id": "uuid",
  "message": "Resume queued for reprocessing"
}
```

### Processing Statistics

**GET /stats/processing**

Get statistics about resume processing status.

**Response:**
```json
{
  "total": 100,
  "by_status": {
    "stored": 5,
    "parsed": 10,
    "embedded": 15,
    "scored": 65,
    "error": 5
  },
  "by_category": {
    "top": 20,
    "moderate": 30,
    "reject": 15,
    "unscored": 35
  }
}
```

### Job Management

**POST /jobs**

Create a new job posting.

**Request:**
- Content-Type: `application/json`
- Body:
```json
{
  "title": "Software Engineer",
  "description": "We are looking for a talented software engineer...",
  "required_skills": ["Python", "FastAPI", "React"],
  "preferred_skills": ["Docker", "AWS"],
  "min_years_experience": 3,
  "preferred_education": ["Bachelor's in Computer Science"]
}
```

**Response:**
```json
{
  "job_id": "uuid",
  "message": "Job created successfully"
}
```

**GET /jobs/{job_id}**

Get details of a specific job.

**Response:**
```json
{
  "id": "uuid",
  "title": "Software Engineer",
  "description": "We are looking for a talented software engineer...",
  "required_skills": ["Python", "FastAPI", "React"],
  "preferred_skills": ["Docker", "AWS"],
  "min_years_experience": 3,
  "preferred_education": ["Bachelor's in Computer Science"],
  "created_at": "2025-06-11T18:51:41-07:00",
  "updated_at": "2025-06-11T18:51:41-07:00",
  "candidate_stats": {
    "total": 25,
    "by_category": {
      "top": 8,
      "moderate": 12,
      "reject": 5
    }
  }
}
```

**PUT /jobs/{job_id}**

Update an existing job posting.

**Request:**
- Content-Type: `application/json`
- Body: Same as POST /jobs

**Response:**
```json
{
  "job_id": "uuid",
  "message": "Job updated successfully"
}
```

**DELETE /jobs/{job_id}**

Delete a job posting and all associated candidates.

**Response:**
```json
{
  "job_id": "uuid",
  "message": "Job and associated candidates deleted successfully"
}
```

### Candidate Management

**GET /jobs/{job_id}/candidates**

Get all candidates for a specific job.

**Query Parameters:**
- `category`: Filter by category (top, moderate, reject)
- `sort`: Sort field (name, score, date)
- `order`: Sort order (asc, desc)
- `limit`: Maximum number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "candidates": [
    {
      "candidate_id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "skills": ["Python", "React", "TypeScript"],
      "total_years_exp": 5,
      "score": {
        "semantic_score": 0.85,
        "skills_score": 0.75,
        "experience_score": 0.9,
        "education_score": 0.8,
        "composite_score": 0.82,
        "category": "top"
      },
      "upload": {
        "original_filename": "john_doe_resume.pdf",
        "file_key": "resumes/john_doe_resume.pdf",
        "created_at": "2025-06-11T18:51:41-07:00"
      }
    },
    // More candidates...
  ],
  "total": 25,
  "limit": 50,
  "offset": 0
}
```

**GET /jobs/{job_id}/candidates/{candidate_id}**

Get detailed information about a specific candidate.

**Response:**
```json
{
  "candidate_id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "skills": ["Python", "React", "TypeScript"],
  "total_years_exp": 5,
  "work_experience": [
    {
      "title": "Senior Developer",
      "company": "Tech Corp",
      "start": "2020-01",
      "end": "2025-06",
      "description": "Led development of...",
      "years": 5.5
    },
    // More work experience...
  ],
  "education": [
    {
      "degree": "Bachelor of Science",
      "institution": "University of Technology",
      "year": "2015",
      "field": "Computer Science"
    },
    // More education...
  ],
  "score": {
    "semantic_score": 0.85,
    "skills_score": 0.75,
    "experience_score": 0.9,
    "education_score": 0.8,
    "composite_score": 0.82,
    "category": "top"
  },
  "upload": {
    "id": "uuid",
    "original_filename": "john_doe_resume.pdf",
    "file_key": "resumes/john_doe_resume.pdf",
    "file_size": 1024000,
    "mime_type": "application/pdf",
    "status": "scored",
    "created_at": "2025-06-11T18:51:41-07:00",
    "updated_at": "2025-06-11T18:51:41-07:00"
  },
  "raw_text": "Full extracted text from the resume..."
}
```

**DELETE /jobs/{job_id}/candidates/{candidate_id}**

Delete a specific candidate.

**Response:**
```json
{
  "candidate_id": "uuid",
  "message": "Candidate deleted successfully"
}
```

## Error Handling

All endpoints return standard HTTP status codes:

- 200: Success
- 400: Bad Request - Invalid input
- 401: Unauthorized - Authentication required
- 403: Forbidden - Insufficient permissions
- 404: Not Found - Resource doesn't exist
- 413: Payload Too Large - File size exceeds limit
- 429: Too Many Requests - Rate limit exceeded
- 500: Internal Server Error - Server-side error

Error responses follow this format:

```json
{
  "error": "Error message",
  "details": "Additional error details" // Optional
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:

- 100 requests per minute per IP address
- 10 file uploads per minute per IP address

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1623460301
```

## Webhook Notifications

The API can send webhook notifications when resume processing is complete. Configure webhook URLs in your account settings.

Webhook payload example:

```json
{
  "event": "resume_processed",
  "upload_id": "uuid",
  "job_id": "uuid",
  "candidate_id": "uuid",
  "status": "scored",
  "score": {
    "composite_score": 0.85,
    "category": "top"
  },
  "timestamp": "2025-06-11T18:51:41-07:00"
}
```
