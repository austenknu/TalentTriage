/**
 * Resumes page for TalentTriage
 * 
 * This page displays a list of all uploaded resumes across all jobs.
 */
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import Layout from '@/components/Layout';
import { supabase } from '@/utils/supabase';

// Status chip component
const StatusChip = ({ status }: { status: string }) => {
  switch (status.toLowerCase()) {
    case 'stored':
      return <Chip size="small" label="Stored" color="info" icon={<PendingIcon />} />;
    case 'parsed':
      return <Chip size="small" label="Parsed" color="primary" icon={<PendingIcon />} />;
    case 'embedded':
      return <Chip size="small" label="Embedded" color="secondary" icon={<PendingIcon />} />;
    case 'scored':
      return <Chip size="small" label="Scored" color="success" icon={<SuccessIcon />} />;
    case 'error':
      return <Chip size="small" label="Error" color="error" icon={<ErrorIcon />} />;
    default:
      return <Chip size="small" label={status} />;
  }
};

// Resume interface
interface Resume {
  id: string;
  job_id: string;
  file_key: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  status: string;
  created_at: string;
  job?: {
    title: string;
  };
}

/**
 * Resumes page component
 */
export default function ResumesPage() {
  // State for resumes data
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Fetch all resumes
  useEffect(() => {
    async function fetchResumes() {
      try {
        setLoading(true);
        
        // Fetch resumes with job information
        const { data, error: resumesError } = await supabase
          .from('uploads')
          .select(`
            id,
            job_id,
            file_key,
            original_filename,
            file_size,
            mime_type,
            status,
            created_at,
            job:job_id (title)
          `)
          .order('created_at', { ascending: false });
        
        if (resumesError) throw resumesError;
        
        setResumes(data || []);
        
      } catch (err) {
        console.error('Error fetching resumes:', err);
        setError('Failed to load resumes data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchResumes();
  }, []);
  
  // Filter resumes based on search term
  const filteredResumes = resumes.filter(resume => {
    const searchLower = searchTerm.toLowerCase();
    
    return (
      (resume.original_filename && resume.original_filename.toLowerCase().includes(searchLower)) ||
      (resume.status && resume.status.toLowerCase().includes(searchLower)) ||
      (resume.job?.title && resume.job.title.toLowerCase().includes(searchLower))
    );
  });
  
  // Handle pagination change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Count resumes by status
  const statusCounts = {
    stored: resumes.filter(r => r.status === 'stored').length,
    parsed: resumes.filter(r => r.status === 'parsed').length,
    embedded: resumes.filter(r => r.status === 'embedded').length,
    scored: resumes.filter(r => r.status === 'scored').length,
    error: resumes.filter(r => r.status === 'error').length
  };
  
  // Get file URL for download
  const getFileUrl = async (fileKey: string) => {
    try {
      const { data } = await supabase.storage
        .from('resumes')
        .createSignedUrl(fileKey, 60); // 60 seconds expiry
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error getting file URL:', error);
      alert('Failed to generate download link');
    }
  };
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Layout title="Resumes | TalentTriage">
      <Box sx={{ width: '100%', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          All Resumes
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          View and manage all uploaded resume files
        </Typography>
        
        {/* Stats cards */}
        <Grid container spacing={3} sx={{ mt: 1, mb: 4 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" color="text.secondary">Total</Typography>
              <Typography variant="h3">{resumes.length}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" color="text.secondary">Stored</Typography>
              <Typography variant="h3" color="info.main">{statusCounts.stored}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" color="text.secondary">Parsed</Typography>
              <Typography variant="h3" color="primary.main">{statusCounts.parsed}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" color="text.secondary">Embedded</Typography>
              <Typography variant="h3" color="secondary.main">{statusCounts.embedded}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" color="text.secondary">Scored</Typography>
              <Typography variant="h3" color="success.main">{statusCounts.scored}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" color="text.secondary">Errors</Typography>
              <Typography variant="h3" color="error.main">{statusCounts.error}</Typography>
            </Paper>
          </Grid>
        </Grid>
        
        {/* Search */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search resumes by filename, status, or job title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        
        {/* Main content */}
        <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
          ) : filteredResumes.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>No resumes found matching your search criteria.</Alert>
          ) : (
            <>
              <TableContainer>
                <Table sx={{ minWidth: 650 }} aria-label="resumes table">
                  <TableHead>
                    <TableRow>
                      <TableCell>Filename</TableCell>
                      <TableCell>Job</TableCell>
                      <TableCell>Size</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Uploaded</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredResumes
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((resume) => (
                        <TableRow key={resume.id}>
                          <TableCell component="th" scope="row">
                            {resume.original_filename}
                          </TableCell>
                          <TableCell>{resume.job?.title || 'Unknown Job'}</TableCell>
                          <TableCell>{formatFileSize(resume.file_size)}</TableCell>
                          <TableCell>
                            <StatusChip status={resume.status} />
                          </TableCell>
                          <TableCell>{formatDate(resume.created_at)}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Download Resume">
                              <IconButton 
                                size="small" 
                                onClick={() => getFileUrl(resume.file_key)}
                                aria-label="download"
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredResumes.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </Paper>
      </Box>
    </Layout>
  );
}
