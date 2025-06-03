// File: frontend/src/pages/carriers/CarriersPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip,
  CircularProgress, Alert, TextField, InputAdornment, Chip,
  Link as MuiLink // Added MuiLink for consistency if needed
} from '@mui/material';
import {
    Add as AddIcon, Edit as EditIcon, Visibility as ViewIcon,
    Refresh as RefreshIcon, Search as SearchIcon,
    DeleteOutline as DeleteIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate, Link as RouterLink, useParams } from 'react-router-dom'; // Added useParams
import { carrierAPI } from '../../services/api';
import { toast } from 'react-toastify';

import CarrierFormDialog, { CarrierFormData, initialCarrierFormData } from './components/CarrierFormDialog';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';

interface CarrierDisplay {
  _id: string;
  name: string;
  mcNumber: string;
  dotNumber: string;
  contact?: { name?: string; phone?: string; email?: string; };
  address?: { city?: string; state?: string; zip?: string; street?: string; };
  saferData?: { saferRating?: string; status?: string; lastUpdated?: string | Date; };
}

interface CarriersPageProps {
    mode?: 'edit';
}

const CarriersPage: React.FC<CarriersPageProps> = ({ mode }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { carrierId: carrierIdFromUrl } = useParams<{ carrierId?: string }>(); // useParams is now defined

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCarrierData, setEditingCarrierData] = useState<CarrierFormData | null>(null);

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CarrierDisplay | null>(null);

  const [searchTermInput, setSearchTermInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedSearchTerm(searchTermInput), 500);
    return () => clearTimeout(timerId);
  }, [searchTermInput]);

  const {
    data: carriersResponse,
    isLoading: isLoadingCarriers,
    isError: isErrorCarriers,
    error: errorCarriers
  } = useQuery(
    ['carriers', debouncedSearchTerm],
    () => carrierAPI.getAll({
        limit: 50,
        sort: 'name',
        ...(debouncedSearchTerm && { searchTerm: debouncedSearchTerm })
    }),
    { keepPreviousData: true }
  );
  const carriers: CarrierDisplay[] = carriersResponse?.data?.data?.carriers || [];

  const carrierMutation = useMutation(
    (data: { id?: string, formData: CarrierFormData }) =>
      data.id ? carrierAPI.update(data.id, {
        name: data.formData.name, mcNumber: data.formData.mcNumber, dotNumber: data.formData.dotNumber,
        contact: { name: data.formData.contactName, phone: data.formData.contactPhone, email: data.formData.contactEmail },
        address: { street: data.formData.addressStreet, city: data.formData.addressCity, state: data.formData.addressState, zip: data.formData.addressZip }
      }) : carrierAPI.create({
        name: data.formData.name, mcNumber: data.formData.mcNumber, dotNumber: data.formData.dotNumber,
        contact: { name: data.formData.contactName, phone: data.formData.contactPhone, email: data.formData.contactEmail },
        address: { street: data.formData.addressStreet, city: data.formData.addressCity, state: data.formData.addressState, zip: data.formData.addressZip }
      }),
    {
      onSuccess: (response, variables) => {
        toast.success(response.data.message || `Carrier ${variables.id ? 'updated' : 'created'}!`);
        queryClient.invalidateQueries('carriers');
        setIsFormOpen(false);
        setEditingCarrierData(null);
      },
      onError: (err: any, variables) => {
        toast.error(err.response?.data?.message || `Error ${variables.id ? 'updating' : 'creating'} carrier.`);
      },
    }
  );

  const deleteCarrierMutation = useMutation(
    (carrierId: string) => carrierAPI.delete(carrierId),
    {
      onSuccess: (response) => {
        toast.success(response.data.message || 'Carrier deleted successfully!');
        queryClient.invalidateQueries('carriers');
        setIsConfirmDeleteDialogOpen(false);
        setItemToDelete(null);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Error deleting carrier.');
        setIsConfirmDeleteDialogOpen(false);
        setItemToDelete(null);
      },
    }
  );

  const updateSaferMutation = useMutation(
    (carrierId: string) => carrierAPI.updateSaferData(carrierId),
    {
        onSuccess: (response) => {
            toast.success(response.data.message || `SAFER data update triggered. Refreshing list...`);
            queryClient.invalidateQueries('carriers');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Error updating SAFER data.');
        }
    }
  );

  const handleOpenForm = (carrierToEdit?: CarrierDisplay) => {
    if (carrierToEdit) {
      setEditingCarrierData({
        _id: carrierToEdit._id,
        name: carrierToEdit.name || '',
        mcNumber: carrierToEdit.mcNumber || '',
        dotNumber: carrierToEdit.dotNumber || '',
        contactName: carrierToEdit.contact?.name || '',
        contactPhone: carrierToEdit.contact?.phone || '',
        contactEmail: carrierToEdit.contact?.email || '',
        addressStreet: carrierToEdit.address?.street || '',
        addressCity: carrierToEdit.address?.city || '',
        addressState: carrierToEdit.address?.state || '',
        addressZip: carrierToEdit.address?.zip || '',
      });
    } else {
      setEditingCarrierData(null);
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCarrierData(null);
     if (mode === 'edit' && carrierIdFromUrl) navigate('/carriers', {replace: true});
  };

  const handleSaveCarrier = (formData: CarrierFormData) => {
    carrierMutation.mutate({ id: editingCarrierData?._id, formData });
  };

  const handleViewCarrierDetails = (carrierId: string) => {
    navigate(`/carriers/${carrierId}`);
  };

  const handleRefreshSafer = (carrierId: string) => {
    if(!carrierId) {
        toast.warn("Carrier ID missing for SAFER update.");
        return;
    }
    updateSaferMutation.mutate(carrierId);
  };

  const handleDeleteCarrier = (carrier: CarrierDisplay) => {
    setItemToDelete(carrier);
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteCarrierMutation.mutate(itemToDelete._id);
    }
  };

  const getRatingColor = (rating?: string): "default" | "success" | "warning" | "error" => {
    if (!rating) return 'default';
    const lowerRating = rating.toLowerCase();
    if (lowerRating.includes('satisfactory')) return 'success';
    if (lowerRating.includes('conditional')) return 'warning';
    if (lowerRating.includes('unsatisfactory')) return 'error';
    return 'default';
  };

  if (isLoadingCarriers && !carriersResponse?.data) {
    return <Box sx={{p:3, textAlign:'center'}}><CircularProgress /></Box>;
  }
  if (isErrorCarriers) {
    return <Alert severity="error">Error fetching carriers: {(errorCarriers as any)?.response?.data?.message || (errorCarriers as any)?.message || 'Unknown error'}</Alert>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Carriers</Typography>
        <Box display="flex" alignItems="center">
            <TextField
                label="Search Carriers"
                variant="outlined"
                size="small"
                value={searchTermInput}
                onChange={(e) => setSearchTermInput(e.target.value)}
                sx={{ mr: 2, minWidth: 300 }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>),}}
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenForm()}>
            New Carrier
            </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>MC#</TableCell>
              <TableCell>DOT#</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>SAFER Rating</TableCell>
              <TableCell align="center" sx={{ minWidth: 180 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {carriers && carriers.length > 0 ? (
              carriers.map((carrier) => (
                <TableRow hover key={carrier._id}>
                  <TableCell>
                    <MuiLink component={RouterLink} to={`/carriers/${carrier._id}`} sx={{ textDecoration: 'none', color: 'primary.main', '&:hover': {textDecoration: 'underline'} }}>
                      {carrier.name}
                    </MuiLink>
                  </TableCell>
                  <TableCell>{carrier.mcNumber}</TableCell>
                  <TableCell>{carrier.dotNumber}</TableCell>
                  <TableCell>{carrier.contact?.name || 'N/A'}</TableCell>
                  <TableCell>{carrier.address?.city || 'N/A'}, {carrier.address?.state || ''}</TableCell>
                  <TableCell>
                    {carrier.saferData?.saferRating ? (
                      <Chip label={carrier.saferData.saferRating} color={getRatingColor(carrier.saferData.saferRating)} size="small"/>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Refresh SAFER Data">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleRefreshSafer(carrier._id);}} disabled={updateSaferMutation.isLoading && updateSaferMutation.variables === carrier._id}>
                            {updateSaferMutation.isLoading && updateSaferMutation.variables === carrier._id ? <CircularProgress size={18}/> : <RefreshIcon fontSize="inherit"/>}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="View Details">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleViewCarrierDetails(carrier._id);}}><ViewIcon fontSize="inherit"/></IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Carrier">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenForm(carrier);}}><EditIcon fontSize="inherit"/></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Carrier">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteCarrier(carrier);}} color="error">
                            <DeleteIcon fontSize="inherit"/>
                        </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={7} align="center">{isLoadingCarriers ? "Loading..." : "No carriers found."}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {isFormOpen && (
        <CarrierFormDialog
          open={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={handleSaveCarrier}
          initialData={editingCarrierData}
          isLoading={carrierMutation.isLoading}
        />
      )}

      {itemToDelete && (
        <ConfirmationDialog
          open={isConfirmDeleteDialogOpen}
          onClose={() => { setIsConfirmDeleteDialogOpen(false); setItemToDelete(null); }}
          onConfirm={handleConfirmDelete}
          title="Delete Carrier?"
          contentText={`Are you sure you want to delete carrier "${itemToDelete.name || itemToDelete.mcNumber}"? This action cannot be undone. Associated active shipments might prevent deletion.`}
          isLoading={deleteCarrierMutation.isLoading}
        />
      )}
    </Box>
  );
};

export default CarriersPage;