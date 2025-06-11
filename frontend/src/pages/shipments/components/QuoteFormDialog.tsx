import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Grid, TextField, MenuItem, Typography, Divider, CircularProgress, IconButton, Box, Paper, Autocomplete, Link,
  List, ListItem, ListItemIcon, ListItemText, InputAdornment, Tooltip, Checkbox, FormControlLabel
} from '@mui/material';
import {
  AddCircleOutline as AddIcon, RemoveCircleOutline as RemoveIcon,
  AttachFile as AttachFileIcon, DeleteOutline as DeleteDocIcon, CloudUpload as UploadIcon,
  Article as DocumentFileIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { lookupAPI, documentAPI } from '../../../services/api';
import { toast } from 'react-toastify';
import { useQuery } from 'react-query';
import { IStop, initialQuoteFormData } from '../utils/shipmentFormMappers';
import { modeOfTransportOptions, locationTypeOptions } from '../constants/shipmentOptions';

// Type Definitions
interface ShipperStub { _id: string; name: string; }
interface CarrierStub { _id:string; name: string; }
interface EquipmentTypeOption { _id: string; name: string; }
interface AccessorialTypeOption { _id: string; name: string; defaultCustomerRate?: number; defaultCarrierCost?: number; }
export interface QuoteAccessorialForm { _id?: string; accessorialTypeId: string; name?: string; quantity: number; customerRate: number; carrierCost: number; notes?: string; }
export interface IDocumentStubFE { _id: string; originalName: string; size?: number; mimetype?: string; path?: string; createdAt?: string; }
export interface QuoteFormData {
  _id?: string; quoteNumber?: string; status: 'quote'; shipper: string; carrier?: string;
  modeOfTransport: string; equipmentType: string;
  stops: IStop[];
  commodityDescription: string; totalWeight?: string; pieceCount?: string;
  customerRate: string; carrierCostTotal: string;
  fscType?: 'fixed' | 'percentage' | ''; fscCustomerAmount?: string; fscCarrierAmount?: string;
  chassisCustomerCost?: string; chassisCarrierCost?: string;
  accessorials: QuoteAccessorialForm[];
  quoteNotes?: string; quoteValidUntil?: string; purchaseOrderNumbers?: string;
  documentIds?: string[]; attachedDocuments?: IDocumentStubFE[];
}

interface QuoteFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: QuoteFormData, id?: string) => void;
  initialData?: QuoteFormData | null;
  isLoading: boolean;
  shippersList: ShipperStub[]; isLoadingShippers: boolean;
  carriersList: CarrierStub[]; isLoadingCarriers: boolean;
  equipmentTypesList: EquipmentTypeOption[]; isLoadingEquipmentTypes: boolean;
}

const stopTypeOptions = ['Pickup', 'Load', 'Port', 'Rail Ramp', 'Consignee'];

