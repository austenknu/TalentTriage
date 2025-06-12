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

-- Comment: This schema defines the core data model for the TalentTriage application
-- It includes tables for job descriptions, file uploads, parsed resumes, and candidate scores
-- The parsed_resume table includes a vector embedding column for semantic similarity search
-- The candidate_score table stores the multi-factor scoring results and categorization
