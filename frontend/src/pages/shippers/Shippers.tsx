import React, { useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid,
  CircularProgress, Alert,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { shipperAPI } from '../../services/api';
import { toast } from 'react-toastify';

interface Shipper {
  _id: string;
  name: string;
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  address: {
    city: string;
    state: string;
    // street, zip
  };
  industry: string;
  billingInfo?: {
    invoiceEmail: string;
    paymentTerms: string;
    creditLimit: number;
  }
  // Add other fields from IShipper
}

interface ShipperFormData {
  name: string;
  industry: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  billingInvoiceEmail: string;
  billingPaymentTerms: string;
  billingCreditLimit: string; // string for input
}

const initialShipperFormData: ShipperFormData = {
  name: '',
  industry: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  addressStreet: '',
  addressCity: '',
  addressState: '',
  addressZip: '',
  billingInvoiceEmail: '',
  billingPaymentTerms: 'Net 30',
  billingCreditLimit: '0',
};

const Shippers: React.FC = () => {
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<ShipperFormData>(initialShipperFormData);

  const { data: shippersResponse, isLoading, isError, error } = useQuery(
    'shippers',
    () => shipperAPI.getAll({ limit: 50 })
  );
  const shippers: Shipper[] = shippersResponse?.data?.shippers || shippersResponse?.data?.data?.shippers || [];

  const createShipperMutation = useMutation(
    (newShipperData: any) => shipperAPI.create(newShipperData),
    {
      onSuccess: (response) => {
        toast.success(response.data.message || 'Shipper created successfully!');
        queryClient.invalidateQueries('shippers');
        handleCloseDialog();
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Error creating shipper.');
      },
    }
  );

  const handleOpenDialog = () => {
    setFormData(initialShipperFormData);
    setOpenDialog(true);
  };
  const handleCloseDialog = () => setOpenDialog(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveShipper = () => {
    const apiData = {
      name: formData.name,
      industry: formData.industry,
      contact: {
        name: formData.contactName,
        phone: formData.contactPhone,
        email: formData.contactEmail,
      },
      address: {
        street: formData.addressStreet,
        city: formData.addressCity,
        state: formData.addressState,
        zip: formData.addressZip,
      },
      billingInfo: {
        invoiceEmail: formData.billingInvoiceEmail,
        paymentTerms: formData.billingPaymentTerms,
        creditLimit: parseFloat(formData.billingCreditLimit) || 0,
      }
    };
     if (!apiData.name || !apiData.billingInfo.invoiceEmail) {
        toast.error("Shipper Name and Invoice Email are required.");
        return;
    }
    createShipperMutation.mutate(apiData);
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error">Error fetching shippers: {(error as any)?.message}</Alert>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Shippers</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
          New Shipper
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Industry</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shippers.map((shipper) => (
              <TableRow key={shipper._id}>
                <TableCell>{shipper.name}</TableCell>
                <TableCell>{shipper.contact?.name || 'N/A'}</TableCell>
                <TableCell>{shipper.contact?.phone || 'N/A'}</TableCell>
                <TableCell>{shipper.address?.city}, {shipper.address?.state}</TableCell>
                <TableCell>{shipper.industry}</TableCell>
                <TableCell>
                  <IconButton size="small" title="View Details"><ViewIcon /></IconButton>
                  <IconButton size="small" title="Edit Shipper"><EditIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>New Shipper</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Shipper Name" name="name" value={formData.name} onChange={handleInputChange} required /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Industry" name="industry" value={formData.industry} onChange={handleInputChange} /></Grid>
            <Grid item xs={12}><Typography variant="subtitle2" sx={{mt:1}}>Contact Info</Typography></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Contact Name" name="contactName" value={formData.contactName} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Contact Phone" name="contactPhone" value={formData.contactPhone} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Contact Email" name="contactEmail" type="email" value={formData.contactEmail} onChange={handleInputChange} /></Grid>
            <Grid item xs={12}><Typography variant="subtitle2" sx={{mt:1}}>Address</Typography></Grid>
            <Grid item xs={12}><TextField fullWidth label="Street Address" name="addressStreet" value={formData.addressStreet} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="City" name="addressCity" value={formData.addressCity} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="State" name="addressState" value={formData.addressState} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Zip Code" name="addressZip" value={formData.addressZip} onChange={handleInputChange} /></Grid>
            <Grid item xs={12}><Typography variant="subtitle2" sx={{mt:1}}>Billing Info</Typography></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Invoice Email" name="billingInvoiceEmail" type="email" value={formData.billingInvoiceEmail} onChange={handleInputChange} required /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Payment Terms" name="billingPaymentTerms" value={formData.billingPaymentTerms} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Credit Limit ($)" name="billingCreditLimit" type="number" value={formData.billingCreditLimit} onChange={handleInputChange} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveShipper} variant="contained" disabled={createShipperMutation.isLoading}>
            {createShipperMutation.isLoading ? <CircularProgress size={24}/> : "Save Shipper"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Shippers;