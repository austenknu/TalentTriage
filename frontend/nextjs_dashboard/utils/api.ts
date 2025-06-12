/**
 * API utility functions for TalentTriage
 * 
 * This file contains utility functions for making API requests to the backend services.
 */
import axios from 'axios';

// Default API configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Upload multiple resume files to the ingest service
 * 
 * @param files - Array of files to upload
 * @param jobId - ID of the job to associate with the uploads
 * @returns Upload response with IDs and status
 */
export const uploadResumes = async (files: File[], jobId: string) => {
  // Create FormData object
  const formData = new FormData();
  
  // Add job ID
  formData.append('job_id', jobId);
  
  // Add files
  files.forEach(file => {
    formData.append('files', file);
  });
  
  // Make API request
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

/**
 * Check the health status of the ingest service
 * 
 * @returns Health status response
 */
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    return { status: 'error', message: 'API service is unavailable' };
  }
};

/**
 * Get processing status statistics
 * 
 * @returns Processing statistics
 */
export const getProcessingStats = async () => {
  const response = await api.get('/stats/processing');
  return response.data;
};

/**
 * Trigger reprocessing of a specific upload
 * 
 * @param uploadId - ID of the upload to reprocess
 * @returns Reprocessing status
 */
export const reprocessUpload = async (uploadId: string) => {
  const response = await api.post(`/reprocess/${uploadId}`);
  return response.data;
};

export default api;
