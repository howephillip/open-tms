// File: frontend/src/pages/lanerates/LaneRateDetailPage.tsx
import React, { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, IconButton, Tooltip, Chip, Link as MuiLink,
  TablePagination, Button, List, ListItem, ListItemText
} from '@mui/material';
import { DeleteOutline as DeleteIcon, ArrowBack as BackIcon, Edit as EditIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import { laneRateAPI } from '../../services/api';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';
import ManualLaneRateFormDialog, { ManualLaneRateFormData, initialManualLaneRateFormData } from './components/ManualLaneRateFormDialog';
import { format } from 'date-fns';

interface CarrierStub { _id: string; name?: string; mcNumber?: string; }
interface UserStub { _id: string; firstName?: string; lastName?: string; email?: string; }
interface SourceShipmentStub { _id: string; shipmentNumber?: string; status?: string; }

interface DisplayAccessorial {
  name: string;
  cost: number;
  notes?: string;
}

interface LaneRateDetailEntry {
  _id: string;
  carrier: CarrierStub | null; // Allow carrier to be null
  lineHaulRate?: number;
  lineHaulCost?: number;
  fscPercentage?: number;
  chassisCostCustomer?: number;
  chassisCostCarrier?: number;
  displayAccessorials?: DisplayAccessorial[];
  manualAccessorials?: { _id?: string; name: string; cost: number; notes?: string; }[];
  sourceType: 'TMS_SHIPMENT' | 'MANUAL_ENTRY' | 'RATE_IMPORT';
  sourceShipmentId?: SourceShipmentStub;
  sourceQuoteShipmentNumber?: string;
  rateDate: string;
  rateValidUntil?: string;
  modeOfTransport: string;
  equipmentType?: string;
  notes?: string;
  createdBy: UserStub;
  originCity: string;
  originState: string;
  originZip?: string;
  destinationCity: string;
  destinationState: string;
  destinationZip?: string;
  isActive: boolean;
}

const AccessorialsDisplay: React.FC<{ accessorials?: DisplayAccessorial[] }> = ({ accessorials }) => {
  if (!accessorials || accessorials.length === 0) {
    return <Typography variant="caption" color="textSecondary">-</Typography>;
  }
  return (
    <Box>
      {accessorials.map((acc, index) => (
        <Box key={index} sx={{ mb: accessorials.length > 1 && index < accessorials.length -1 ? 0.5 : 0 }}>
          <Typography variant="caption" component="div" sx={{ lineHeight: 1.2 }}>
            {acc.name}: ${acc.cost.toFixed(2)}
          </Typography>
          {acc.notes && (
            <Typography variant="caption" color="textSecondary" component="div" sx={{ lineHeight: 1.2, fontSize: '0.7rem', pl: 1 }}>
              <em>↳ {acc.notes}</em>
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
};

const LaneRateDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const queryParams = new URLSearchParams(location.search);
  const originCity = queryParams.get('originCity');
  const originState = queryParams.get('originState');
  const destinationCity = queryParams.get('destinationCity');
  const destinationState = queryParams.get('destinationState');
  const originZipParam = queryParams.get('originZip');
  const destinationZipParam = queryParams.get('destinationZip');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<LaneRateDetailEntry | null>(null);

  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [editingManualRateData, setEditingManualRateData] = useState<ManualLaneRateFormData | null>(null);

  const queryKeyParams = { originCity, originState, destinationCity, destinationState, originZipParam, destinationZipParam };

  const {
    data: detailResponse,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery<{ laneRates: LaneRateDetailEntry[], pagination: { total: number, page: number, limit: number, pages: number } }>(
    ['laneRateDetail', queryKeyParams, page, rowsPerPage],
    async () => {
      const params: any = {
        originCity, originState, destinationCity, destinationState,
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      };
      if (originZipParam) params.originZip = originZipParam;
      if (destinationZipParam) params.destinationZip = destinationZipParam;
      const response = await laneRateAPI.getLaneRateDetail(params);
      return response.data.data;
    },
    { keepPreviousData: true, enabled: !!(originCity && originState && destinationCity && destinationState) }
  );

  const laneRateDetails: LaneRateDetailEntry[] = detailResponse?.laneRates || [];
  const paginationData = detailResponse?.pagination;

  const manualRateMutation = useMutation(
    (data: { id?: string; formData: ManualLaneRateFormData }) =>
      data.id ? laneRateAPI.updateManual(data.id, data.formData) : laneRateAPI.createManual(data.formData),
    {
      onSuccess: (response, variables) => {
        toast.success(`Manual lane rate ${variables.id ? 'updated' : 'added'} successfully!`);
        queryClient.invalidateQueries(['laneRateDetail', queryKeyParams, page, rowsPerPage]);
        queryClient.invalidateQueries('laneRateSummary');
        setIsManualFormOpen(false);
        setEditingManualRateData(null);
      },
      onError: (error: any, variables) => {
        toast.error(error.response?.data?.message || `Failed to ${variables.id ? 'update' : 'add'} manual lane rate.`);
        console.error("Manual Lane Rate Mutation error:", error.response?.data || error.message, error); // Log the full error
        setIsManualFormOpen(false);
        setEditingManualRateData(null); 
      },
    }
  );

  const deleteMutation = useMutation(
    (laneRateId: string) => laneRateAPI.deleteLaneRate(laneRateId),
    {
      onSuccess: () => {
        toast.success('Lane rate entry deleted successfully!');
        queryClient.invalidateQueries(['laneRateDetail', queryKeyParams, page, rowsPerPage]);
        queryClient.invalidateQueries('laneRateSummary');
        setIsConfirmDeleteDialogOpen(false);
        setItemToDelete(null);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to delete lane rate entry.');
        setIsConfirmDeleteDialogOpen(false);
        setItemToDelete(null);
      }
    }
  );

  const handleDeleteClick = (rateEntry: LaneRateDetailEntry) => {
    setItemToDelete(rateEntry);
    setIsConfirmDeleteDialogOpen(true);
  };
  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete._id);
    }
  };
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenManualForm = (rateToEdit?: LaneRateDetailEntry) => {
    if (rateToEdit) {
        const formDataToEdit: ManualLaneRateFormData = {
            _id: rateToEdit._id,
            originCity: rateToEdit.originCity,
            originState: rateToEdit.originState,
            originZip: rateToEdit.originZip || '',
            destinationCity: rateToEdit.destinationCity,
            destinationState: rateToEdit.destinationState,
            destinationZip: rateToEdit.destinationZip || '',
            carrier: rateToEdit.carrier?._id || '', // Safely access _id, fallback to empty string
            lineHaulCost: rateToEdit.lineHaulCost?.toString() || '0',
            fscPercentage: rateToEdit.fscPercentage?.toString() || '',
            chassisCostCarrier: rateToEdit.chassisCostCarrier?.toString() || '',
            manualAccessorials: (rateToEdit.displayAccessorials || rateToEdit.manualAccessorials || []).map(acc => ({
                _id: (acc as any)._id || undefined, // Ensure existing _id is preserved if present
                name: acc.name,
                cost: acc.cost.toString(),
                notes: acc.notes || ''
            })),
            rateDate: format(new Date(rateToEdit.rateDate), 'yyyy-MM-dd'),
            rateValidUntil: rateToEdit.rateValidUntil ? format(new Date(rateToEdit.rateValidUntil), 'yyyy-MM-dd') : '',
            modeOfTransport: rateToEdit.modeOfTransport,
            equipmentType: rateToEdit.equipmentType || '',
            notes: rateToEdit.notes || '',
        };
        setEditingManualRateData(formDataToEdit);
    } else {
        // For new entries, prefill with query params if available
        setEditingManualRateData({
            ...initialManualLaneRateFormData, // Start with default empty values
            originCity: originCity || initialManualLaneRateFormData.originCity,
            originState: originState || initialManualLaneRateFormData.originState,
            originZip: originZipParam || initialManualLaneRateFormData.originZip,
            destinationCity: destinationCity || initialManualLaneRateFormData.destinationCity,
            destinationState: destinationState || initialManualLaneRateFormData.destinationState,
            destinationZip: destinationZipParam || initialManualLaneRateFormData.destinationZip,
            // carrier: '', // Ensure carrier is an empty string for new if it's a controlled component
        });
    }
    setIsManualFormOpen(true);
  };

  const handleSaveManualLaneRate = (formData: ManualLaneRateFormData) => {
    manualRateMutation.mutate({ id: editingManualRateData?._id, formData });
  };

  const pageTitle = `Lane Rates: ${originCity || 'N/A'}, ${originState || 'N/A'} → ${destinationCity || 'N/A'}, ${destinationState || 'N/A'}`;

  if (!originCity || !originState || !destinationCity || !destinationState) {
    return (
        <Box sx={{p:3}}>
            <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
                Back to Summary
            </Button>
            <Alert severity="warning">Missing lane parameters (Origin/Destination City & State) to display details.</Alert>
        </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Button startIcon={<BackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Back to Lane Rate Overview
      </Button>
      <Typography variant="h4" gutterBottom>{pageTitle}</Typography>
      {(originZipParam || destinationZipParam) && (
        <Typography variant="subtitle1" color="textSecondary" gutterBottom>
          Filtering by Zip - Origin: {originZipParam || 'Any'} → Destination: {destinationZipParam || 'Any'}
        </Typography>
      )}
       <Button
        variant="contained"
        onClick={() => handleOpenManualForm()} // Call without args for new entry
        sx={{ mb: 2, float: 'right' }}
        startIcon={<EditIcon />}
      >
        Add Manual Rate
      </Button>


      {(isLoading || isFetching) && !detailResponse && <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Error fetching lane details: {(error as any)?.response?.data?.message || (error as any)?.message || 'Unknown error'}</Alert>}

      {!isLoading && !isError && (
        <Paper sx={{ width: '100%', overflow: 'hidden' }} elevation={2}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)' }}>
            <Table stickyHeader size="small" aria-label="lane rate detail table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{minWidth: 150}}>Carrier</TableCell>
                  <TableCell sx={{minWidth: 100}}>Date</TableCell>
                  <TableCell sx={{minWidth: 90}}>Orig Zip</TableCell>
                  <TableCell sx={{minWidth: 90}}>Dest Zip</TableCell>
                  <TableCell sx={{minWidth: 120}}>Mode</TableCell>
                  <TableCell sx={{minWidth: 120}}>Equipment</TableCell>
                  <TableCell align="right" sx={{minWidth: 100}}>Line Haul (Cost)</TableCell>
                  <TableCell align="center" sx={{minWidth: 80}}>FSC%</TableCell>
                  <TableCell align="right" sx={{minWidth: 100}}>Chassis (Cost)</TableCell>
                  <TableCell sx={{minWidth: 200}}>Accessorials (Carrier Cost)</TableCell>
                  <TableCell sx={{minWidth: 120}}>Source</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {laneRateDetails.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={12} align="center">No rate entries found for this specific lane and filters.</TableCell></TableRow>
                )}
                {laneRateDetails.map((rate) => (
                  <TableRow hover key={rate._id}>
                    <TableCell>
                        {rate.carrier?.name || 'N/A'}
                        {rate.carrier?.mcNumber && <Typography variant="caption" display="block">MC: {rate.carrier.mcNumber}</Typography>}
                    </TableCell>
                    <TableCell>{format(new Date(rate.rateDate), 'MM/dd/yyyy')}</TableCell>
                    <TableCell>{rate.originZip || '-'}</TableCell>
                    <TableCell>{rate.destinationZip || '-'}</TableCell>
                    <TableCell sx={{textTransform: 'capitalize'}}>{rate.modeOfTransport.replace(/-/g, ' ')}</TableCell>
                    <TableCell>{rate.equipmentType || '-'}</TableCell>
                    <TableCell align="right">${rate.lineHaulCost?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell align="center">{rate.fscPercentage !== undefined ? `${rate.fscPercentage.toFixed(1)}%` : '-'}</TableCell>
                    <TableCell align="right">{rate.chassisCostCarrier !== undefined ? `$${rate.chassisCostCarrier.toFixed(2)}` : '-'}</TableCell>
                    <TableCell>
                        <AccessorialsDisplay accessorials={rate.displayAccessorials} />
                    </TableCell>
                    <TableCell>
                      {rate.sourceShipmentId?._id && rate.sourceType === 'TMS_SHIPMENT' ? (
                        <MuiLink component={RouterLink} to={`/shipments/${rate.sourceShipmentId._id}`}>
                            {rate.sourceQuoteShipmentNumber || rate.sourceShipmentId.shipmentNumber}
                        </MuiLink>
                      ) : (
                        rate.sourceQuoteShipmentNumber || rate.sourceType || '-'
                      )}
                    </TableCell>
                    <TableCell align="center">
                        <Tooltip title="Edit Rate">
                          <IconButton size="small" onClick={() => handleOpenManualForm(rate)}>
                            <EditIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      <Tooltip title="Delete Rate Entry">
                        <IconButton size="small" onClick={() => handleDeleteClick(rate)} color="error" disabled={deleteMutation.isLoading && itemToDelete?._id === rate._id}>
                          <DeleteIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {paginationData && paginationData.total > 0 && (
            <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={paginationData.total}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
           )}
        </Paper>
      )}

      {itemToDelete && (
        <ConfirmationDialog
          open={isConfirmDeleteDialogOpen}
          onClose={() => { setIsConfirmDeleteDialogOpen(false); setItemToDelete(null); }}
          onConfirm={handleConfirmDelete}
          title="Delete Lane Rate Entry?"
          contentText={`Are you sure you want to delete this specific rate entry for ${itemToDelete.originCity}, ${itemToDelete.originState} to ${itemToDelete.destinationCity}, ${itemToDelete.destinationState} by ${itemToDelete.carrier?.name || 'N/A'} dated ${format(new Date(itemToDelete.rateDate), 'MM/dd/yyyy')}? This action cannot be undone.`}
          isLoading={deleteMutation.isLoading}
        />
      )}

      {isManualFormOpen && (
        <ManualLaneRateFormDialog
            open={isManualFormOpen}
            onClose={() => {setIsManualFormOpen(false); setEditingManualRateData(null);}}
            onSubmit={handleSaveManualLaneRate}
            initialData={editingManualRateData}
            isLoading={manualRateMutation.isLoading}
        />
      )}
    </Box>
  );
};

export default LaneRateDetailPage;