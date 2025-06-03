// File: frontend/src/pages/lanerates/components/ManualLaneRateFormDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, TextField,
  CircularProgress, IconButton, Box, Typography, Autocomplete, Chip, MenuItem, InputAdornment, Divider
} from '@mui/material';
import { AddCircleOutline as AddIcon, RemoveCircleOutline as RemoveIcon, Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import { useQuery } from 'react-query';
import { carrierAPI, lookupAPI } from '../../../services/api'; // Assuming lookupAPI for modes/equipment
import { toast } from 'react-toastify';
import { IAccessorialTypeFE } from '../../settings/components/AccessorialTypesSettings'; // Re-use if possible

// Constants (can be moved to a shared file)
const modeOfTransportOptionsList = [
  'truckload-ftl', 'truckload-ltl', 'drayage-import', 'drayage-export', 'intermodal-rail',
  'ocean-fcl', 'ocean-lcl', 'air-freight', 'expedited-ground', 'final-mile', 'other'
];


interface CarrierStub { _id: string; name: string; mcNumber?: string; }
interface EquipmentTypeOption { _id: string; name: string; code?: string; category?: string; }

interface ManualAccessorialForm {
  _id?: string; // For UI key, not sent to backend for new
  name: string;
  cost: string; // Keep as string for form input
  notes?: string;
}

export interface ManualLaneRateFormData {
  _id?: string; // For editing existing manual lane rates, if needed later
  originCity: string;
  originState: string;
  originZip?: string;
  destinationCity: string;
  destinationState: string;
  destinationZip?: string;
  carrier: string; // Carrier ID
  lineHaulCost: string;
  fscPercentage?: string;
  chassisCostCarrier?: string; // Carrier's chassis cost
  manualAccessorials: ManualAccessorialForm[];
  rateDate: string; // ISOString
  rateValidUntil?: string; // ISOString or empty
  modeOfTransport: string;
  equipmentType?: string;
  notes?: string;
  // createdBy will be handled by backend or passed if available from auth context
}

export const initialManualLaneRateFormData: ManualLaneRateFormData = {
  originCity: '', originState: '', originZip: '',
  destinationCity: '', destinationState: '', destinationZip: '',
  carrier: '', lineHaulCost: '0', fscPercentage: '', chassisCostCarrier: '',
  manualAccessorials: [],
  rateDate: new Date().toISOString().split('T')[0], // Default to today
  rateValidUntil: '',
  modeOfTransport: modeOfTransportOptionsList[0], // Default to first mode
  equipmentType: '',
  notes: '',
};

interface ManualLaneRateFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: ManualLaneRateFormData) => void; // Backend will handle ID for new
  initialData?: ManualLaneRateFormData | null; // For editing, if implemented
  isLoading: boolean;
}

