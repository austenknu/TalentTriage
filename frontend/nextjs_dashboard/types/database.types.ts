/**
 * Database types for TalentTriage
 * 
 * This file contains TypeScript type definitions for the Supabase database schema.
 */

export interface Job {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  min_years_experience: number | null;
  embedding: any | null; // pgvector type
  created_at: string;
  updated_at: string;
}

export interface Upload {
  id: string;
  job_id: string;
  original_filename: string;
  file_key: string;
  file_size: number;
  file_type: string;
  status: 'stored' | 'parsed' | 'embedded' | 'scored' | 'error';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParsedResume {
  candidate_id: string;
  job_id: string;
  upload_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  skills: string[] | null;
  total_years_exp: number | null;
  work_experience: string | null; // JSON string
  education: string | null; // JSON string
  raw_text: string;
  embedding: any | null; // pgvector type
  created_at: string;
  updated_at: string;
}

export interface CandidateScore {
  id: string;
  candidate_id: string;
  job_id: string;
  semantic_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  composite_score: number;
  category: 'top' | 'moderate' | 'reject';
  created_at: string;
  updated_at: string;
}

// Combined type for candidate with score
export interface CandidateWithScore extends ParsedResume {
  score: CandidateScore;
  upload: Upload;
  work_experience?: WorkExperience[];
  education?: Education[];
}

// Types for parsed JSON fields
export interface WorkExperience {
  title?: string;
  company?: string;
  start?: string;
  end?: string;
  description?: string;
  years?: number;
}

export interface Education {
  degree?: string;
  institution?: string;
  year?: string;
  field?: string;
}

// Database schema
export interface Database {
  public: {
    Tables: {
      job: {
        Row: Job;
        Insert: Omit<Job, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Job, 'id' | 'created_at' | 'updated_at'>>;
      };
      uploads: {
        Row: Upload;
        Insert: Omit<Upload, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Upload, 'id' | 'created_at' | 'updated_at'>>;
      };
      parsed_resume: {
        Row: ParsedResume;
        Insert: Omit<ParsedResume, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ParsedResume, 'created_at' | 'updated_at'>>;
      };
      candidate_score: {
        Row: CandidateScore;
        Insert: Omit<CandidateScore, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CandidateScore, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
