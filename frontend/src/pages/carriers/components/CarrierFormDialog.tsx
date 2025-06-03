// File: frontend/src/pages/carriers/components/CarrierFormDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Grid, TextField, Typography, Divider, CircularProgress,
  // Add any other MUI components needed for the form
} from '@mui/material';
import { toast } from 'react-toastify';

// Simplified interface for what the form directly handles
// The full ICarrier from backend might have more (like populated documents, complex saferData object)
export interface CarrierFormData {
  _id?: string;
  name: string;
  mcNumber: string;
  dotNumber: string;
  // Contact sub-object
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  // Address sub-object
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  // Optional: For more complex scenarios, you might add equipment types, preferred lanes here
  // For now, keeping it aligned with the previous simpler form for carriers.
}

export const initialCarrierFormData: CarrierFormData = {
  name: '', mcNumber: '', dotNumber: '',
  contactName: '', contactPhone: '', contactEmail: '',
  addressStreet: '', addressCity: '', addressState: '', addressZip: '',
};

interface CarrierFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: CarrierFormData, id?: string) => void;
  initialData?: CarrierFormData | null;
  isLoading: boolean;
}

const CarrierFormDialog: React.FC<CarrierFormDialogProps> = ({
  open, onClose, onSubmit, initialData, isLoading,
}) => {
  const [formData, setFormData] = useState<CarrierFormData>(initialCarrierFormData);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData(initialCarrierFormData);
      }
    }
  }, [initialData, open]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.mcNumber || !formData.dotNumber || !formData.contactName || !formData.contactEmail || !formData.addressStreet || !formData.addressCity || !formData.addressState || !formData.addressZip) {
      toast.error('Please fill in all required fields.');
      return;
    }
    onSubmit(formData, formData._id);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
      <DialogTitle>{formData._id ? 'Edit Carrier' : 'New Carrier'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.1 }}>
          <Grid item xs={12}><Typography variant="overline">Carrier Information</Typography><Divider /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Carrier Name*" name="name" value={formData.name} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="MC Number*" name="mcNumber" value={formData.mcNumber} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="DOT Number*" name="dotNumber" value={formData.dotNumber} onChange={handleInputChange} /></Grid>

          <Grid item xs={12}><Typography variant="overline" sx={{ mt: 1.5 }}>Contact Details</Typography><Divider /></Grid>
          <Grid item xs={12} sm={6} md={4}><TextField size="small" fullWidth label="Contact Name*" name="contactName" value={formData.contactName} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={6} md={4}><TextField size="small" fullWidth label="Contact Phone" name="contactPhone" value={formData.contactPhone} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={6} md={4}><TextField size="small" fullWidth label="Contact Email*" name="contactEmail" type="email" value={formData.contactEmail} onChange={handleInputChange} /></Grid>
          
          <Grid item xs={12}><Typography variant="overline" sx={{ mt: 1.5 }}>Address</Typography><Divider /></Grid>
          <Grid item xs={12}><TextField size="small" fullWidth label="Street Address*" name="addressStreet" value={formData.addressStreet} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={5} md={5}><TextField size="small" fullWidth label="City*" name="addressCity" value={formData.addressCity} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={3} md={3}><TextField size="small" fullWidth label="State*" name="addressState" value={formData.addressState} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={4} md={4}><TextField size="small" fullWidth label="Zip Code*" name="addressZip" value={formData.addressZip} onChange={handleInputChange} /></Grid>
          
          {/* Add more fields as needed: Equipment Types, Preferred Lanes, Insurance info etc. */}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : (formData._id ? 'Update Carrier' : 'Save Carrier')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CarrierFormDialog;