const ManualLaneRateFormDialog: React.FC<ManualLaneRateFormDialogProps> = ({
  open, onClose, onSubmit, initialData, isLoading
}) => {
  const [formData, setFormData] = useState<ManualLaneRateFormData>(initialManualLaneRateFormData);

  // Fetch carriers for dropdown
  const { data: carriersResponse, isLoading: isLoadingCarriers } = useQuery(
    'carriersForLaneRateForm',
    () => carrierAPI.getAll({ limit: 500, sort: 'name', select: 'name mcNumber' }), // Select only needed fields
    { enabled: open }
  );
  const carriersList: CarrierStub[] = carriersResponse?.data?.data?.carriers || [];

  // Fetch equipment types for dropdown
  const { data: equipmentTypesResponse, isLoading: isLoadingEquipment } = useQuery(
    'equipmentTypesForLaneRateForm',
    () => lookupAPI.getEquipmentTypes({ isActive: true }), // Fetch only active equipment
    { enabled: open }
  );
  const equipmentTypesList: EquipmentTypeOption[] = equipmentTypesResponse?.data?.data?.equipmentTypes || [];


  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({ ...initialManualLaneRateFormData, ...initialData });
      } else {
        setFormData(initialManualLaneRateFormData);
      }
    }
  }, [initialData, open]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof ManualLaneRateFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAccessorialChange = (index: number, field: keyof ManualAccessorialForm, value: string) => {
    const updatedAccessorials = formData.manualAccessorials.map((acc, i) =>
      i === index ? { ...acc, [field]: value } : acc
    );
    setFormData(prev => ({ ...prev, manualAccessorials: updatedAccessorials }));
  };

  const addAccessorial = () => {
    setFormData(prev => ({
      ...prev,
      manualAccessorials: [...prev.manualAccessorials, { name: '', cost: '0', notes: '' }]
    }));
  };

  const removeAccessorial = (index: number) => {
    setFormData(prev => ({
      ...prev,
      manualAccessorials: prev.manualAccessorials.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitForm = () => {
    // Basic frontend validation
    if (!formData.originCity || !formData.originState || !formData.destinationCity || !formData.destinationState || !formData.carrier || !formData.lineHaulCost || !formData.modeOfTransport || !formData.rateDate) {
      toast.error('Please fill in all required fields: Origin/Dest City & State, Carrier, Line Haul Cost, Mode, and Rate Date.');
      return;
    }
    const payload: any = { ...formData };
    // Ensure numbers are sent as numbers
    payload.lineHaulCost = parseFloat(formData.lineHaulCost) || 0;
    if (formData.fscPercentage) payload.fscPercentage = parseFloat(formData.fscPercentage); else delete payload.fscPercentage;
    if (formData.chassisCostCarrier) payload.chassisCostCarrier = parseFloat(formData.chassisCostCarrier); else delete payload.chassisCostCarrier;
    
    payload.manualAccessorials = formData.manualAccessorials
        .filter(acc => acc.name && acc.cost) // Only include if name and cost are present
        .map(acc => ({
            ...acc,
            cost: parseFloat(acc.cost) || 0
        }));

    onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { maxHeight: '95vh' } }}>
      <DialogTitle>{initialData?._id ? 'Edit' : 'Add New'} Manual Lane Rate</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          {/* Origin */}
          <Grid item xs={12}><Typography variant="subtitle1">Origin</Typography></Grid>
          <Grid item xs={12} sm={4} md={3}><TextField fullWidth size="small" label="Origin City*" name="originCity" value={formData.originCity} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={4} md={2}><TextField fullWidth size="small" label="Origin State*" name="originState" value={formData.originState} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={4} md={2}><TextField fullWidth size="small" label="Origin Zip" name="originZip" value={formData.originZip} onChange={handleInputChange} /></Grid>

          {/* Destination */}
          <Grid item xs={12}><Typography variant="subtitle1" sx={{mt:1}}>Destination</Typography></Grid>
          <Grid item xs={12} sm={4} md={3}><TextField fullWidth size="small" label="Destination City*" name="destinationCity" value={formData.destinationCity} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={4} md={2}><TextField fullWidth size="small" label="Destination State*" name="destinationState" value={formData.destinationState} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={4} md={2}><TextField fullWidth size="small" label="Destination Zip" name="destinationZip" value={formData.destinationZip} onChange={handleInputChange} /></Grid>
          
          <Grid item xs={12}><Divider sx={{my:1}}/></Grid>

          {/* Carrier & Rate Info */}
          <Grid item xs={12} sm={6} md={4}>
            <Autocomplete
              size="small"
              options={carriersList}
              getOptionLabel={(option) => `${option.name} (${option.mcNumber || 'N/A'})`}
              value={carriersList.find(c => c._id === formData.carrier) || null}
              onChange={(event, newValue) => handleSelectChange('carrier', newValue ? newValue._id : '')}
              loading={isLoadingCarriers}
              renderInput={(params) => (
                <TextField {...params} label="Carrier*" variant="outlined" InputProps={{ ...params.InputProps, endAdornment: ( <>{isLoadingCarriers ? <CircularProgress color="inherit" size={20} /> : null} {params.InputProps.endAdornment}</> )}}/>
              )}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="Rate Date*" name="rateDate" type="date" value={formData.rateDate} onChange={handleInputChange} InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="Rate Valid Until" name="rateValidUntil" type="date" value={formData.rateValidUntil} onChange={handleInputChange} InputLabelProps={{ shrink: true }} /></Grid>
          
          <Grid item xs={12}><Typography variant="subtitle1" sx={{mt:1}}>Transportation Details</Typography></Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField select fullWidth size="small" label="Mode of Transport*" name="modeOfTransport" value={formData.modeOfTransport} onChange={(e) => handleSelectChange('modeOfTransport', e.target.value)}>
              {modeOfTransportOptionsList.map(mode => <MenuItem key={mode} value={mode} sx={{textTransform:'capitalize'}}>{mode.replace(/-/g,' ')}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
             <Autocomplete
                size="small"
                options={equipmentTypesList}
                getOptionLabel={(option) => option.name || ''}
                value={equipmentTypesList.find(eq => eq.name === formData.equipmentType) || null}
                onChange={(event, newValue) => handleSelectChange('equipmentType', newValue ? newValue.name : '')}
                loading={isLoadingEquipment}
                renderInput={(params) => (
                    <TextField {...params} label="Equipment Type" variant="outlined" InputProps={{ ...params.InputProps, endAdornment: ( <>{isLoadingEquipment ? <CircularProgress color="inherit" size={20} /> : null} {params.InputProps.endAdornment}</> )}}/>
                )}
            />
          </Grid>

          <Grid item xs={12}><Typography variant="subtitle1" sx={{mt:1}}>Carrier Costs</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="Line Haul Cost*" name="lineHaulCost" type="number" value={formData.lineHaulCost} onChange={handleInputChange} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="FSC (%)" name="fscPercentage" type="number" value={formData.fscPercentage} onChange={handleInputChange} InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" label="Chassis Cost" name="chassisCostCarrier" type="number" value={formData.chassisCostCarrier} onChange={handleInputChange} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} /></Grid>

          {/* Manual Accessorials */}
          <Grid item xs={12}><Typography variant="subtitle1" sx={{mt:1}}>Additional Carrier Accessorials</Typography></Grid>
          {formData.manualAccessorials.map((acc, index) => (
            <Grid item xs={12} container spacing={1} key={index} alignItems="center" sx={{mb:1}}>
              <Grid item xs={12} sm={5} md={4}><TextField fullWidth size="small" label="Accessorial Name" value={acc.name} onChange={(e) => handleAccessorialChange(index, 'name', e.target.value)} /></Grid>
              <Grid item xs={10} sm={4} md={3}><TextField fullWidth size="small" label="Cost" type="number" value={acc.cost} onChange={(e) => handleAccessorialChange(index, 'cost', e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} /></Grid>
              <Grid item xs={10} sm={6} md={4}><TextField fullWidth size="small" label="Notes" value={acc.notes || ''} onChange={(e) => handleAccessorialChange(index, 'notes', e.target.value)} /></Grid>
              <Grid item xs={2} sm={1}><IconButton onClick={() => removeAccessorial(index)} color="error"><RemoveIcon /></IconButton></Grid>
            </Grid>
          ))}
          <Grid item xs={12}><Button startIcon={<AddIcon />} onClick={addAccessorial} size="small">Add Manual Accessorial</Button></Grid>

          <Grid item xs={12}><TextField fullWidth size="small" label="Notes (Optional)" name="notes" value={formData.notes} onChange={handleInputChange} multiline rows={3} sx={{mt:1}} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} startIcon={<CloseIcon />}>Cancel</Button>
        <Button onClick={handleSubmitForm} variant="contained" startIcon={<SaveIcon />} disabled={isLoading}>
          {isLoading ? <CircularProgress size={20} sx={{color:'white'}} /> : (initialData?._id ? 'Update Rate' : 'Save Rate')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualLaneRateFormDialog;