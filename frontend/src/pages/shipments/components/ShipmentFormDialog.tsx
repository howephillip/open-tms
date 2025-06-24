// File: src/features/shipments/components/ShipmentFormDialog.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Grid, TextField, MenuItem, Checkbox, FormControlLabel,
  Typography, Divider, CircularProgress, InputAdornment, Tooltip,
  Box, List, ListItem, ListItemText, ListItemIcon, IconButton, Paper, Link, Alert, Autocomplete
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AttachFile as AttachFileIcon, DeleteOutline as DeleteDocIcon, CloudUpload as UploadIcon,
  Article as DocumentFileIcon, AddCircleOutline as AddIcon, RemoveCircleOutline as RemoveIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { documentAPI, settingsAPI, lookupAPI } from '../../../services/api';
import { toast } from 'react-toastify';
import { useQuery } from 'react-query';

import { 
    initialShipmentFormData, 
    ShipmentFormDataForDialog,
    IDocumentStubFE,
    IStop,
    QuoteAccessorialForm
} from '../utils/shipmentFormMappers'; 

import { 
    modeOfTransportOptions, 
    shipmentStatusOptions,
    locationTypeOptions,
    weightUnitOptions, 
    equipmentUnitOptions, 
    tempUnitOptions,
} from '../constants/shipmentOptions';

// Type Definitions
interface ShipperStub { _id: string; name: string; } 
interface CarrierStub { _id: string; name: string; } 
interface EquipmentTypeOption { _id: string; name: string; }
interface AccessorialTypeOption { _id: string; name: string; defaultCustomerRate?: number; defaultCarrierCost?: number; }
interface ShipmentFormSettings { requiredFields: string[]; }

interface ShipmentFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: ShipmentFormDataForDialog, id?: string) => void;
  initialData?: ShipmentFormDataForDialog | null;
  isLoading: boolean;
  shippersList: ShipperStub[];
  isLoadingShippers: boolean;
  carriersList: CarrierStub[];
  isLoadingCarriers: boolean;
  equipmentTypesList: EquipmentTypeOption[];
  isLoadingEquipmentTypes: boolean;
}

