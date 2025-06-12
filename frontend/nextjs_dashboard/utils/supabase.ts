/**
 * Supabase client utility for TalentTriage dashboard
 * 
 * This module provides a singleton Supabase client instance for use throughout the application.
 */
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with environment variables
// These will be loaded from .env.local in Next.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate that the environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Execute a raw SQL query with vector operations
 * 
 * @param sql - SQL query string with placeholders
 * @param params - Query parameters
 * @returns Query result data
 */
export const executeVectorQuery = async (sql: string, params: any) => {
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      query_text: sql,
      query_params: params
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error executing vector query:', error);
    throw error;
  }
};

/**
 * Get a signed URL for a file in Supabase Storage
 * 
 * @param path - File path in storage
 * @returns Signed URL string
 */
export const getFileUrl = async (path: string): Promise<string> => {
  try {
    const { data, error } = await supabase.storage.from('resumes').createSignedUrl(path, 60 * 60); // 1 hour expiry
    
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    throw error;
  }
};

/**
 * Types for Supabase tables
 */

export interface Job {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  preferred_skills: string[];
  min_years_experience: number;
  preferred_education: string[];
  created_at: string;
  updated_at: string;
}

export interface ParsedResume {
  candidate_id: string;
  job_id: string;
  upload_id: string;
  raw_text: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  work_experience: string; // JSON string
  education: string; // JSON string
  total_years_exp: number;
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

export interface Upload {
  id: string;
  job_id: string;
  file_key: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  status: 'stored' | 'parsed' | 'embedded' | 'scored' | 'error';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface CandidateWithScore extends ParsedResume {
  score: CandidateScore;
  upload: Upload;
}
