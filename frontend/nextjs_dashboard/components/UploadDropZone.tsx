/**
 * UploadDropZone component for TalentTriage
 * 
 * This component provides a drag-and-drop interface for uploading resume files.
 * It supports multiple file uploads and shows progress/status for each file.
 */
import React, { useState, useRef, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { supabase } from '@/utils/supabase';

// Define props interface for the UploadDropZone component
interface UploadDropZoneProps {
  jobId: string;
  onUploadComplete?: (count: number) => void;
}

// File status type
type FileStatus = 'pending' | 'uploading' | 'success' | 'error';

// File with upload status
interface FileWithStatus {
  file: File;
  status: FileStatus;
  message?: string;
}

/**
 * UploadDropZone component for uploading resume files
 * 
 * @param jobId - ID of the job to associate uploads with
 * @param onUploadComplete - Callback function called when uploads are complete
 */
const UploadDropZone: React.FC<UploadDropZoneProps> = ({ jobId, onUploadComplete }) => {
  // State for drag-and-drop functionality
  const [isDragging, setIsDragging] = useState(false);
  
  // State for selected files and their upload status
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  
  // State for overall upload status
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // File input ref for the button click to open file dialog
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  // Process files when dropped or selected
  const processFiles = useCallback((fileList: FileList) => {
    // Convert FileList to array and add status
    const newFiles = Array.from(fileList).map(file => ({
      file,
      status: 'pending' as FileStatus
    }));
    
    // Add to existing files
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
    
    // Reset states
    setUploadError(null);
    setUploadSuccess(false);
  }, []);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      
      // Reset the input value so the same file can be selected again
      e.target.value = '';
    }
  }, [processFiles]);

  // Handle click on the dropzone to open file dialog
  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Remove a file from the list
  const handleRemoveFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  // Upload files to the server
  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('job_id', jobId);
      
      // Update file statuses to uploading
      setFiles(prevFiles => 
        prevFiles.map(f => ({ ...f, status: 'uploading' }))
      );
      
      // Add all files to FormData
      files.forEach(fileObj => {
        formData.append('files', fileObj.file);
      });
      
      // Get the API URL from environment or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Send the upload request
      const response = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }
      
      const result = await response.json();
      
      // Update file statuses to success
      setFiles(prevFiles => 
        prevFiles.map(f => ({ ...f, status: 'success' }))
      );
      
      setUploadSuccess(true);
      
      // Call the onUploadComplete callback if provided
      if (onUploadComplete) {
        onUploadComplete(result.uploaded);
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Update file statuses to error
      setFiles(prevFiles => 
        prevFiles.map(f => ({ ...f, status: 'error', message: (error as Error).message }))
      );
      
      setUploadError((error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        multiple
        accept=".pdf,.doc,.docx"
        onChange={handleFileInputChange}
      />
      
      {/* Drag and drop area */}
      <Paper
        sx={{
          border: '2px dashed',
          borderColor: isDragging ? 'primary.main' : 'grey.400',
          borderRadius: 2,
          backgroundColor: isDragging ? 'rgba(25, 118, 210, 0.04)' : 'background.paper',
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Drag & Drop Resumes Here
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Or click to select files
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Supported formats: PDF, DOC, DOCX
        </Typography>
      </Paper>
      
      {/* File list */}
      {files.length > 0 && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Selected Files ({files.length})
          </Typography>
          <List dense>
            {files.map((fileObj, index) => (
              <ListItem
                key={`${fileObj.file.name}-${index}`}
                secondaryAction={
                  fileObj.status === 'pending' ? (
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(index);
                      }}
                    >
                      Remove
                    </Button>
                  ) : (
                    <Chip
                      label={fileObj.status}
                      color={
                        fileObj.status === 'success' ? 'success' :
                        fileObj.status === 'error' ? 'error' :
                        'default'
                      }
                      size="small"
                    />
                  )
                }
              >
                <ListItemIcon>
                  {fileObj.status === 'uploading' ? (
                    <CircularProgress size={24} />
                  ) : fileObj.status === 'success' ? (
                    <SuccessIcon color="success" />
                  ) : fileObj.status === 'error' ? (
                    <ErrorIcon color="error" />
                  ) : (
                    <FileIcon />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={fileObj.file.name}
                  secondary={`${(fileObj.file.size / 1024).toFixed(2)} KB`}
                />
              </ListItem>
            ))}
          </List>
          
          {/* Upload button */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpload}
              disabled={isUploading || files.length === 0 || files.every(f => f.status === 'success')}
              startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
            >
              {isUploading ? 'Uploading...' : 'Upload Files'}
            </Button>
          </Box>
        </Paper>
      )}
      
      {/* Success/Error messages */}
      {uploadSuccess && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Files uploaded successfully!
        </Alert>
      )}
      
      {uploadError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {uploadError}
        </Alert>
      )}
    </Box>
  );
};

export default UploadDropZone;
