// File: frontend/src/pages/lanerates/LaneRatePage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, TextField, InputAdornment,
  Link as MuiLink, Button, Chip,
  Select, MenuItem, FormControl, InputLabel, Grid, TablePagination
} from '@mui/material';
import { Search as SearchIcon, FilterList as FilterListIcon, AddCircleOutline as AddManualRateIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { laneRateAPI } from '../../services/api';
import { modeOfTransportOptions } from '../shipments/constants/shipmentOptions';
import { format } from 'date-fns';
import ManualLaneRateFormDialog, { ManualLaneRateFormData, initialManualLaneRateFormData } from './components/ManualLaneRateFormDialog'; // Import new dialog
import { toast } from 'react-toastify';

interface LaneSummary {
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  minLineHaulCost?: number | null;
  maxLineHaulCost?: number | null;
  avgLineHaulCost?: number | null;
  avgFscPercentage?: number | null;
  minChassisCostCarrier?: number | null;
  maxChassisCostCarrier?: number | null;
  avgChassisCostCarrier?: number | null;
  entryCount: number;
  lastQuotedDate?: string;
}

const LaneRatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    modeOfTransport: '',
    // equipmentType: '', // Removed specific equipment filter for global search
  });
  const [searchTermInput, setSearchTermInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTermInput);
      setPage(0);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTermInput]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [isManualFormOpen, setIsManualFormOpen] = useState(false);

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const target = event.target as HTMLInputElement;
    const name = target.name as keyof typeof filters;
    setFilters(prev => ({ ...prev, [name]: target.value as string }));
    setPage(0);
  };

  const activeFilters: Record<string, string> = {};
  if (filters.modeOfTransport) activeFilters.modeOfTransport = filters.modeOfTransport;
  if (debouncedSearchTerm) activeFilters.searchTerm = debouncedSearchTerm;

  const {
    data: summaryResponse,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery<LaneSummary[]>(
    ['laneRateSummary', activeFilters],
    async () => {
      const response = await laneRateAPI.getLaneRateSummary(activeFilters);
      return response.data.data;
    },
    { keepPreviousData: true }
  );

  const laneSummaries: LaneSummary[] = summaryResponse || [];
  const paginatedSummaries = laneSummaries.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const createManualLaneRateMutation = useMutation(
    (formData: ManualLaneRateFormData) => laneRateAPI.createManual(formData), // Assuming a createManual method in laneRateAPI
    {
      onSuccess: (response) => {
        toast.success(response.data.message || 'Manual lane rate added successfully!');
        queryClient.invalidateQueries('laneRateSummary'); // Refresh summary
        // Optionally, invalidate detail queries if they might be affected, or the specific carrier's rates
        // queryClient.invalidateQueries(['laneRateDetail', { originCity: response.data.data.originCity, ... }]);
        // queryClient.invalidateQueries(['laneRatesByCarrier', response.data.data.carrier]);
        setIsManualFormOpen(false);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to add manual lane rate.');
      },
    }
  );

  const handleViewLaneDetails = (lane: LaneSummary) => {
    const params = new URLSearchParams({
      originCity: lane.originCity,
      originState: lane.originState,
      destinationCity: lane.destinationCity,
      destinationState: lane.destinationState,
    });
    if (filters.modeOfTransport) params.append('modeOfTransport', filters.modeOfTransport);
    navigate(`/lanerates/detail?${params.toString()}`);
  };
  
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenManualForm = () => {
    setIsManualFormOpen(true);
  };

  const handleSaveManualLaneRate = (formData: ManualLaneRateFormData) => {
    // Assuming createdBy will be handled by backend if not sent, or add it here if available from auth context
    // const userContext = useAuth(); // Example if you have an auth context
    // const payload = { ...formData, createdBy: userContext?.user?._id };
    createManualLaneRateMutation.mutate(formData);
  };


  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" gutterBottom>Lane Rate Overview</Typography>
        <Button
          variant="contained"
          startIcon={<AddManualRateIcon />}
          onClick={handleOpenManualForm} // Correct handler
        >
          Add Manual Rate
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3, mt: 2 }} elevation={2}>
        <Typography variant="h6" gutterBottom sx={{display: 'flex', alignItems: 'center'}}>
            <FilterListIcon sx={{mr: 1}}/> Filters & Search
        </Typography>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Search Lanes (Origin, Dest, Mode, Equip, etc.)"
              value={searchTermInput}
              onChange={(e) => setSearchTermInput(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth select size="small" label="Mode of Transport"
              name="modeOfTransport" value={filters.modeOfTransport} onChange={handleFilterChange} variant="outlined"
            >
              <MenuItem value=""><em>All Modes</em></MenuItem>
              {modeOfTransportOptions.map(mode => (
                <MenuItem key={mode} value={mode} sx={{ textTransform: 'capitalize' }}>
                  {mode.replace(/-/g, ' ')}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {(isLoading || isFetching) && !summaryResponse && <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error fetching lane rate summary: {(error as any)?.response?.data?.message || (error as any)?.message || 'Unknown error'}</Alert>}
      
      {!isLoading && !isError && (
        <Paper sx={{ width: '100%', overflow: 'hidden' }} elevation={2}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
            <Table stickyHeader size="small" aria-label="lane rate summary table">
              <TableHead>
                <TableRow>
                  <TableCell>Origin</TableCell>
                  <TableCell>Destination</TableCell>
                  <TableCell align="center">Entries</TableCell>
                  <TableCell>Line Haul Cost Range (Avg)</TableCell>
                  <TableCell align="center">Avg. FSC%</TableCell>
                  <TableCell>Chassis Cost Range (Carrier)</TableCell>
                  <TableCell>Last Quoted</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedSummaries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">No lane rate data found for the selected filters.</TableCell>
                  </TableRow>
                )}
                {paginatedSummaries.map((lane, index) => (
                  <TableRow hover key={`${lane.originCity}-${lane.destinationCity}-${lane.originState}-${lane.destinationState}-${index}-${filters.modeOfTransport}-${searchTermInput}`}>
                    <TableCell>{lane.originCity}, {lane.originState}</TableCell>
                    <TableCell>{lane.destinationCity}, {lane.destinationState}</TableCell>
                    <TableCell align="center">{lane.entryCount}</TableCell>
                    <TableCell>
                      {(lane.minLineHaulCost !== null && lane.maxLineHaulCost !== null) ?
                       `$${lane.minLineHaulCost?.toFixed(2)} - $${lane.maxLineHaulCost?.toFixed(2)}` : 'N/A'}
                       <br/>
                       {lane.avgLineHaulCost !== null && <Chip label={`Avg: $${lane.avgLineHaulCost?.toFixed(2)}`} size="small" variant="outlined" sx={{mt:0.5, fontSize: '0.75rem'}}/>}
                    </TableCell>
                    <TableCell align="center">{lane.avgFscPercentage !== null ? `${lane.avgFscPercentage?.toFixed(1)}%` : 'N/A'}</TableCell>
                    <TableCell>
                      {(lane.minChassisCostCarrier !== null && lane.maxChassisCostCarrier !== null) ?
                       `$${lane.minChassisCostCarrier?.toFixed(2)} - $${lane.maxChassisCostCarrier?.toFixed(2)}` : 
                       (lane.avgChassisCostCarrier !== null && lane.avgChassisCostCarrier !== undefined ? `Avg: $${lane.avgChassisCostCarrier.toFixed(2)}` : 'N/A')
                      }
                    </TableCell>
                    <TableCell>{lane.lastQuotedDate ? format(new Date(lane.lastQuotedDate), 'MM/dd/yyyy') : 'N/A'}</TableCell>
                    <TableCell align="center">
                      <Button size="small" variant="outlined" onClick={() => handleViewLaneDetails(lane)}>
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {laneSummaries.length > 0 && (
             <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={laneSummaries.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
          )}
        </Paper>
      )}

      {isManualFormOpen && (
        <ManualLaneRateFormDialog
          open={isManualFormOpen}
          onClose={() => setIsManualFormOpen(false)}
          onSubmit={handleSaveManualLaneRate}
          isLoading={createManualLaneRateMutation.isLoading}
        />
      )}
    </Box>
  );
};

export default LaneRatePage;