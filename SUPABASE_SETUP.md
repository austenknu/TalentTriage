# Supabase Setup Guide for TalentTriage

This guide provides detailed instructions for setting up Supabase for the TalentTriage application, including database configuration, storage setup, and security policies.

## 1. Create a Supabase Account and Project

### 1.1 Sign up for Supabase
1. Visit [https://supabase.com/](https://supabase.com/)
2. Click "Start your project" or "Sign Up"
3. Sign up using GitHub, GitLab, or email

### 1.2 Create a new project
1. Click "New Project" in the dashboard
2. Choose an organization (create one if needed)
3. Enter project details:
   - Name: `TalentTriage`
   - Database password: Create a secure password and store it safely
   - Region: Choose the region closest to your users
4. Click "Create new project"
5. Wait for project creation (typically 1-2 minutes)

## 2. Configure Database Schema

### 2.1 Enable pgvector Extension
1. Navigate to the SQL Editor in the Supabase dashboard
2. Create a new query
3. Paste the following SQL:
```sql
-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS "vector";

-- Comment: This extension allows us to store and query vector embeddings efficiently
-- It adds the vector data type and similarity operators (<->, <#>, etc.)
```
4. Click "Run" to execute

### 2.2 Create Database Schema
1. Create a new query in the SQL Editor
2. Paste the contents of `sql/002_schema.sql`:
```sql
-- Database schema for TalentTriage - AI Resume Screener & Ranker
-- This schema defines the tables needed for the application

-- Job descriptions table
CREATE TABLE job (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    required_skills TEXT[] NOT NULL,
    preferred_skills TEXT[] NOT NULL,
    min_years_experience NUMERIC(4,2),
    preferred_education TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    embedding VECTOR(384) -- Vector embedding of the job description
);

-- File uploads tracking table
CREATE TABLE uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES job(id) ON DELETE CASCADE,
    file_key TEXT NOT NULL, -- Storage path in Supabase
    original_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'stored', -- 'stored', 'parsed', 'embedded', 'scored', 'error'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parsed resume data
CREATE TABLE parsed_resume (
    candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES job(id) ON DELETE CASCADE,
    upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    name TEXT,
    email TEXT,
    phone TEXT,
    skills TEXT[],
    work_experience JSONB, -- Array of work experience objects
    education JSONB, -- Array of education objects
    total_years_exp NUMERIC(4,2),
    embedding VECTOR(384), -- Vector embedding of the resume text
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Candidate scores
CREATE TABLE candidate_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES parsed_resume(candidate_id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES job(id) ON DELETE CASCADE,
    semantic_score NUMERIC(5,4) NOT NULL, -- 0-1 range
    skills_score NUMERIC(5,4) NOT NULL, -- 0-1 range
    experience_score NUMERIC(5,4) NOT NULL, -- 0-1 range
    education_score NUMERIC(5,4) NOT NULL, -- 0-1 range
    composite_score NUMERIC(5,4) NOT NULL, -- Weighted sum
    category TEXT NOT NULL, -- 'top', 'moderate', 'reject'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(candidate_id, job_id)
);

-- Indexes for performance
CREATE INDEX idx_parsed_resume_job_id ON parsed_resume(job_id);
CREATE INDEX idx_candidate_score_job_id ON candidate_score(job_id);
CREATE INDEX idx_candidate_score_category ON candidate_score(category);

-- Function to update timestamp on record updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to maintain updated_at
CREATE TRIGGER update_job_updated_at
BEFORE UPDATE ON job
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_uploads_updated_at
BEFORE UPDATE ON uploads
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_parsed_resume_updated_at
BEFORE UPDATE ON parsed_resume
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_candidate_score_updated_at
BEFORE UPDATE ON candidate_score
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```
3. Click "Run" to execute

### 2.3 Verify Table Creation
1. Navigate to the "Table Editor" in the left sidebar
2. Confirm that the following tables have been created:
   - `job`
   - `uploads`
   - `parsed_resume`
   - `candidate_score`

## 3. Set Up Storage for Resumes

### 3.1 Create Storage Bucket
1. Click "Storage" in the left sidebar
2. Click "Create a new bucket"
3. Enter bucket details:
   - Name: `resumes`
   - Public bucket: Unchecked (for security)
4. Click "Create bucket"

### 3.2 Configure Storage Policies

#### Development Environment Policies
For development purposes, you can use simplified policies:

1. Click on the `resumes` bucket
2. Go to the "Policies" tab
3. Create upload policy:
   - Click "Create Policy"
   - Policy name: `Allow uploads`
   - Policy definition: Select "Custom" and enter: `true`
   - Select operations: `INSERT`
   - Click "Save policy"
4. Create download policy:
   - Click "Create Policy"
   - Policy name: `Allow downloads`
   - Policy definition: Select "Custom" and enter: `true`
   - Select operations: `SELECT`
   - Click "Save policy"

#### Production Environment Policies
For production, implement more restrictive policies:

1. Click on the `resumes` bucket
2. Go to the "Policies" tab
3. Create upload policy:
   - Click "Create Policy"
   - Policy name: `Allow authenticated uploads`
   - Policy definition: Select "Custom" and enter: `auth.role() = 'authenticated'`
   - Select operations: `INSERT`
   - Click "Save policy"
4. Create download policy:
   - Click "Create Policy"
   - Policy name: `Allow authenticated downloads`
   - Policy definition: Select "Custom" and enter: `auth.role() = 'authenticated'`
   - Select operations: `SELECT`
   - Click "Save policy"

## 4. Set Up Row-Level Security (RLS)

### 4.1 Enable RLS on Tables
1. Navigate to "Table Editor" in the left sidebar
2. For each table (`job`, `uploads`, `parsed_resume`, `candidate_score`):
   - Click on the table name
   - Go to "Authentication" tab
   - Toggle "Enable Row Level Security (RLS)"
   - Click "Save"

### 4.2 Create RLS Policies

#### For job Table
1. Click "Create Policy"
2. Policy name: `Allow read access`
3. Policy definition: Select "Custom" and enter: `auth.role() = 'authenticated'`
4. Select operations: `SELECT`
5. Click "Save policy"

6. Click "Create Policy"
7. Policy name: `Allow write access`
8. Policy definition: Select "Custom" and enter: `auth.role() = 'authenticated'`
9. Select operations: `INSERT`, `UPDATE`, `DELETE`
10. Click "Save policy"

Repeat similar policies for the other tables.

## 5. Get API Keys and Connection Information

### 5.1 Retrieve API Keys
1. Click "Project Settings" (gear icon) in the sidebar
2. Click "API" in the settings menu
3. Note the following credentials:
   - Project URL: This is your `SUPABASE_URL`
   - anon/public key: This is your `SUPABASE_ANON_KEY`
   - service_role key: This is your `SUPABASE_SERVICE_KEY` (keep this secure!)

### 5.2 Configure Environment Variables

#### Backend Services
Create a `.env` file in the `services` directory:
```
SUPABASE_URL=your_project_url
SUPABASE_KEY=your_service_role_key
STORAGE_BUCKET=resumes
REDIS_URL=redis://localhost:6379
LOG_LEVEL=INFO
```

#### Frontend Application
Create a `.env.local` file in the `frontend/nextjs_dashboard` directory:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 6. Test the Connection

### 6.1 Run the Connection Test Script
1. Ensure you have installed the required Python packages:
   ```bash
   pip install supabase-py python-dotenv loguru
   ```
2. Run the test script:
   ```bash
   cd services
   python test_supabase_connection.py
   ```
3. Verify that the script connects successfully to the database and storage

## 7. Set Up Authentication (Optional)

### 7.1 Configure Authentication Providers
1. Navigate to "Authentication" in the left sidebar
2. Click "Providers"
3. Enable and configure desired providers:
   - Email (recommended)
   - Google
   - GitHub
   - etc.

### 7.2 Customize Email Templates
1. Navigate to "Authentication" → "Email Templates"
2. Customize the templates for:
   - Confirmation email
   - Invitation email
   - Magic link email
   - Reset password email

## 8. Monitoring and Maintenance

### 8.1 Set Up Database Backups
1. Navigate to "Project Settings" → "Database"
2. Configure backup settings according to your needs

### 8.2 Monitor Usage
1. Navigate to "Project Settings" → "Usage"
2. Monitor database and storage usage to avoid exceeding limits

## 9. Next Steps

After completing the Supabase setup:

1. Run the backend services:
   ```bash
   cd services/ingest_service
   uvicorn main:app --reload --port 8000
   ```

2. Start the worker processes:
   ```bash
   cd services
   python worker_manager.py
   ```

3. Run the frontend application:
   ```bash
   cd frontend/nextjs_dashboard
   npm run dev
   ```

4. Access the application at http://localhost:3000

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   - Verify your Supabase URL and API keys
   - Check if your IP is allowed (Supabase Project Settings → Database → Network)

2. **Storage Access Issues**:
   - Verify storage bucket policies
   - Check file permissions and bucket configuration

3. **Vector Extension Issues**:
   - Confirm pgvector extension is enabled
   - Verify vector dimensions match (384 in our schema)

### Getting Help

If you encounter issues with Supabase:
- Check the [Supabase documentation](https://supabase.com/docs)
- Visit the [Supabase GitHub repository](https://github.com/supabase/supabase)
- Join the [Supabase Discord community](https://discord.supabase.com)
