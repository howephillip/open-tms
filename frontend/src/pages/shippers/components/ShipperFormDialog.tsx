// File: frontend/src/pages/shippers/components/ShipperFormDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Grid, TextField, Typography, Divider, CircularProgress
} from '@mui/material';
import { toast } from 'react-toastify';

// This FormData should match the fields you want to edit/create for a Shipper
export interface ShipperFormData {
  _id?: string;
  name: string;
  industry: string;
  // Contact
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  // Address
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  // Billing Info
  billingInvoiceEmail: string;
  billingPaymentTerms: string;
  billingCreditLimit: string; // Input as string
  // Optional fields
  preferredEquipment?: string; // Comma-separated for input
}

export const initialShipperFormData: ShipperFormData = {
  name: '', industry: '',
  contactName: '', contactPhone: '', contactEmail: '',
  addressStreet: '', addressCity: '', addressState: '', addressZip: '',
  billingInvoiceEmail: '', billingPaymentTerms: 'Net 30', billingCreditLimit: '0',
  preferredEquipment: '',
};

interface ShipperFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: ShipperFormData, id?: string) => void;
  initialData?: ShipperFormData | null;
  isLoading: boolean;
}

const ShipperFormDialog: React.FC<ShipperFormDialogProps> = ({
  open, onClose, onSubmit, initialData, isLoading,
}) => {
  const [formData, setFormData] = useState<ShipperFormData>(initialShipperFormData);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData(initialShipperFormData);
      }
    }
  }, [initialData, open]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.industry || !formData.contactName || !formData.contactEmail || !formData.addressStreet || !formData.addressCity || !formData.addressState || !formData.addressZip || !formData.billingInvoiceEmail) {
      toast.error('Please fill in all required (*) fields.');
      return;
    }
    onSubmit(formData, formData._id);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
      <DialogTitle>{formData._id ? 'Edit Shipper' : 'New Shipper'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.1 }}>
          <Grid item xs={12}><Typography variant="overline">Shipper Information</Typography><Divider /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Shipper Name*" name="name" value={formData.name} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Industry*" name="industry" value={formData.industry} onChange={handleInputChange} /></Grid>

          <Grid item xs={12}><Typography variant="overline" sx={{ mt: 1.5 }}>Contact Details</Typography><Divider /></Grid>
          <Grid item xs={12} sm={6} md={4}><TextField size="small" fullWidth label="Contact Name*" name="contactName" value={formData.contactName} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={6} md={4}><TextField size="small" fullWidth label="Contact Phone" name="contactPhone" value={formData.contactPhone} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={6} md={4}><TextField size="small" fullWidth label="Contact Email*" name="contactEmail" type="email" value={formData.contactEmail} onChange={handleInputChange} /></Grid>
          
          <Grid item xs={12}><Typography variant="overline" sx={{ mt: 1.5 }}>Address</Typography><Divider /></Grid>
          <Grid item xs={12}><TextField size="small" fullWidth label="Street Address*" name="addressStreet" value={formData.addressStreet} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={5} md={5}><TextField size="small" fullWidth label="City*" name="addressCity" value={formData.addressCity} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={3} md={3}><TextField size="small" fullWidth label="State*" name="addressState" value={formData.addressState} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={4} md={4}><TextField size="small" fullWidth label="Zip Code*" name="addressZip" value={formData.addressZip} onChange={handleInputChange} /></Grid>

          <Grid item xs={12}><Typography variant="overline" sx={{ mt: 1.5 }}>Billing Information</Typography><Divider /></Grid>
          <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Invoice Email*" name="billingInvoiceEmail" type="email" value={formData.billingInvoiceEmail} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Payment Terms" name="billingPaymentTerms" value={formData.billingPaymentTerms} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Credit Limit ($)" name="billingCreditLimit" type="number" value={formData.billingCreditLimit} onChange={handleInputChange} /></Grid>
          
          <Grid item xs={12}><Typography variant="overline" sx={{ mt: 1.5 }}>Preferences (Optional)</Typography><Divider /></Grid>
          <Grid item xs={12}><TextField size="small" fullWidth label="Preferred Equipment (comma-separated)" name="preferredEquipment" value={formData.preferredEquipment} onChange={handleInputChange} /></Grid>

        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : (formData._id ? 'Update Shipper' : 'Save Shipper')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShipperFormDialog;