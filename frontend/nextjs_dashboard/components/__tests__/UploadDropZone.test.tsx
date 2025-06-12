/**
 * Tests for UploadDropZone component
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UploadDropZone from '../UploadDropZone';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock API functions
jest.mock('../../utils/api', () => ({
  uploadResumes: jest.fn().mockResolvedValue({ 
    upload_ids: ['mock-upload-id-1', 'mock-upload-id-2'],
    message: 'Files uploaded successfully'
  })
}));

// Import the mocked function
import { uploadResumes } from '../../utils/api';

// Create a theme for testing
const theme = createTheme();

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

// Mock file data
const createMockFile = (name: string, type: string) => {
  const file = new File(['mock file content'], name, { type });
  return file;
};

describe('UploadDropZone Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the upload dropzone with instructions', () => {
    render(
      <TestWrapper>
        <UploadDropZone jobId="mock-job-id" onUploadComplete={jest.fn()} />
      </TestWrapper>
    );

    // Check if instructions are displayed
    expect(screen.getByText(/Drag and drop resume files here/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
    
    // Check if supported formats are mentioned
    expect(screen.getByText(/Supported formats: PDF, DOCX/i)).toBeInTheDocument();
  });

  it('handles file upload when files are dropped', async () => {
    const mockOnUploadComplete = jest.fn();
    
    render(
      <TestWrapper>
        <UploadDropZone jobId="mock-job-id" onUploadComplete={mockOnUploadComplete} />
      </TestWrapper>
    );

    // Create mock files
    const mockFiles = [
      createMockFile('resume1.pdf', 'application/pdf'),
      createMockFile('resume2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ];

    // Get the dropzone element
    const dropzone = screen.getByText(/Drag and drop resume files here/i).closest('div');
    expect(dropzone).not.toBeNull();

    // Simulate file drop
    if (dropzone) {
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: mockFiles,
          types: ['Files']
        }
      });
    }

    // Wait for upload to complete
    await waitFor(() => {
      expect(uploadResumes).toHaveBeenCalledWith(mockFiles, 'mock-job-id');
      expect(mockOnUploadComplete).toHaveBeenCalledWith(['mock-upload-id-1', 'mock-upload-id-2']);
    });
  });

  it('handles file upload when files are selected via file input', async () => {
    const mockOnUploadComplete = jest.fn();
    
    render(
      <TestWrapper>
        <UploadDropZone jobId="mock-job-id" onUploadComplete={mockOnUploadComplete} />
      </TestWrapper>
    );

    // Create mock files
    const mockFiles = [
      createMockFile('resume1.pdf', 'application/pdf'),
      createMockFile('resume2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ];

    // Get the file input element
    const fileInput = screen.getByLabelText(/Upload resumes/i);
    expect(fileInput).not.toBeNull();

    // Simulate file selection
    fireEvent.change(fileInput, {
      target: { files: mockFiles }
    });

    // Wait for upload to complete
    await waitFor(() => {
      expect(uploadResumes).toHaveBeenCalledWith(mockFiles, 'mock-job-id');
      expect(mockOnUploadComplete).toHaveBeenCalledWith(['mock-upload-id-1', 'mock-upload-id-2']);
    });
  });

  it('displays loading state during upload', async () => {
    // Make the API call take longer to resolve
    (uploadResumes as jest.Mock).mockImplementationOnce(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ 
            upload_ids: ['mock-upload-id-1'],
            message: 'Files uploaded successfully'
          });
        }, 100);
      });
    });

    render(
      <TestWrapper>
        <UploadDropZone jobId="mock-job-id" onUploadComplete={jest.fn()} />
      </TestWrapper>
    );

    // Create mock file
    const mockFile = createMockFile('resume.pdf', 'application/pdf');

    // Get the file input element
    const fileInput = screen.getByLabelText(/Upload resumes/i);

    // Simulate file selection
    fireEvent.change(fileInput, {
      target: { files: [mockFile] }
    });

    // Check if loading state is displayed
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/Uploading.../i)).toBeInTheDocument();

    // Wait for upload to complete
    await waitFor(() => {
      expect(uploadResumes).toHaveBeenCalled();
    });
  });

  it('displays error message when upload fails', async () => {
    // Mock API to reject
    (uploadResumes as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'));

    render(
      <TestWrapper>
        <UploadDropZone jobId="mock-job-id" onUploadComplete={jest.fn()} />
      </TestWrapper>
    );

    // Create mock file
    const mockFile = createMockFile('resume.pdf', 'application/pdf');

    // Get the file input element
    const fileInput = screen.getByLabelText(/Upload resumes/i);

    // Simulate file selection
    fireEvent.change(fileInput, {
      target: { files: [mockFile] }
    });

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText(/Error uploading files/i)).toBeInTheDocument();
    });
  });

  it('validates file types and rejects unsupported files', async () => {
    render(
      <TestWrapper>
        <UploadDropZone jobId="mock-job-id" onUploadComplete={jest.fn()} />
      </TestWrapper>
    );

    // Create mock file with unsupported type
    const mockFile = createMockFile('document.txt', 'text/plain');

    // Get the file input element
    const fileInput = screen.getByLabelText(/Upload resumes/i);

    // Simulate file selection
    fireEvent.change(fileInput, {
      target: { files: [mockFile] }
    });

    // Check if error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Unsupported file type/i)).toBeInTheDocument();
    });

    // Verify that upload was not attempted
    expect(uploadResumes).not.toHaveBeenCalled();
  });
});