const formatFileSize = (bytes: number = 0): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const QuoteFormDialog: React.FC<QuoteFormDialogProps> = ({
  open, onClose, onSubmit, initialData, isLoading,
  shippersList, isLoadingShippers, carriersList, isLoadingCarriers, equipmentTypesList,
}) => {
  const [formData, setFormData] = useState<QuoteFormData>(initialQuoteFormData);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: accessorialTypesResponse, isLoading: isLoadingAccessorialTypes } = useQuery(
    ['accessorialTypesLookup', formData.modeOfTransport],
    () => lookupAPI.getAccessorialTypes({ mode: formData.modeOfTransport }),
    { enabled: !!formData.modeOfTransport && open }
  );
  const accessorialTypesList: AccessorialTypeOption[] = accessorialTypesResponse?.data?.data?.accessorialTypes || [];

  useEffect(() => {
    if (open) {
      // Ensure that even if initialData is null, we fall back to a valid structure
      const data = initialData || initialQuoteFormData;
      setFormData({
        ...data,
        stops: (data.stops && data.stops.length > 0) ? data.stops : initialQuoteFormData.stops,
        accessorials: data.accessorials || [],
        documentIds: data.documentIds || [],
        attachedDocuments: data.attachedDocuments || [],
      });
      setFilesToUpload([]);
    }
  }, [initialData, open]);


  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof QuoteFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStopChange = (index: number, field: keyof IStop, value: any) => {
    const newStops = [...formData.stops];
    newStops[index] = { ...newStops[index], [field]: value };
    setFormData(prev => ({ ...prev, stops: newStops }));
  };

  const handleLaneCheckboxChange = (index: number, type: 'origin' | 'destination') => {
    const newStops = formData.stops.map((stop, i) => {
      if (type === 'origin') {
        return { ...stop, isLaneOrigin: i === index };
      }
      if (type === 'destination') {
        return { ...stop, isLaneDestination: i === index };
      }
      return stop;
    });
    setFormData(prev => ({ ...prev, stops: newStops }));
  };

  const handleAddStop = () => {
    setFormData(prev => ({
      ...prev,
      stops: [...prev.stops, { stopType: 'Dropoff', city: '', state: '', zip: '' }]
    }));
  };

  const handleRemoveStop = (index: number) => {
    if (formData.stops.length <= 2) {
      toast.warn("A quote must have at least a pickup and a dropoff.");
      return;
    }
    setFormData(prev => ({ ...prev, stops: prev.stops.filter((_, i) => i !== index) }));
  };

  const handleAccessorialChange = (index: number, field: keyof QuoteAccessorialForm, value: string | number) => {
    const updatedAccessorials = formData.accessorials.map((acc, i) => {
        if (i === index) {
            const newAcc = { ...acc, [field]: field.endsWith('Rate') || field.endsWith('Cost') || field === 'quantity' ? parseFloat(String(value)) || 0 : value };
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

  const addAccessorial = () => { setFormData(prev => ({ ...prev, accessorials: [...prev.accessorials, { accessorialTypeId: '', name: '', quantity: 1, customerRate: 0, carrierCost: 0 }]})); };
  const removeAccessorial = (index: number) => { setFormData(prev => ({ ...prev, accessorials: prev.accessorials.filter((_, i) => i !== index)})); };

  const calculateTotals = () => {
    let lineHaulCustomer = parseFloat(formData.customerRate) || 0;
    let lineHaulCarrier = parseFloat(formData.carrierCostTotal) || 0;
    let fscCustomerValue = 0, fscCarrierValue = 0;
    if (formData.fscType && formData.fscCustomerAmount) {
      const fscAmount = parseFloat(formData.fscCustomerAmount) || 0;
      fscCustomerValue = formData.fscType === 'percentage' ? lineHaulCustomer * (fscAmount / 100) : fscAmount;
    }
    if (formData.fscType && formData.fscCarrierAmount) {
      const fscAmount = parseFloat(formData.fscCarrierAmount) || 0;
      fscCarrierValue = formData.fscType === 'percentage' ? lineHaulCarrier * (fscAmount / 100) : fscAmount;
    }
    const chassisCustomerValue = parseFloat(formData.chassisCustomerCost || '0') || 0;
    const chassisCarrierValue = parseFloat(formData.chassisCarrierCost || '0') || 0;
    let totalCustomer = lineHaulCustomer + fscCustomerValue + chassisCustomerValue;
    let totalCarrier = lineHaulCarrier + fscCarrierValue + chassisCarrierValue;
    formData.accessorials.forEach(acc => {
      totalCustomer += (acc.customerRate || 0) * (acc.quantity || 1);
      totalCarrier += (acc.carrierCost || 0) * (acc.quantity || 1);
    });
    const profit = totalCustomer - totalCarrier;
    const margin = totalCustomer > 0 ? (profit / totalCustomer) * 100 : 0;
    return { totalCustomer, totalCarrier, profit, margin };
  };
  const totals = calculateTotals();

  const onDrop = useCallback((acceptedFiles: File[]) => { setFilesToUpload(prevFiles => [...prevFiles, ...acceptedFiles]); }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });
  
  const handleUploadNewFiles = async () => {
    if (filesToUpload.length === 0) { toast.warn("No new files selected."); return; }
    setIsUploading(true);
    const uploadFormDataAPI = new FormData();
    filesToUpload.forEach(file => uploadFormDataAPI.append('files', file));
    try {
      const response = await documentAPI.upload(uploadFormDataAPI);
      setFormData(prev => ({
        ...prev,
        documentIds: [...(prev.documentIds || []), ...response.data.data.map((d: any) => d._id)],
        attachedDocuments: [...(prev.attachedDocuments || []), ...response.data.data]
      }));
      toast.success(`${response.data.data.length} file(s) uploaded and staged.`);
      setFilesToUpload([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error uploading files.");
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
    onSubmit(formData, formData._id);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
      <DialogTitle>{formData._id ? `Edit Quote #${formData.quoteNumber}` : 'New Quote'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.1 }}>
          <Grid item xs={12}><Typography variant="overline">Quote Details</Typography><Divider /></Grid>
          <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="Shipper" name="shipper" value={formData.shipper} onChange={(e)=>handleSelectChange('shipper', e.target.value)} disabled={isLoading}>
              {shippersList.map(s => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
          </TextField></Grid>
          <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="Carrier (Optional)" name="carrier" value={formData.carrier || ''} onChange={(e)=>handleSelectChange('carrier', e.target.value)} disabled={isLoading}>
              <MenuItem value=""><em>None Selected</em></MenuItem>
              {carriersList.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
          </TextField></Grid>
          <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="Mode of Transport" name="modeOfTransport" value={formData.modeOfTransport} onChange={(e) => handleSelectChange('modeOfTransport', e.target.value as any)}>
              {modeOfTransportOptions.map(mode => <MenuItem key={mode} value={mode} sx={{textTransform: 'capitalize'}}>{mode.replace(/-/g, ' ')}</MenuItem>)}
          </TextField></Grid>
          <Grid item xs={12} sm={6}><TextField select fullWidth size="small" label="Equipment Type" name="equipmentType" value={formData.equipmentType} onChange={(e) => handleSelectChange('equipmentType', e.target.value)} disabled={isLoading}>
              {equipmentTypesList.map(eq => <MenuItem key={eq._id} value={eq.name}>{eq.name}</MenuItem>)}
          </TextField></Grid>

          <Grid item xs={12}><Typography variant="overline" sx={{mt:1}}>Route & Stops</Typography><Divider /></Grid>
          {formData.stops.map((stop, index) => (
            <Grid item xs={12} container spacing={1} key={`stop-${index}`} component={Paper} sx={{p: 2, mb: 2, ml: 2, width: 'calc(100% - 16px)'}} variant="outlined">
                <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Stop {index + 1}</Typography>
                    <Box>
                      <FormControlLabel label="Lane Origin" control={<Checkbox checked={!!stop.isLaneOrigin} onChange={() => handleLaneCheckboxChange(index, 'origin')} />} />
                      <FormControlLabel label="Lane Dest." control={<Checkbox checked={!!stop.isLaneDestination} onChange={() => handleLaneCheckboxChange(index, 'destination')} />} />
                      {formData.stops.length > 2 && <IconButton onClick={() => handleRemoveStop(index)} size="small" color="error"><RemoveIcon /></IconButton>}
                    </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}><TextField select fullWidth size="small" label="Stop Type" value={stop.stopType} onChange={(e) => handleStopChange(index, 'stopType', e.target.value)}>
                    {stopTypeOptions.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                </TextField></Grid>
                <Grid item xs={12} sm={6} md={8}><TextField fullWidth size="small" label="Location Name" value={stop.name || ''} onChange={(e) => handleStopChange(index, 'name', e.target.value)} /></Grid>
                <Grid item xs={12}><TextField fullWidth size="small" label="Address" value={stop.address || ''} onChange={(e) => handleStopChange(index, 'address', e.target.value)} /></Grid>
                <Grid item xs={12} sm={5}><TextField fullWidth size="small" label="City" value={stop.city || ''} onChange={(e) => handleStopChange(index, 'city', e.target.value)} /></Grid>
                <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="State" value={stop.state || ''} onChange={(e) => handleStopChange(index, 'state', e.target.value)} /></Grid>
                <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Zip" value={stop.zip || ''} onChange={(e) => handleStopChange(index, 'zip', e.target.value)} /></Grid>
                <Grid item xs={12}><TextField size="small" fullWidth label="Appointment Date/Time" name="scheduledDateTime" type="datetime-local" value={stop.scheduledDateTime || ''} onChange={(e) => handleStopChange(index, 'scheduledDateTime', e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
            </Grid>
          ))}
          <Grid item xs={12}><Button startIcon={<AddIcon />} onClick={handleAddStop} size="small">Add Stop</Button></Grid>

          <Grid item xs={12}><Typography variant="overline" sx={{mt:1}}>Freight & Dates</Typography><Divider /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Quote Valid Until" name="quoteValidUntil" type="date" value={formData.quoteValidUntil} onChange={handleInputChange} InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="PO Number(s)" name="purchaseOrderNumbers" value={formData.purchaseOrderNumbers || ''} onChange={handleInputChange} /></Grid>
          <Grid item xs={12}><TextField size="small" fullWidth label="Commodity Description" name="commodityDescription" value={formData.commodityDescription} onChange={handleInputChange} /></Grid>

          <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Charges & Costs</Typography><Divider/></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Line Haul (Customer Rate)" name="customerRate" type="number" value={formData.customerRate} onChange={handleInputChange} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Line Haul (Carrier Cost)" name="carrierCostTotal" type="number" value={formData.carrierCostTotal} onChange={handleInputChange} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}} /></Grid>
          
          <Grid item xs={12} sm={4}><TextField select fullWidth size="small" label="FSC Type" name="fscType" value={formData.fscType || ''} onChange={(e) => handleSelectChange('fscType', e.target.value as any)} >
              <MenuItem value=""><em>None</em></MenuItem> <MenuItem value="fixed">Fixed Amount</MenuItem> <MenuItem value="percentage">Percentage</MenuItem>
            </TextField></Grid>
          <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="FSC Customer" name="fscCustomerAmount" type="number" value={formData.fscCustomerAmount || ''} onChange={handleInputChange} disabled={!formData.fscType} /></Grid>
          <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="FSC Carrier" name="fscCarrierAmount" type="number" value={formData.fscCarrierAmount || ''} onChange={handleInputChange} disabled={!formData.fscType} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Chassis Customer Cost" name="chassisCustomerCost" type="number" value={formData.chassisCustomerCost || ''} onChange={handleInputChange} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Chassis Carrier Cost" name="chassisCarrierCost" type="number" value={formData.chassisCarrierCost || ''} onChange={handleInputChange} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}} /></Grid>

          <Grid item xs={12}><Typography variant="subtitle2" sx={{mt:1}}>Accessorials</Typography></Grid>
          {formData.accessorials.map((acc, index) => (
            <React.Fragment key={`acc-frag-${index}`}>
              <Grid item xs={12} sm={5} md={3}><Autocomplete size="small" options={accessorialTypesList} getOptionLabel={(option) => option.name || ''} value={accessorialTypesList.find(opt => opt._id === acc.accessorialTypeId) || null} onChange={(event, newValue) => { handleAccessorialChange(index, 'accessorialTypeId', newValue ? newValue._id : ''); }} isOptionEqualToValue={(option, value) => option._id === value?._id} renderInput={(params) => <TextField {...params} label="Accessorial Type" variant="outlined" />} /></Grid>
              <Grid item xs={4} sm={2} md={1.5}><TextField size="small" fullWidth label="Qty" name={`accQty${index}`} type="number" value={acc.quantity} onChange={(e) => handleAccessorialChange(index, 'quantity', e.target.value)} /></Grid>
              <Grid item xs={4} sm={2} md={2}><TextField size="small" fullWidth label="Rate" name={`accRate${index}`} type="number" value={acc.customerRate} onChange={(e) => handleAccessorialChange(index, 'customerRate', e.target.value)} /></Grid>
              <Grid item xs={4} sm={2} md={2}><TextField size="small" fullWidth label="Cost" name={`accCost${index}`} type="number" value={acc.carrierCost} onChange={(e) => handleAccessorialChange(index, 'carrierCost', e.target.value)} /></Grid>
              <Grid item xs={10} sm={5} md={2.5}><TextField size="small" fullWidth label="Notes" name={`accNotes${index}`} value={acc.notes || ''} onChange={(e) => handleAccessorialChange(index, 'notes', e.target.value)} /></Grid>
              <Grid item xs={2} sm={1} md={1}><IconButton onClick={() => removeAccessorial(index)} size="small" color="error"><RemoveIcon /></IconButton></Grid>
            </React.Fragment>
          ))}
          <Grid item xs={12}><Button startIcon={<AddIcon />} onClick={addAccessorial} size="small">Add Accessorial</Button></Grid>

          <Grid item xs={12}><Divider sx={{my:1.5}}/></Grid>
          <Grid item xs={12} sm={3}><Typography variant="subtitle1">Total Quoted: ${totals.totalCustomer.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</Typography></Grid>
          <Grid item xs={12} sm={3}><Typography variant="subtitle1">Total Est. Cost: ${totals.totalCarrier.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</Typography></Grid>
          <Grid item xs={12} sm={3}><Typography variant="subtitle1" color={totals.profit >= 0 ? "green" : "error"}>Est. Profit: ${totals.profit.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</Typography></Grid>
          <Grid item xs={12} sm={3}><Typography variant="subtitle1" color={totals.margin >= 0 ? "green" : "error"}>Est. Margin: {totals.margin.toFixed(2)}%</Typography></Grid>
        
          <Grid item xs={12}><TextField size="small" fullWidth label="Quote Notes" name="quoteNotes" value={formData.quoteNotes || ''} onChange={handleInputChange} multiline minRows={2} /></Grid>
        
          <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Attach Documents</Typography><Divider/></Grid>
            {formData.attachedDocuments && formData.attachedDocuments.length > 0 && (
            <Grid item xs={12}> <Typography variant="subtitle2">Staged Documents:</Typography> <List dense>
                {formData.attachedDocuments.map(doc => ( <ListItem key={doc._id} secondaryAction={<Tooltip title="Remove"><IconButton edge="end" onClick={() => handleRemoveStagedFile(doc._id)}><DeleteDocIcon /></IconButton></Tooltip>}> <ListItemIcon><DocumentFileIcon /></ListItemIcon> <ListItemText primary={<Link href={documentAPI.download(doc._id)} target="_blank" rel="noopener noreferrer">{doc.originalName}</Link>} secondary={`${formatFileSize(doc.size || 0)}`} /> </ListItem> ))} </List> </Grid> )}
            <Grid item xs={12}>
            <Paper {...getRootProps()} variant="outlined" sx={{ p: 2, mt:1, textAlign: 'center', cursor: 'pointer', border: isDragActive ? '2px dashed primary.main' : '2px dashed grey.500', backgroundColor: isDragActive ? 'action.hover' : 'transparent'}}>
                <input {...getInputProps()} /> <UploadIcon sx={{fontSize: 30, color: 'text.secondary'}}/>
                {isDragActive ? <Typography>Drop files here...</Typography> : <Typography>Drag 'n' drop files, or click to select</Typography>}
            </Paper>
            {filesToUpload.length > 0 && ( <Box mt={1}> <Typography variant="caption">Selected files to upload:</Typography> <List dense disablePadding> {filesToUpload.map((file, index) => ( <ListItem dense disableGutters key={`${file.name}-${index}`} secondaryAction={<IconButton size="small" onClick={() => setFilesToUpload(prev => prev.filter((_, i) => i !== index))}><DeleteDocIcon fontSize="small"/></IconButton>}> <ListItemIcon sx={{minWidth: 30}}><AttachFileIcon fontSize="small"/></ListItemIcon> <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(1)} KB`} /> </ListItem> ))} </List> <Button size="small" variant="outlined" onClick={handleUploadNewFiles} sx={{mt:1}} disabled={isUploading}> {isUploading ? <CircularProgress size={20}/> : 'Upload Selected & Stage'} </Button> </Box> )} </Grid>
        
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : (formData._id ? 'Update Quote' : 'Save Quote')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuoteFormDialog;