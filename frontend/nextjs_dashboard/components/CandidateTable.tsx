/**
 * CandidateTable component for TalentTriage
 * 
 * This component displays a table of candidates with their scores and provides
 * sorting, filtering, and pagination functionality.
 */
import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Chip,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnDef
} from '@tanstack/react-table';
import Link from 'next/link';
import { CandidateWithScore } from '@/utils/supabase';

// Define props interface for the CandidateTable component
interface CandidateTableProps {
  candidates: CandidateWithScore[];
  jobId: string;
}

// Helper function to get category color
const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'top':
      return 'success';
    case 'moderate':
      return 'warning';
    case 'reject':
      return 'error';
    default:
      return 'default';
  }
};

// Helper function to format score as percentage
const formatScore = (score: number) => {
  return `${(score * 100).toFixed(1)}%`;
};

/**
 * CandidateTable component for displaying and interacting with candidate data
 * 
 * @param candidates - Array of candidates with scores
 * @param jobId - ID of the current job
 */
const CandidateTable: React.FC<CandidateTableProps> = ({ candidates, jobId }) => {
  // State for table sorting
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'composite_score', desc: true }
  ]);
  
  // State for global filtering
  const [globalFilter, setGlobalFilter] = useState('');
  
  // Column helper for type safety
  const columnHelper = createColumnHelper<CandidateWithScore>();
  
  // Define table columns
  const columns = useMemo<ColumnDef<CandidateWithScore, any>[]>(
    () => [
      columnHelper.accessor('name', {
        header: 'Candidate',
        cell: info => (
          <Box sx={{ fontWeight: 'medium' }}>
            {info.getValue() || 'Unnamed Candidate'}
          </Box>
        ),
      }),
      columnHelper.accessor('email', {
        header: 'Contact',
        cell: info => {
          const email = info.getValue();
          return email ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="Send Email">
                <IconButton 
                  size="small" 
                  href={`mailto:${email}`} 
                  sx={{ mr: 1 }}
                >
                  <EmailIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                {email}
              </Typography>
            </Box>
          ) : 'N/A';
        },
      }),
      columnHelper.accessor('skills', {
        header: 'Skills',
        cell: info => {
          const skills = info.getValue();
          if (!skills || !skills.length) return 'N/A';
          
          // Show first 3 skills and a count for the rest
          return (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {skills.slice(0, 3).map((skill, i) => (
                <Chip 
                  key={i} 
                  label={skill} 
                  size="small" 
                  variant="outlined" 
                />
              ))}
              {skills.length > 3 && (
                <Chip 
                  label={`+${skills.length - 3}`} 
                  size="small" 
                  variant="outlined" 
                  color="primary"
                />
              )}
            </Box>
          );
        },
      }),
      columnHelper.accessor('total_years_exp', {
        header: 'Experience',
        cell: info => `${info.getValue()} years`,
      }),
      columnHelper.accessor('score.semantic_score', {
        header: 'Semantic',
        cell: info => formatScore(info.getValue()),
      }),
      columnHelper.accessor('score.skills_score', {
        header: 'Skills Match',
        cell: info => formatScore(info.getValue()),
      }),
      columnHelper.accessor('score.composite_score', {
        header: 'Overall',
        cell: info => formatScore(info.getValue()),
      }),
      columnHelper.accessor('score.category', {
        header: 'Category',
        cell: info => (
          <Chip 
            label={info.getValue()} 
            color={getCategoryColor(info.getValue()) as any}
            size="small"
          />
        ),
      }),
      columnHelper.accessor('candidate_id', {
        header: 'Actions',
        cell: info => (
          <Link href={`/job/${jobId}/candidate/${info.getValue()}`} passHref>
            <IconButton size="small">
              <ViewIcon fontSize="small" />
            </IconButton>
          </Link>
        ),
      }),
    ],
    [jobId, columnHelper]
  );
  
  // Create table instance
  const table = useReactTable({
    data: candidates,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });
  
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Search and filter controls */}
      <Box sx={{ p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search candidates..."
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      {/* Table */}
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader>
          <TableHead>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableCell 
                    key={header.id}
                    sx={{ 
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      header.column.getCanSort() ? (
                        <TableSortLabel
                          active={header.column.getIsSorted() !== false}
                          direction={header.column.getIsSorted() === 'desc' ? 'desc' : 'asc'}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </TableSortLabel>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <TableRow 
                  key={row.id}
                  hover
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    // Highlight top candidates
                    ...(row.original.score.category === 'top' && {
                      backgroundColor: theme => theme.palette.success.light + '20'
                    })
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 3 }}>
                  No candidates found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={table.getFilteredRowModel().rows.length}
        rowsPerPage={table.getState().pagination.pageSize}
        page={table.getState().pagination.pageIndex}
        onPageChange={(_, page) => table.setPageIndex(page)}
        onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
      />
    </Paper>
  );
};

export default CandidateTable;
