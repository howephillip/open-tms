// File: frontend/src/pages/shipments/components/CheckInDialog.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField, MenuItem, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import { statusOptions as allStatusOptions, checkinMethodOptions } from '../constants/shipmentOptions'; // Import options

// Types (could be shared)
type StatusType = string;
interface CheckInFormData {
    dateTime: string | Date;
    method: 'phone' | 'email' | 'text' | 'api' | 'portal' | 'edi' | string;
    contactPerson?: string;
    currentLocation?: string;
    notes: string;
    statusUpdate?: StatusType | '';
}

interface CheckInDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (checkInData: CheckInFormData) => void;
  isLoading: boolean;
  shipmentNumber?: string;
  // statusOptions are now imported directly
}

const initialCheckInFormData: CheckInFormData = { dateTime: new Date().toISOString().substring(0,16), method: 'email', contactPerson: '', currentLocation:'', notes: '', statusUpdate: '' };

const formatDateTimeForInput = (dateTimeString?: string | Date): string => {
    if (!dateTimeString) return '';
    try { const date = new Date(dateTimeString); return date.toISOString().substring(0, 16); } catch (e) { return ''; }
};

const CheckInDialog: React.FC<CheckInDialogProps> = ({
  open, onClose, onSubmit, isLoading, shipmentNumber
}) => {
  const [formData, setFormData] = useState<CheckInFormData>(initialCheckInFormData);

  useEffect(() => {
    if (open) {
      setFormData({...initialCheckInFormData, dateTime: formatDateTimeForInput(new Date()) });
    }
  }, [open]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof CheckInFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value as any }));
  };

  const handleSubmit = () => {
    if (!formData.notes || !formData.dateTime) {
      toast.error("Date/Time and Notes are required for check-in.");
      return;
    }
    onSubmit({ ...formData, dateTime: new Date(formData.dateTime as string).toISOString() });
  };

  // Filter out 'quote' status for check-ins
  const applicableStatusOptions = allStatusOptions.filter(s => s !== 'quote');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Check-in for {shipmentNumber || ''}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{mt:1}}>
           <Grid item xs={12} sm={6}><TextField fullWidth label="Date/Time" name="dateTime" type="datetime-local" value={formData.dateTime ? formatDateTimeForInput(formData.dateTime) : ''} onChange={handleInputChange} InputLabelProps={{ shrink: true }} required/></Grid>
          <Grid item xs={12} sm={6}><TextField select fullWidth label="Method" name="method" value={formData.method} onChange={(e) => handleSelectChange('method', e.target.value)}>
              {checkinMethodOptions.map(m => <MenuItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</MenuItem>)}
            </TextField></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Contact Person/Details" name="contactPerson" value={formData.contactPerson || ''} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Location Update" name="currentLocation" value={formData.currentLocation || ''} onChange={handleInputChange} /></Grid>
          <Grid item xs={12}> <TextField select fullWidth label="Associated Status Update (Optional)" name="statusUpdate" value={formData.statusUpdate || ''} onChange={(e) => handleSelectChange('statusUpdate', e.target.value as CheckInFormData['statusUpdate'])}>
              <MenuItem value=""><em>No Status Change</em></MenuItem>
              {applicableStatusOptions.map(s => <MenuItem key={`stat-${s}`} value={s} sx={{textTransform: 'capitalize'}}>{s.replace(/_/g, ' ')}</MenuItem>)}
          </TextField></Grid>
          <Grid item xs={12}><TextField fullWidth label="Notes" name="notes" value={formData.notes} onChange={handleInputChange} multiline rows={4} required/></Grid>
        </Grid>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button><Button onClick={handleSubmit} variant="contained" disabled={isLoading}>{isLoading ? <CircularProgress size={24} /> : 'Save Check-in'}</Button></DialogActions>
    </Dialog>
  );
};

export default CheckInDialog;