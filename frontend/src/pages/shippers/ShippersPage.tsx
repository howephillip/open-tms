import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Tooltip,
  CircularProgress, Alert, Link as MuiLink
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Visibility as ViewIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate, Link as RouterLink, useParams } from 'react-router-dom';
import { shipperAPI } from '../../services/api';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import ShipperFormDialog, { ShipperFormData } from './components/ShipperFormDialog';
import ConfirmationDialog from '../../components/common/ConfirmationDialog';

interface ShipperDisplay {
  _id: string; name: string;
  contact?: { name?: string; email?: string; phone?: string; };
  address?: { street?: string; city?: string; state?: string; zip?: string; };
  industry?: string; totalShipments?: number;
  billingInfo?: { invoiceEmail?: string; paymentTerms?: string; creditLimit?: number; };
  preferredEquipment?: string[];
}

interface ShippersPageProps { mode?: 'edit'; }

const ShippersPage: React.FC<ShippersPageProps> = ({ mode }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { shipperId: shipperIdFromUrl } = useParams<{ shipperId?: string }>();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShipperData, setEditingShipperData] = useState<ShipperFormData | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ShipperDisplay | null>(null);
  const [searchTermInput, setSearchTermInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedSearchTerm(searchTermInput), 500);
    return () => clearTimeout(timerId);
  }, [searchTermInput]);

  const { data: shippersResponse, isLoading: isLoadingShippers, isError: isErrorShippers, error: errorShippers } = useQuery(
    ['shippers', debouncedSearchTerm],
    () => shipperAPI.getAll({ limit: 50, sort: 'name', ...(debouncedSearchTerm && { searchTerm: debouncedSearchTerm }) }),
    { keepPreviousData: true }
  );
  const shippers: ShipperDisplay[] = shippersResponse?.data?.data?.shippers || [];

  const shipperMutation = useMutation(
    (data: { id?: string, formData: ShipperFormData }) => {
        const apiPayload = {
            name: data.formData.name, industry: data.formData.industry,
            contact: { name: data.formData.contactName, phone: data.formData.contactPhone, email: data.formData.contactEmail },
            address: { street: data.formData.addressStreet, city: data.formData.addressCity, state: data.formData.addressState, zip: data.formData.addressZip },
            billingInfo: { invoiceEmail: data.formData.billingInvoiceEmail, paymentTerms: data.formData.billingPaymentTerms, creditLimit: parseFloat(data.formData.billingCreditLimit) || 0 },
            preferredEquipment: data.formData.preferredEquipment?.split(',').map(e=>e.trim()).filter(e=>e) || []
        };
        return data.id ? shipperAPI.update(data.id, apiPayload) : shipperAPI.create(apiPayload);
    },
    {
      onSuccess: (response, variables) => { toast.success(`Shipper ${variables.id ? 'updated' : 'created'}!`); queryClient.invalidateQueries('shippers'); setIsFormOpen(false); setEditingShipperData(null); },
      onError: (err: any) => { toast.error(err.response?.data?.message || `Error creating/updating shipper.`); },
    }
  );

  const deleteShipperMutation = useMutation((shipperId: string) => shipperAPI.delete(shipperId), {
    onSuccess: (response) => { toast.success(response.data.message || 'Shipper deleted!'); queryClient.invalidateQueries('shippers'); setIsConfirmDeleteDialogOpen(false); setItemToDelete(null); },
    onError: (error: any) => { toast.error(error.response?.data?.message || 'Error deleting shipper.'); setIsConfirmDeleteDialogOpen(false); setItemToDelete(null); },
  });

  const handleOpenForm = (shipperToEdit?: ShipperDisplay) => {
    if (shipperToEdit) {
      shipperAPI.getById(shipperToEdit._id).then(response => {
          const fullShipper = response.data.data;
          setEditingShipperData({
              _id: fullShipper._id, name: fullShipper.name || '', industry: fullShipper.industry || '',
              contactName: fullShipper.contact?.name || '', contactPhone: fullShipper.contact?.phone || '', contactEmail: fullShipper.contact?.email || '',
              addressStreet: fullShipper.address?.street || '', addressCity: fullShipper.address?.city || '', addressState: fullShipper.address?.state || '', addressZip: fullShipper.address?.zip || '',
              billingInvoiceEmail: fullShipper.billingInfo?.invoiceEmail || '', billingPaymentTerms: fullShipper.billingInfo?.paymentTerms || 'Net 30',
              billingCreditLimit: (fullShipper.billingInfo?.creditLimit ?? 0).toString(), preferredEquipment: fullShipper.preferredEquipment?.join(', ') || '',
          });
          setIsFormOpen(true);
      }).catch(err => { toast.error("Failed to load shipper details for editing."); });
    } else {
      setEditingShipperData(null);
      setIsFormOpen(true);
    }
  };
  
  const handleCloseForm = () => { setIsFormOpen(false); setEditingShipperData(null); if (mode === 'edit' && shipperIdFromUrl) navigate('/shippers', {replace: true}); };
  const handleSaveShipper = (formData: ShipperFormData) => { shipperMutation.mutate({ id: editingShipperData?._id, formData }); };
  const handleViewDetails = (shipperId: string) => { navigate(`/shippers/${shipperId}`); };
  const handleDeleteItem = (shipper: ShipperDisplay) => { setItemToDelete(shipper); setIsConfirmDeleteDialogOpen(true); };
  const handleConfirmDelete = () => { if (itemToDelete) deleteShipperMutation.mutate(itemToDelete._id); };

  if (isLoadingShippers && !shippersResponse?.data) {
    return <Box sx={{p:3, textAlign:'center', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh'}}><CircularProgress /></Box>;
  }
  if (isErrorShippers) {
    return <Alert severity="error">Error fetching shippers: {(errorShippers as any)?.response?.data?.message || (errorShippers as any)?.message || 'Unknown error'}</Alert>;
  }

  return (
    <Box>
      <PageHeader
        title="Shippers"
        searchLabel="Search Shippers"
        searchTerm={searchTermInput}
        onSearchChange={(e) => setSearchTermInput(e.target.value)}
      >
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenForm()}>New Shipper</Button>
      </PageHeader>

      <TableContainer component={Paper}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell><TableCell>Industry</TableCell>
              <TableCell>Contact</TableCell><TableCell>Location</TableCell>
              <TableCell align="center">Total Shipments</TableCell><TableCell align="center" sx={{minWidth: 150}}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shippers && shippers.length > 0 ? (
              shippers.map((shipper) => (
                <TableRow hover key={shipper._id} >
                  <TableCell>
                    <MuiLink component={RouterLink} to={`/shippers/${shipper._id}`} sx={{ textDecoration: 'none', color: 'primary.main', '&:hover':{textDecoration: 'underline'} }}>
                        {shipper.name}
                    </MuiLink>
                  </TableCell>
                  <TableCell>{shipper.industry || 'N/A'}</TableCell>
                  <TableCell>{shipper.contact?.name || 'N/A'} {shipper.contact?.email ? `(${shipper.contact.email})` : ''}</TableCell>
                  <TableCell>{shipper.address?.city || 'N/A'}, {shipper.address?.state || ''}</TableCell>
                  <TableCell align="center">{shipper.totalShipments || 0}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details"><IconButton size="small" onClick={() => handleViewDetails(shipper._id)}><ViewIcon fontSize="inherit"/></IconButton></Tooltip>
                    <Tooltip title="Edit Shipper"><IconButton size="small" onClick={() => handleOpenForm(shipper)}><EditIcon fontSize="inherit"/></IconButton></Tooltip>
                    <Tooltip title="Delete Shipper"><IconButton size="small" onClick={() => handleDeleteItem(shipper)} color="error"><DeleteIcon fontSize="inherit"/></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={6} align="center">{isLoadingShippers ? "Loading..." : "No shippers found."}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {isFormOpen && (
        <ShipperFormDialog open={isFormOpen} onClose={handleCloseForm} onSubmit={handleSaveShipper} initialData={editingShipperData} isLoading={shipperMutation.isLoading} />
      )}

       {itemToDelete && (
        <ConfirmationDialog open={isConfirmDeleteDialogOpen} onClose={() => { setIsConfirmDeleteDialogOpen(false); setItemToDelete(null); }} onConfirm={handleConfirmDelete}
          title="Delete Shipper?" contentText={`Are you sure you want to delete shipper "${itemToDelete.name}"? This action cannot be undone.`}
          isLoading={deleteShipperMutation.isLoading} />
      )}
    </Box>
  );
};

export default ShippersPage;