const formatFileSize = (bytes: number = 0): string => { 
    if (bytes === 0) return '0 Bytes'; const k = 1024; const sz = ['Bytes', 'KB', 'MB', 'GB', 'TB']; 
    const i = Math.floor(Math.log(bytes) / Math.log(k)); 
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sz[i]}`; 
};

const convertWeight = (value: number | string, fromUnit: string): number => {
  const numValue = parseFloat(String(value));
  if (isNaN(numValue)) return 0;
  if (fromUnit === 'kg') return +(numValue * 2.20462).toFixed(2);
  if (fromUnit === 'lbs') return +(numValue / 2.20462).toFixed(2);
  return numValue;
};

const getFieldValue = (obj: any, path: string) => path.split('.').reduce((acc, part) => acc && acc[part], obj);

const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null || isNaN(value)) return '$0.00';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const ShipmentFormDialog: React.FC<ShipmentFormDialogProps> = ({
  open, onClose, onSubmit, initialData, isLoading,
  shippersList, isLoadingShippers, carriersList, isLoadingCarriers,
  equipmentTypesList
}) => {
  const [formData, setFormData] = useState<ShipmentFormDataForDialog>(initialShipmentFormData);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: shipmentSettings, isLoading: isLoadingSettings } = useQuery<ShipmentFormSettings>(
    'shipmentFormSettings',
    () => settingsAPI.getShipmentFormSettings().then(res => res.data.data),
    { enabled: open }
  );

  const { data: accessorialTypesResponse } = useQuery(
    ['accessorialTypesLookup', formData.modeOfTransport],
    () => lookupAPI.getAccessorialTypes({ mode: formData.modeOfTransport }),
    { enabled: !!formData.modeOfTransport && open }
  );
  const accessorialTypesList: AccessorialTypeOption[] = accessorialTypesResponse?.data?.data?.accessorialTypes || [];

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
            ...initialShipmentFormData,
            equipmentType: equipmentTypesList.length > 0 ? equipmentTypesList[0].name : '',
            shipper: shippersList.length > 0 ? shippersList[0]._id : '',
            carrier: carriersList.length > 0 ? carriersList[0]._id : '',
        });
      }
      setFilesToUpload([]);
      console.log("[FORM STATE] formData was updated:", JSON.parse(JSON.stringify(formData)));
    }
  }, [initialData, open, shippersList, carriersList, equipmentTypesList]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    console.log(`[HANDLE INPUT CHANGE] name: ${name}, value:`, value);
    const checked = (event.target as HTMLInputElement).checked;
    if (type === 'date' || type === 'datetime-local') {
        setFormData(prev => ({ ...prev, [name]: value || '' }));
    } else {
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };
  
  const handleStopChange = (index: number, field: keyof IStop, value: any) => {
    console.log(`[HANDLE STOP CHANGE] index: ${index}, field: ${field}, value:`, value);
    const newStops = [...formData.stops];
    newStops[index] = { ...newStops[index], [field]: value || '' };
    setFormData(prev => ({ ...prev, stops: newStops }));
  };

  const handleAddStop = () => {
    setFormData(prev => ({
      ...prev,
      stops: [...prev.stops, { stopType: 'Dropoff', locationType: 'Dropoff', city: '', state: '', zip: '' }]
    }));
  };

  const handleRemoveStop = (index: number) => {
    if (formData.stops.length <= 1) {
      toast.warn("A shipment must have at least one stop.");
      return;
    }
    setFormData(prev => ({ ...prev, stops: prev.stops.filter((_, i) => i !== index) }));
  };

  const handleSelectChange = (name: keyof ShipmentFormDataForDialog, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => setFilesToUpload(prev => [...prev, ...acceptedFiles]), []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

  const handleUploadAndStage = async () => {
    if (filesToUpload.length === 0) { toast.warn("No new files selected to upload."); return; }
    setIsUploading(true);
    const uploadFormDataAPI = new FormData();
    filesToUpload.forEach(file => uploadFormDataAPI.append('files', file));
    uploadFormDataAPI.append('relatedToType', 'shipment');
    if (formData._id) {
        uploadFormDataAPI.append('relatedToId', formData._id);
    }
    
    try {
      const response = await documentAPI.upload(uploadFormDataAPI);
      if (response.data.success && response.data.data) {
        const uploadedDocsInfo: IDocumentStubFE[] = response.data.data.map((doc: any) => ({ 
            _id: doc._id, originalName: doc.originalName, mimetype: doc.mimetype, 
            s3Key: doc.s3Key, size: doc.size, createdAt: doc.createdAt 
        }));
        
        setFormData(prev => ({
            ...prev,
            documentIds: [...new Set([...(prev.documentIds || []), ...uploadedDocsInfo.map(d => d._id)])], 
            attachedDocuments: [...(prev.attachedDocuments || []), ...uploadedDocsInfo] 
        }));
        toast.success(`${uploadedDocsInfo.length} file(s) uploaded and staged.`);
        setFilesToUpload([]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error during file upload.");
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRemoveStagedFile = (fileIdToRemove: string) => {
    setFormData(prev => ({
        ...prev,
        documentIds: prev.documentIds?.filter(id => id !== fileIdToRemove),
        attachedDocuments: prev.attachedDocuments?.filter(doc => doc._id !== fileIdToRemove)
    }));
  };

  const handleSubmit = () => {
    if (shipmentSettings) {
        const missingFields = shipmentSettings.requiredFields.filter(fieldId => {
            const value = getFieldValue(formData, fieldId);
            return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
        });

        if (missingFields.length > 0) {
            toast.error(`Missing required fields: ${missingFields.join(', ')}`);
            return;
        }
    }

    const payload = { ...formData };

    const dateFields: (keyof ShipmentFormDataForDialog)[] = ['eta', 'pulledDate', 'ingatedDate', 'erdCutoffDate'];
    dateFields.forEach(field => {
      if (payload[field] === '') {
        (payload as any)[field] = null;
      }
    });

    payload.stops = payload.stops.map(stop => ({
      ...stop,
      scheduledDateTime: stop.scheduledDateTime || undefined,
      actualDateTime: stop.actualDateTime || undefined,
    }));

    delete (payload as any).scheduledPickupDate;
    delete (payload as any).scheduledDeliveryDate;
    delete (payload as any).origin;
    delete (payload as any).destination;

    console.log("[HANDLE SUBMIT] Final payload being sent to API:", JSON.parse(JSON.stringify(payload)));

    onSubmit(payload, payload._id);
  };
  
  const addAccessorial = () => { setFormData(prev => ({ ...prev, accessorials: [...(prev.accessorials || []), { accessorialTypeId: '', name: '', quantity: 1, customerRate: 0, carrierCost: 0 }]})); };
  const removeAccessorial = (index: number) => { setFormData(prev => ({ ...prev, accessorials: prev.accessorials?.filter((_, i) => i !== index)})); };

  const handleAccessorialChange = (index: number, field: keyof QuoteAccessorialForm, value: string | number) => {
    const updatedAccessorials = formData.accessorials?.map((acc, i) => {
        if (i === index) {
            const newAcc = { ...acc, [field]: value };
            if (field === 'accessorialTypeId') {
                const selectedType = accessorialTypesList.find(at => at._id === value);
                newAcc.name = selectedType?.name || 'Custom';
                newAcc.customerRate = selectedType?.defaultCustomerRate ?? newAcc.customerRate;
                newAcc.carrierCost = selectedType?.defaultCarrierCost ?? newAcc.carrierCost;
            }
            return newAcc;
        }
        return acc;
    });
    setFormData(prev => ({ ...prev, accessorials: updatedAccessorials }));
  };

  const calculateTotals = () => {
    const lineHaulCustomer = parseFloat(String(formData.customerRate)) || 0;
    const lineHaulCarrier = parseFloat(String(formData.carrierCostTotal)) || 0;
    const fscCustomerAmount = parseFloat(String(formData.fscCustomerAmount)) || 0;
    const fscCarrierAmount = parseFloat(String(formData.fscCarrierAmount)) || 0;
    const chassisCustomerCost = parseFloat(String(formData.chassisCustomerCost)) || 0;
    const chassisCarrierCost = parseFloat(String(formData.chassisCarrierCost)) || 0;

    let fscCustomerValue = 0;
    if (formData.fscType === 'percentage' && fscCustomerAmount) { fscCustomerValue = lineHaulCustomer * (fscCustomerAmount / 100); }
    else if (formData.fscType === 'fixed' && fscCustomerAmount) { fscCustomerValue = fscCustomerAmount; }

    let fscCarrierValue = 0;
    if (formData.fscType === 'percentage' && fscCarrierAmount) { fscCarrierValue = lineHaulCarrier * (fscCarrierAmount / 100); }
    else if (formData.fscType === 'fixed' && fscCarrierAmount) { fscCarrierValue = fscCarrierAmount; }

    let totalAccessorialsCustomerCost = 0;
    let totalAccessorialsCarrierCost = 0;
    if (Array.isArray(formData.accessorials)) {
        formData.accessorials.forEach((acc: any) => {
            totalAccessorialsCustomerCost += (parseFloat(String(acc.customerRate)) || 0) * (parseFloat(String(acc.quantity)) || 1);
            totalAccessorialsCarrierCost += (parseFloat(String(acc.carrierCost)) || 0) * (parseFloat(String(acc.quantity)) || 1);
        });
    }
    
    const totalCustomerRate = lineHaulCustomer + fscCustomerValue + chassisCustomerCost + totalAccessorialsCustomerCost;
    const totalCarrierCost = lineHaulCarrier + fscCarrierValue + chassisCarrierCost + totalAccessorialsCarrierCost;
    const grossProfit = totalCustomerRate - totalCarrierCost;
    const margin = totalCustomerRate > 0 ? (grossProfit / totalCustomerRate) * 100 : 0;

    return { totalCustomerRate, totalCarrierCost, grossProfit, margin };
  };

  const totals = calculateTotals();
  const isFormLoading = isLoading || isUploading || isLoadingSettings;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { maxHeight: '95vh' } }}>
      <DialogTitle>{formData._id ? `Edit Shipment #${formData.shipmentNumber}` : 'New Shipment'}</DialogTitle>
      <DialogContent dividers>
        
        <Grid container spacing={2}>
          {/* Section 1: Core Info */}
          <Grid item xs={12}><Typography variant="overline">Core Information</Typography><Divider /></Grid>
          <Grid item xs={12} sm={4}><TextField size="small" select fullWidth label="Shipper" name="shipper" value={formData.shipper || ''} onChange={e => setFormData(prev => ({...prev, shipper: e.target.value}))}>{shippersList.map(s => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={4}><TextField size="small" select fullWidth label="Carrier" name="carrier" value={formData.carrier || ''} onChange={e => setFormData(prev => ({...prev, carrier: e.target.value}))}><MenuItem value=""><em>None</em></MenuItem>{carriersList.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={4}><TextField size="small" select fullWidth label="Status" name="status" value={formData.status || ''} onChange={e => setFormData(prev => ({...prev, status: e.target.value as any}))}>{shipmentStatusOptions.filter(s => !s.startsWith('quote')).map(s => <MenuItem key={s} value={s} sx={{textTransform: 'capitalize'}}>{s.replace(/_/g, ' ')}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" select fullWidth label="Mode" name="modeOfTransport" value={formData.modeOfTransport || ''} onChange={e => setFormData(prev => ({...prev, modeOfTransport: e.target.value as any}))}>{modeOfTransportOptions.map(m => <MenuItem key={m} value={m} sx={{textTransform: 'capitalize'}}>{m.replace(/-/g, ' ')}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" select fullWidth label="Equipment" name="equipmentType" value={formData.equipmentType || ''} onChange={handleInputChange}>{equipmentTypesList.map(eq => <MenuItem key={eq._id} value={eq.name}>{eq.name}</MenuItem>)}</TextField></Grid>

          {/* Section 2: Locations & Dates */}
          <Grid item xs={12}><Typography variant="overline" sx={{mt:2}}>Locations & Stops</Typography><Divider /></Grid>
          {formData.stops.map((stop, index) => (
               <Grid item xs={12} md={6} key={`stop-${index}`}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">Stop {index + 1}</Typography>
                        <IconButton onClick={() => handleRemoveStop(index)} size="small" color="error" disabled={formData.stops.length <= 1}><RemoveIcon /></IconButton>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="Stop Type" value={stop.stopType || ''} onChange={(e) => handleStopChange(index, 'stopType', e.target.value)}>{locationTypeOptions.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}</TextField></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Location Name" value={stop.name || ''} onChange={(e) => handleStopChange(index, 'name', e.target.value)} /></Grid>
                        <Grid item xs={12}><TextField fullWidth size="small" label="Address" value={stop.address || ''} onChange={(e) => handleStopChange(index, 'address', e.target.value)} /></Grid>
                        <Grid item xs={12} sm={5}><TextField fullWidth size="small" label="City" value={stop.city || ''} onChange={(e) => handleStopChange(index, 'city', e.target.value)} /></Grid>
                        <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="State" value={stop.state || ''} onChange={(e) => handleStopChange(index, 'state', e.target.value)} /></Grid>
                        <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Zip" value={stop.zip || ''} onChange={(e) => handleStopChange(index, 'zip', e.target.value)} /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Contact Name" value={stop.contactName || ''} onChange={(e) => handleStopChange(index, 'contactName', e.target.value)} /></Grid>
                        <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Contact Phone" value={stop.contactPhone || ''} onChange={(e) => handleStopChange(index, 'contactPhone', e.target.value)} /></Grid>
                        <Grid item xs={12}>
                            {/* --- FIX: Ensure value is bound with || '' for erasability --- */}
                            <TextField size="small" fullWidth label="Appointment Date/Time" type="datetime-local" value={stop.scheduledDateTime || ''} onChange={(e) => handleStopChange(index, 'scheduledDateTime', e.target.value)} InputLabelProps={{ shrink: true }} />
                        </Grid>
                      </Grid>
                  </Paper>
              </Grid>
          ))}
          <Grid item xs={12}><Button startIcon={<AddIcon />} onClick={handleAddStop} size="small">Add Stop</Button></Grid>

          {/* Key Dates Section */}
          <Grid item xs={12}><Typography variant="overline" sx={{mt:2}}>Key Dates</Typography><Divider /></Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField size="small" fullWidth label="ETA" name="eta" type="date"
              value={formData.eta || ''} onChange={handleInputChange} InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField size="small" fullWidth label="Pulled Date" name="pulledDate" type="date"
              value={formData.pulledDate || ''} onChange={handleInputChange} InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField size="small" fullWidth label="Ingated Date" name="ingatedDate" type="date"
              value={formData.ingatedDate || ''} onChange={handleInputChange} InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField size="small" fullWidth label="ERD / Cutoff" name="erdCutoffDate" type="date"
              value={formData.erdCutoffDate || ''} onChange={handleInputChange} InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          {/* Section 3: Reference Numbers */}
          <Grid item xs={12}><Typography variant="overline" sx={{mt:2}}>Reference Numbers</Typography><Divider /></Grid>
          <Grid item xs={12} sm={4} md={3}><TextField size="small" fullWidth label="PRO #" name="proNumber" value={formData.proNumber || ''} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={4} md={3}><TextField size="small" fullWidth label="BOL #" name="billOfLadingNumber" value={formData.billOfLadingNumber || ''} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={4} md={3}><TextField size="small" fullWidth label="Booking #" name="bookingNumber" value={formData.bookingNumber || ''} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={4} md={3}><TextField size="small" fullWidth label="Container #" name="containerNumber" value={formData.containerNumber || ''} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={4} md={3}><TextField size="small" fullWidth label="SSL/Airline" name="steamshipLine" value={formData.steamshipLine || ''} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={4} md={3}><TextField size="small" fullWidth label="PO/Customer Ref #" name="purchaseOrderNumbers" value={formData.purchaseOrderNumbers || ''} onChange={handleInputChange} /></Grid>

          {/* Section 4: Freight Details */}
          <Grid item xs={12}><Typography variant="overline" sx={{mt:2}}>Freight Details</Typography><Divider /></Grid>
          <Grid item xs={12}><TextField size="small" fullWidth label="Commodity Description" name="commodityDescription" value={formData.commodityDescription || ''} onChange={handleInputChange} /></Grid>
          <Grid item xs={6} sm={3} md={2}><TextField size="small" fullWidth label="Piece Count" name="pieceCount" type="number" value={formData.pieceCount || ''} onChange={handleInputChange} /></Grid>
          <Grid item xs={6} sm={3} md={2}><TextField size="small" fullWidth label="Package Type" name="packageType" value={formData.packageType || ''} onChange={handleInputChange} /></Grid>
          <Grid item xs={12} sm={6} md={4}>
              <Box display="flex" alignItems="center" gap={1} width="100%">
                <TextField size="small" fullWidth label="Total Weight" name="totalWeight" type="number" value={formData.totalWeight || ''} onChange={handleInputChange}/>
                <TextField size="small" select sx={{ minWidth: 80 }} label="Unit" name="weightUnit" value={formData.weightUnit || 'lbs'} onChange={handleInputChange}>
                  {weightUnitOptions.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </TextField>
                {formData.totalWeight && formData.weightUnit && (<Typography variant="caption" sx={{ whiteSpace: 'nowrap', ml: 1 }}>≈ {convertWeight(formData.totalWeight, formData.weightUnit)} {formData.weightUnit === 'lbs' ? 'kg' : 'lbs'}</Typography>)}
              </Box>
          </Grid>
          <Grid item xs={12} sm={4} md={4}><TextField size="small" fullWidth label="Dimensions (LxWxH)" name="dimensions" helperText="e.g., 48x40x96 in" /></Grid>
          <Grid item xs={12} sm={4} md={2}><FormControlLabel control={<Checkbox checked={formData.isHazardous} onChange={handleInputChange} name="isHazardous" />} label="Hazardous" /></Grid>
          <Grid item xs={12} sm={4} md={3}><TextField size="small" fullWidth label="UN Number" name="unNumber" value={formData.unNumber || ''} onChange={handleInputChange} disabled={!formData.isHazardous} /></Grid>
          <Grid item xs={12} sm={4} md={3}><TextField size="small" fullWidth label="Hazmat Class" name="hazmatClass" value={formData.hazmatClass || ''} onChange={handleInputChange} disabled={!formData.isHazardous} /></Grid>
          <Grid item xs={12} sm={4} md={2}><FormControlLabel control={<Checkbox checked={formData.isTemperatureControlled} onChange={handleInputChange} name="isTemperatureControlled" />} label="Temp Control" /></Grid>
          <Grid item xs={6} sm={3} md={2}><TextField size="small" fullWidth label="Min Temp" name="temperatureMin" type="number" value={formData.temperatureMin || ''} onChange={handleInputChange} disabled={!formData.isTemperatureControlled} /></Grid>
          <Grid item xs={6} sm={3} md={2}><TextField size="small" fullWidth label="Max Temp" name="temperatureMax" type="number" value={formData.temperatureMax || ''} onChange={handleInputChange} disabled={!formData.isTemperatureControlled} /></Grid>
          <Grid item xs={12} sm={4} md={2}>
              <TextField size="small" select fullWidth label="Temp Unit" name="tempUnit" value={formData.tempUnit || 'F'} onChange={handleInputChange} disabled={!formData.isTemperatureControlled}>
                <MenuItem value="C">°C</MenuItem><MenuItem value="F">°F</MenuItem>
              </TextField>
          </Grid>
          
          {/* Section 5: Financials */}
          <Grid item xs={12}><Typography variant="overline" sx={{mt:2}}>Financials</Typography><Divider /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Line Haul (Customer Rate)" name="customerRate" type="number" value={formData.customerRate || ''} onChange={handleInputChange} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Line Haul (Carrier Cost)" name="carrierCostTotal" type="number" value={formData.carrierCostTotal || ''} onChange={handleInputChange} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}} /></Grid>
          <Grid item xs={12} sm={4}><TextField select fullWidth size="small" label="FSC Type" name="fscType" value={formData.fscType || ''} onChange={e => handleSelectChange('fscType', e.target.value as any)} ><MenuItem value=""><em>None</em></MenuItem><MenuItem value="fixed">Fixed</MenuItem><MenuItem value="percentage">Percentage</MenuItem></TextField></Grid>
          <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="FSC Customer" name="fscCustomerAmount" type="number" value={formData.fscCustomerAmount || ''} onChange={handleInputChange} disabled={!formData.fscType} /></Grid>
          <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="FSC Carrier" name="fscCarrierAmount" type="number" value={formData.fscCarrierAmount || ''} onChange={handleInputChange} disabled={!formData.fscType} /></Grid>
          {formData.accessorials?.map((acc, index) => (
            <React.Fragment key={`acc-frag-${index}`}>
              <Grid item xs={12} sm={5} md={3}><Autocomplete size="small" options={accessorialTypesList} getOptionLabel={(option) => option.name || ''} value={accessorialTypesList.find(opt => opt._id === acc.accessorialTypeId) || null} onChange={(event, newValue) => { handleAccessorialChange(index, 'accessorialTypeId', newValue ? newValue._id : ''); }} isOptionEqualToValue={(option, value) => option._id === value?._id} renderInput={(params) => <TextField {...params} label="Accessorial Type" />} /></Grid>
              <Grid item xs={4} sm={2} md={1.5}><TextField size="small" fullWidth label="Qty" name={`accQty${index}`} type="number" value={acc.quantity} onChange={(e) => handleAccessorialChange(index, 'quantity', e.target.value)} /></Grid>
              <Grid item xs={4} sm={2} md={2}><TextField size="small" fullWidth label="Rate" name={`accRate${index}`} type="number" value={acc.customerRate} onChange={(e) => handleAccessorialChange(index, 'customerRate', e.target.value)} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}} /></Grid>
              <Grid item xs={4} sm={2} md={2}><TextField size="small" fullWidth label="Cost" name={`accCost${index}`} type="number" value={acc.carrierCost} onChange={(e) => handleAccessorialChange(index, 'carrierCost', e.target.value)} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}} /></Grid>
              <Grid item xs={10} sm={5} md={2.5}><TextField size="small" fullWidth label="Notes" name={`accNotes${index}`} value={acc.notes || ''} onChange={(e) => handleAccessorialChange(index, 'notes', e.target.value)} /></Grid>
              <Grid item xs={2} sm={1} md={1} sx={{display: 'flex', alignItems: 'center'}}><IconButton onClick={() => removeAccessorial(index)} size="small" color="error"><RemoveIcon /></IconButton></Grid>
            </React.Fragment>
          ))}
          <Grid item xs={12}><Button startIcon={<AddIcon />} onClick={addAccessorial} size="small">Add Accessorial</Button></Grid>
          <Grid item xs={12}><Divider sx={{my:1.5}}/></Grid>
          <Grid item xs={12} sm={3}><Typography variant="subtitle1">Total Customer: {formatCurrency(totals.totalCustomerRate)}</Typography></Grid>
          <Grid item xs={12} sm={3}><Typography variant="subtitle1">Total Carrier: {formatCurrency(totals.totalCarrierCost)}</Typography></Grid>
          <Grid item xs={12} sm={3}><Typography variant="subtitle1" color={totals.grossProfit >= 0 ? "green" : "error"}>Profit: {formatCurrency(totals.grossProfit)}</Typography></Grid>
          <Grid item xs={12} sm={3}><Typography variant="subtitle1" color={totals.margin >= 0 ? "green" : "error"}>Margin: {totals.margin.toFixed(2)}%</Typography></Grid>

          {/* Section 6: Notes & Documents */}
          <Grid item xs={12}><Typography variant="overline" sx={{mt:2}}>Notes & Documents</Typography><Divider /></Grid>
          <Grid item xs={12}><TextField size="small" fullWidth label="Internal Notes" name="internalNotes" value={formData.internalNotes || ''} onChange={handleInputChange} multiline minRows={2} /></Grid>
          <Grid item xs={12}><TextField size="small" fullWidth label="Special Instructions (for carrier)" name="specialInstructions" value={formData.specialInstructions || ''} onChange={handleInputChange} multiline minRows={2} /></Grid>
          
          {/* --- FIX 2: Added the file upload JSX --- */}
          {formData.attachedDocuments && formData.attachedDocuments.length > 0 && (
            <Grid item xs={12}> <Typography variant="subtitle2">Attached Documents:</Typography> <List dense>
                {formData.attachedDocuments.map(doc => (
                    <ListItem key={doc._id} secondaryAction={<Tooltip title="Remove Staged Document"><IconButton edge="end" onClick={() => handleRemoveStagedFile(doc._id)}><DeleteDocIcon /></IconButton></Tooltip>}>
                        <ListItemIcon><DocumentFileIcon /></ListItemIcon>
                        <ListItemText primary={<Link href={documentAPI.download(doc._id)} target="_blank" rel="noopener noreferrer">{doc.originalName}</Link>} secondary={`${formatFileSize(doc.size || 0)}`} />
                    </ListItem> 
                ))} 
            </List> </Grid> 
          )}
          <Grid item xs={12}>
            <Paper {...getRootProps()} variant="outlined" sx={{ p: 2, mt:1, textAlign: 'center', cursor: 'pointer', border: isDragActive ? '2px dashed primary.main' : '2px dashed grey.500', backgroundColor: isDragActive ? 'action.hover' : 'transparent'}}>
                <input {...getInputProps()} /> <UploadIcon sx={{fontSize: 30, color: 'text.secondary'}}/>
                {isDragActive ? <Typography>Drop files here...</Typography> : <Typography>Drag 'n' drop files, or click to select</Typography>}
            </Paper>
            {filesToUpload.length > 0 && ( 
              <Box mt={1}> 
                <Typography variant="caption">New files to upload:</Typography> 
                <List dense disablePadding> 
                  {filesToUpload.map((file, index) => ( 
                    <ListItem dense disableGutters key={`${file.name}-${index}`} secondaryAction={<IconButton size="small" onClick={() => setFilesToUpload(prev => prev.filter((_, i) => i !== index))}><DeleteDocIcon fontSize="small"/></IconButton>}> 
                      <ListItemIcon sx={{minWidth: 30}}><AttachFileIcon fontSize="small"/></ListItemIcon> 
                      <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(1)} KB`} /> 
                    </ListItem> 
                  ))} 
                </List> 
                <Button size="small" variant="outlined" onClick={handleUploadAndStage} sx={{mt:1}} disabled={isUploading}> 
                  {isUploading ? <CircularProgress size={20}/> : 'Upload & Stage Files'} 
                </Button> 
              </Box> 
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isFormLoading}>
          {isFormLoading ? <CircularProgress size={24} /> : (formData._id ? 'Update Shipment' : 'Save Shipment')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShipmentFormDialog;