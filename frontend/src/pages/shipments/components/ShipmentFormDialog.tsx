import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Grid, TextField, MenuItem, Checkbox, FormControlLabel,
  Typography, Divider, CircularProgress, InputAdornment,
  Box, List, ListItem, ListItemText, ListItemIcon, IconButton, Paper, Link, Alert
} from '@mui/material';
import {
  AttachFile as AttachFileIcon, DeleteOutline as DeleteDocIcon, CloudUpload as UploadIcon,
  Article as DocumentFileIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { documentAPI, settingsAPI } from '../../../services/api';
import { toast } from 'react-toastify';
import { useQuery } from 'react-query';

import { 
    initialShipmentFormData as dialogInitialShipmentFormData, 
    ShipmentFormDataForDialog,
    IDocumentStubFE
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

// Helper for automatic weight unit conversion
const convertWeight = (value: number, fromUnit: string): number => {
  if (fromUnit === 'KG') return +(value * 2.20462).toFixed(2);
  if (fromUnit === 'LBS') return +(value / 2.20462).toFixed(2);
  return value;
};

const getFieldValue = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const ShipmentFormDialog: React.FC<ShipmentFormDialogProps> = ({
  open, onClose, onSubmit, initialData, isLoading,
  shippersList, isLoadingShippers, carriersList, isLoadingCarriers,
  equipmentTypesList, isLoadingEquipmentTypes
}) => {
  const [formData, setFormData] = useState<ShipmentFormDataForDialog>(dialogInitialShipmentFormData);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { 
    data: shipmentSettings, 
    isLoading: isLoadingSettings,
    isError: isErrorSettings
  } = useQuery<ShipmentFormSettings>(
    'shipmentFormSettings', 
    () => settingsAPI.getShipmentFormSettings().then(res => res.data.data),
    { enabled: open }
  );

  useEffect(() => {
    if (open) {
      if (initialData) {
        const documentIds = initialData.documentIds || [];
        const attachedDocuments = initialData.attachedDocuments || [];
        // Extract Pickup and Dropoff stops
        const pickupStop = initialData?.stops?.find((s: any) => s.stopType === 'Pickup') || {};
        const dropoffStop = initialData?.stops?.find((s: any) => s.stopType === 'Dropoff') || {};

        setFormData((prev) => ({
          ...prev,
          ...initialData,
          originAddress: pickupStop.address || '',
          originCity: pickupStop.city || '',
          originState: pickupStop.state || '',
          originZip: pickupStop.zip || '',
          originCountry: pickupStop.country || '',
          originName: pickupStop?.name ?? '',
          originNotes: pickupStop.notes || '',
          originContactName: pickupStop.contactName || '',
          originContactPhone: pickupStop.contactPhone || '',
          originLocationType: pickupStop.stopType || '',
          destinationAddress: dropoffStop.address || '',
          destinationCity: dropoffStop.city || '',
          destinationState: dropoffStop.state || '',
          destinationZip: dropoffStop.zip || '',
          destinationCountry: dropoffStop.country || '',
          destinationName: dropoffStop?.name ?? '',
          destinationNotes: dropoffStop.notes || '',
          destinationContactName: dropoffStop.contactName || '',
          destinationContactPhone: dropoffStop.contactPhone || '',
          destinationLocationType: dropoffStop.stopType || ''
        }));
      } else {
        setFormData({
          ...dialogInitialShipmentFormData,
          status: 'booked',
          equipmentType: equipmentTypesList.length ? equipmentTypesList[0].name : '',
          shipper: shippersList.length ? shippersList[0]._id : '',
          carrier: carriersList.length ? carriersList[0]._id : ''
        });
      }
      setFilesToUpload([]);
    }
  }, [initialData, open]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = event.target;
    const name = target.name;
    let value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;

    if (target.type === 'date') {
      value = value || ''; // Allow clearing of date fields
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof ShipmentFormDataForDialog, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => { setFilesToUpload(prevFiles => [...prevFiles, ...acceptedFiles]); }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

  const handleUploadNewFiles = async () => {
    if (filesToUpload.length === 0) { toast.warn("No new files selected to upload."); return; }
    setIsUploading(true);
    const uploadFormDataAPI = new FormData();
    filesToUpload.forEach(file => uploadFormDataAPI.append('files', file));
    uploadFormDataAPI.append('relatedToType', 'shipment'); 
    
    try {
      const response = await documentAPI.upload(uploadFormDataAPI);
      if (response.data.success && response.data.data) {
        const uploadedDocsInfo: IDocumentStubFE[] = response.data.data.map((doc: any) => ({ 
            _id: doc._id, originalName: doc.originalName, mimetype: doc.mimetype, 
            path: doc.path, size: doc.size, createdAt: doc.createdAt 
        }));
        
        setFormData(prev => ({
            ...prev,
            documentIds: [...new Set([...(prev.documentIds || []), ...uploadedDocsInfo.map(d => d._id)])], 
            attachedDocuments: [...(prev.attachedDocuments || []), ...uploadedDocsInfo] 
        }));
        toast.success(`${uploadedDocsInfo.length} file(s) uploaded and staged.`);
        setFilesToUpload([]);
      } else {
        toast.error(response.data.message || "File upload failed.");
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
    if (!shipmentSettings) {
      toast.error("Shipment form settings are not loaded yet. Please wait a moment and try again.");
      return;
    }

    const missingFields: string[] = [];
    shipmentSettings.requiredFields.forEach(fieldId => {
      const value = getFieldValue(formData, fieldId);
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(fieldId);
      }
    });

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}.`);
      return;
    }

    // --- Construct stops array based on location data before submit
    const stops = [];

    if (formData.originAddress || formData.originCity || formData.originState || formData.originZip) {
      stops.push({
        stopType: formData.originLocationType || 'Pickup',
        name: formData.originName,
        address: formData.originAddress,
        city: formData.originCity,
        state: formData.originState,
        zip: formData.originZip,
        country: formData.originCountry,
        contactName: formData.originContactName,
        contactPhone: formData.originContactPhone,
        notes: formData.originNotes
      });
    }

    if (formData.destinationAddress || formData.destinationCity || formData.destinationState || formData.destinationZip) {
      stops.push({
        stopType: formData.destinationLocationType || 'Dropoff',
        name: formData.destinationName,
        address: formData.destinationAddress,
        city: formData.destinationCity,
        state: formData.destinationState,
        zip: formData.destinationZip,
        country: formData.destinationCountry,
        contactName: formData.destinationContactName,
        contactPhone: formData.destinationContactPhone,
        notes: formData.destinationNotes
      });
    }

    formData.stops = stops;
    // ---


    onSubmit(formData, formData._id);
  };

  const isFieldRequired = (fieldId: string) => {
    return !!shipmentSettings?.requiredFields.includes(fieldId);
  }

  const getVisibleStatusOptions = () => {
    let options = shipmentStatusOptions.filter(s => s !== 'quote'); 
    if (formData.status && !options.includes(formData.status)) {
        options = [formData.status, ...options];
    }
    return options;
  };

  const visibleStatusOptions = getVisibleStatusOptions();
  const isFormLoading = isLoading || isUploading || isLoadingSettings;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
      <DialogTitle>{formData._id ? 'Edit Shipment' : 'New Shipment'}: {formData.shipmentNumber || '(New)'}</DialogTitle>
      <DialogContent dividers>
        {isErrorSettings && <Alert severity="warning" sx={{mb: 2}}>Could not load shipment form settings. Default validation rules will be applied.</Alert>}
        
        <Grid container spacing={2} sx={{ mt: 0.1 }}>
            {/* Section 1: Core Info */}
            <Grid item xs={12}><Typography variant="overline">Core Information</Typography><Divider /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Shipment Number" name="shipmentNumber" value={formData.shipmentNumber} onChange={handleInputChange} helperText={!formData._id ? "Auto-generated if new & empty" : ""} /></Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                size="small"
                select
                fullWidth
                label={`Mode of Transport${isFieldRequired('modeOfTransport') ? '*' : ''}`}
                name="modeOfTransport"
                value={modeOfTransportOptions.includes(formData.modeOfTransport) ? formData.modeOfTransport : ''}
                onChange={(e) => handleSelectChange('modeOfTransport', e.target.value as any)}
                required={isFieldRequired('modeOfTransport')}
              >
                {modeOfTransportOptions.map(mode => (
                  <MenuItem key={mode} value={mode} sx={{ textTransform: 'capitalize' }}>
                    {mode.replace(/-/g, ' ')}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                size="small"
                select
                fullWidth
                label={`Status${isFieldRequired('status') ? '*' : ''}`}
                name="status"
                value={visibleStatusOptions.includes(formData.status) ? formData.status : ''}
                onChange={(e) => handleSelectChange('status', e.target.value as any)}
                required={isFieldRequired('status')}
              >
                {getVisibleStatusOptions().map(s => (
                  <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                    {s.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                size="small"
                select
                fullWidth
                label={`Equipment Type${isFieldRequired('equipmentType') ? '*' : ''}`}
                name="equipmentType"
                value={equipmentTypesList.some(eq => eq.name === formData.equipmentType) ? formData.equipmentType : ''}
                onChange={(e) => handleSelectChange('equipmentType', e.target.value)}
                required={isFieldRequired('equipmentType')}
                disabled={isLoadingEquipmentTypes}
              >
                <MenuItem value="">
                  <em>Select...</em>
                </MenuItem>
                {equipmentTypesList.map(eq => (
                  <MenuItem key={eq._id} value={eq.name}>
                    {eq.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                size="small"
                select
                fullWidth
                label={`Shipper${isFieldRequired('shipper') ? '*' : ''}`}
                name="shipper"
                value={shippersList.some(s => s._id === formData.shipper) ? formData.shipper : ''}
                onChange={(e) => handleSelectChange('shipper', e.target.value)}
                required={isFieldRequired('shipper')}
                disabled={isLoadingShippers}
              >
                <MenuItem value="">
                  <em>Select Shipper</em>
                </MenuItem>
                {shippersList.map(s => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                size="small"
                select
                fullWidth
                label={`Carrier${isFieldRequired('carrier') ? '*' : ''}`}
                name="carrier"
                value={carriersList.some(c => c._id === formData.carrier) ? formData.carrier : ''}
                onChange={(e) => handleSelectChange('carrier', e.target.value)}
                required={isFieldRequired('carrier')}
                disabled={isLoadingCarriers}
              >
                <MenuItem value="">
                  <em>Select Carrier</em>
                </MenuItem>
                {carriersList.map(c => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            
            {/* Section 2: Dates & Times */}
            <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Dates & Times</Typography><Divider/></Grid>
            <Grid item xs={6} sm={4} md={2}>
              <TextField
                size="small"
                fullWidth
                label={`Sched. Pickup Date${isFieldRequired('scheduledPickupDate') ? '*' : ''}`}
                name="scheduledPickupDate"
                type="date"
                value={formData.scheduledPickupDate ? new Date(formData.scheduledPickupDate).toISOString().split('T')[0] : ''}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                required={isFieldRequired('scheduledPickupDate')}
              />
            </Grid>
            <Grid item xs={6} sm={2} md={1}>
              <TextField
                size="small"
                fullWidth
                label="Time"
                name="scheduledPickupTime"
                value={formData.scheduledPickupTime || ''}
                onChange={handleInputChange}
                placeholder="HH:MM"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                size="small"
                fullWidth
                label="Actual Pickup D/T"
                name="actualPickupDateTime"
                type="datetime-local"
                value={
                  formData.actualPickupDateTime && !isNaN(new Date(formData.actualPickupDateTime).getTime())
                    ? new Date(formData.actualPickupDateTime).toISOString().slice(0, 16)
                    : ''
                }
                onChange={(e) => handleInputChange(e)}
                InputLabelProps={{ shrink: true }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  console.log("Clearing actualPickupDateTime. Current value:", formData.actualPickupDateTime);
                  setFormData(prev => ({ ...prev, actualPickupDateTime: '' }));
                  setTimeout(() => {
                    console.log("Value after clearing:", formData.actualPickupDateTime);
                  }, 100);
                }}
                sx={{ mt: 1 }}
              >
                Clear Pickup
              </Button>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <TextField
                size="small"
                fullWidth
                label={`Sched. Delivery Date${isFieldRequired('scheduledDeliveryDate') ? '*' : ''}`}
                name="scheduledDeliveryDate"
                type="date"
                value={formData.scheduledDeliveryDate ? new Date(formData.scheduledDeliveryDate).toISOString().split('T')[0] : ''}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                required={isFieldRequired('scheduledDeliveryDate')}
              />
            </Grid>
            <Grid item xs={6} sm={2} md={1}>
              <TextField
                size="small"
                fullWidth
                label="Time"
                name="scheduledDeliveryTime"
                value={formData.scheduledDeliveryTime || ''}
                onChange={handleInputChange}
                placeholder="HH:MM"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                size="small"
                fullWidth
                label="Actual Delivery D/T"
                name="actualDeliveryDateTime"
                type="datetime-local"
                value={
                  formData.actualDeliveryDateTime && !isNaN(new Date(formData.actualDeliveryDateTime).getTime())
                    ? new Date(formData.actualDeliveryDateTime).toISOString().slice(0, 16)
                    : ''
                }
                key={formData.actualDeliveryDateTime || 'empty'}
                onChange={(e) => handleInputChange(e)}
                InputLabelProps={{ shrink: true }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setFormData(prev => ({ ...prev, actualDeliveryDateTime: '' }));
                  setTimeout(() => {
                    const el = document.querySelector('input[name="actualDeliveryDateTime"]') as HTMLInputElement;
                    if (el) el.value = '';
                  }, 0);
                }}
                sx={{ mt: 1 }}
              >
                Clear Delivery
              </Button>
            </Grid>
            
            {/* Section 3: Locations */}
            <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Locations</Typography><Divider/></Grid>
            <Grid item xs={12} md={6}> <Typography variant="caption" display="block" gutterBottom>Origin Details</Typography> <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Origin Name"
                        name="originName"
                        value={formData.originName}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        select
                        fullWidth
                        label="Origin Stop Type"
                        name="originLocationType"
                        value={formData.originLocationType ?? ''}
                        onChange={(e) => handleSelectChange('originLocationType', e.target.value as any)}
                      >
                        {['Pickup', 'Dropoff'].map(lt => (
                          <MenuItem key={`orig-${lt}`} value={lt}>
                            {lt}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        size="small"
                        fullWidth
                        label={`Origin Address${isFieldRequired('origin.address') ? '*' : ''}`}
                        name="originAddress"
                        value={formData.originAddress}
                        onChange={handleInputChange}
                        required={isFieldRequired('origin.address')}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        size="small"
                        fullWidth
                        label={`Origin City${isFieldRequired('origin.city') ? '*' : ''}`}
                        name="originCity"
                        value={formData.originCity}
                        onChange={handleInputChange}
                        required={isFieldRequired('origin.city')}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <TextField
                        size="small"
                        fullWidth
                        label={`Origin State${isFieldRequired('origin.state') ? '*' : ''}`}
                        name="originState"
                        value={formData.originState}
                        onChange={handleInputChange}
                        required={isFieldRequired('origin.state')}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        size="small"
                        fullWidth
                        label={`Origin Zip${isFieldRequired('origin.zip') ? '*' : ''}`}
                        name="originZip"
                        value={formData.originZip}
                        onChange={handleInputChange}
                        required={isFieldRequired('origin.zip')}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Origin Country"
                        name="originCountry"
                        value={formData.originCountry}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Origin Contact Name"
                        name="originContactName"
                        value={formData.originContactName}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Origin Contact Phone"
                        name="originContactPhone"
                        value={formData.originContactPhone}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Origin Notes"
                        name="originNotes"
                        value={formData.originNotes}
                        onChange={handleInputChange}
                        multiline
                        minRows={1}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                </Grid></Grid>
            <Grid item xs={12} md={6}> <Typography variant="caption" display="block" gutterBottom>Destination Details</Typography> <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Dest. Name"
                        name="destinationName"
                        value={formData.destinationName}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        select
                        fullWidth
                        label="Dest. Stop Type"
                        name="destinationLocationType"
                        value={formData.destinationLocationType ?? ''}
                        onChange={(e) => handleSelectChange('destinationLocationType', e.target.value as any)}
                      >
                        {['Pickup', 'Dropoff'].map(lt => (
                          <MenuItem key={`dest-${lt}`} value={lt}>
                            {lt}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        size="small"
                        fullWidth
                        label={`Dest. Address${isFieldRequired('destination.address') ? '*' : ''}`}
                        name="destinationAddress"
                        value={formData.destinationAddress}
                        onChange={handleInputChange}
                        required={isFieldRequired('destination.address')}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        size="small"
                        fullWidth
                        label={`Dest. City${isFieldRequired('destination.city') ? '*' : ''}`}
                        name="destinationCity"
                        value={formData.destinationCity}
                        onChange={handleInputChange}
                        required={isFieldRequired('destination.city')}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <TextField
                        size="small"
                        fullWidth
                        label={`Dest. State${isFieldRequired('destination.state') ? '*' : ''}`}
                        name="destinationState"
                        value={formData.destinationState}
                        onChange={handleInputChange}
                        required={isFieldRequired('destination.state')}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        size="small"
                        fullWidth
                        label={`Dest. Zip${isFieldRequired('destination.zip') ? '*' : ''}`}
                        name="destinationZip"
                        value={formData.destinationZip}
                        onChange={handleInputChange}
                        required={isFieldRequired('destination.zip')}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Dest. Country"
                        name="destinationCountry"
                        value={formData.destinationCountry}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Dest. Contact Name"
                        name="destinationContactName"
                        value={formData.destinationContactName}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Dest. Contact Phone"
                        name="destinationContactPhone"
                        value={formData.destinationContactPhone}
                        onChange={handleInputChange}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        size="small"
                        fullWidth
                        label="Dest. Notes"
                        name="destinationNotes"
                        value={formData.destinationNotes}
                        onChange={handleInputChange}
                        multiline
                        minRows={1}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                </Grid></Grid>

            <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Freight Details</Typography><Divider/></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label={`Commodity Description${isFieldRequired('commodityDescription') ? '*' : ''}`} name="commodityDescription" value={formData.commodityDescription} onChange={handleInputChange} required={isFieldRequired('commodityDescription')} /></Grid>
            <Grid item xs={6} sm={3} md={2}><TextField size="small" fullWidth label="Piece Count" name="pieceCount" type="number" value={formData.pieceCount} onChange={handleInputChange} /></Grid>
            <Grid item xs={6} sm={3} md={2}><TextField size="small" fullWidth label="Package Type" name="packageType" value={formData.packageType} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box display="flex" alignItems="center" gap={1} width="100%">
                <TextField
                  size="small"
                  fullWidth
                  label={`Total Weight${isFieldRequired('totalWeight') ? '*' : ''}`}
                  name="totalWeight"
                  type="number"
                  value={formData.totalWeight}
                  onChange={handleInputChange}
                  required={isFieldRequired('totalWeight')}
                />
                <TextField
                  size="small"
                  select
                  sx={{ minWidth: 80 }}
                  label="Unit"
                  name="weightUnit"
                  value={weightUnitOptions.includes(formData.weightUnit) ? formData.weightUnit : ''}
                  onChange={(e) => handleSelectChange('weightUnit', e.target.value as any)}
                >
                  {weightUnitOptions.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </TextField>
                {formData.totalWeight && formData.weightUnit && (
                  <Typography variant="caption" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
                    ≈{" "}
                    {formData.weightUnit === 'KG'
                      ? `${convertWeight(Number(formData.totalWeight), 'KG')} lbs`
                      : `${convertWeight(Number(formData.totalWeight), 'LBS')} kg`}
                  </Typography>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={4} md={2}><TextField size="small" fullWidth label="Equip. Length" name="equipmentLength" type="number" value={formData.equipmentLength} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={4} md={2}>
              <TextField
                size="small"
                select
                fullWidth
                label="Equip. Unit"
                name="equipmentUnit"
                value={equipmentUnitOptions.includes(formData.equipmentUnit) ? formData.equipmentUnit : ''}
                onChange={(e) => handleSelectChange('equipmentUnit', e.target.value as any)}
              >
                {equipmentUnitOptions.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4} md={2}><FormControlLabel control={<Checkbox checked={formData.isHazardous} onChange={handleInputChange} name="isHazardous" size="small" />} label="Hazardous" /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="UN Number" name="unNumber" value={formData.unNumber} onChange={handleInputChange} disabled={!formData.isHazardous} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Hazmat Class" name="hazmatClass" value={formData.hazmatClass} onChange={handleInputChange} disabled={!formData.isHazardous} /></Grid>
            <Grid item xs={12} sm={4} md={2}><FormControlLabel control={<Checkbox checked={formData.isTemperatureControlled} onChange={handleInputChange} name="isTemperatureControlled" size="small" />} label="Temp Control" /></Grid>
            <Grid item xs={6} sm={3} md={2}><TextField size="small" fullWidth label="Min Temp" name="temperatureMin" type="number" value={formData.temperatureMin} onChange={handleInputChange} disabled={!formData.isTemperatureControlled} /></Grid>
            <Grid item xs={6} sm={3} md={2}><TextField size="small" fullWidth label="Max Temp" name="temperatureMax" type="number" value={formData.temperatureMax} onChange={handleInputChange} disabled={!formData.isTemperatureControlled} /></Grid>
            <Grid item xs={12} sm={4} md={2}>
              <TextField
                size="small"
                select
                fullWidth
                label="Temp Unit"
                name="tempUnit"
                value={['C', 'F'].includes(formData.tempUnit) ? formData.tempUnit : ''}
                onChange={(e) => handleSelectChange('tempUnit', e.target.value as any)}
                disabled={!formData.isTemperatureControlled}
              >
                <MenuItem value="C">°C</MenuItem>
                <MenuItem value="F">°F</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Reference Numbers</Typography><Divider/></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label={`BOL #${isFieldRequired('billOfLadingNumber') ? '*' : ''}`} name="billOfLadingNumber" value={formData.billOfLadingNumber} onChange={handleInputChange} required={isFieldRequired('billOfLadingNumber')} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label={`PRO #${isFieldRequired('proNumber') ? '*' : ''}`} name="proNumber" value={formData.proNumber} onChange={handleInputChange} required={isFieldRequired('proNumber')} /></Grid>
            {/* Container Details fields moved here */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField size="small" fullWidth label="Container #" name="containerNumber" value={formData.containerNumber} onChange={handleInputChange} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField size="small" fullWidth label="Pickup #" name="pickupNumber" value={formData.pickupNumber} onChange={handleInputChange} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField size="small" fullWidth label="Seal #" name="sealNumber" value={formData.sealNumber} onChange={handleInputChange} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                size="small"
                fullWidth
                label="Steamship Line"
                name="steamshipLine"
                value={formData.steamshipLine}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="DO #" name="deliveryOrderNumber" value={formData.deliveryOrderNumber} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Booking #" name="bookingNumber" value={formData.bookingNumber} onChange={handleInputChange} /></Grid>
            
            <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Financials & Notes</Typography><Divider/></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label={`Customer Rate ($)${isFieldRequired('customerRate') ? '*' : ''}`} name="customerRate" type="number" value={formData.customerRate} onChange={handleInputChange} required={isFieldRequired('customerRate')} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label={`Carrier Cost ($)${isFieldRequired('carrierCostTotal') ? '*' : ''}`} name="carrierCostTotal" type="number" value={formData.carrierCostTotal} onChange={handleInputChange} required={isFieldRequired('carrierCostTotal')} /></Grid>
            <Grid item xs={12} sm={6} md={6}><TextField size="small" fullWidth label="Custom Tags (comma-sep)" name="customTags" value={formData.customTags} onChange={handleInputChange} /></Grid>
            <Grid item xs={12}><TextField size="small" fullWidth label="Internal Notes" name="internalNotes" value={formData.internalNotes} onChange={handleInputChange} multiline minRows={2} /></Grid>
            <Grid item xs={12}><TextField size="small" fullWidth label="Special Instructions (for carrier)" name="specialInstructions" value={formData.specialInstructions} onChange={handleInputChange} multiline minRows={2} /></Grid>

            <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Documents</Typography><Divider/></Grid>
            {formData.attachedDocuments && formData.attachedDocuments.length > 0 && (
            <Grid item xs={12}> <Typography variant="subtitle2">Attached Documents:</Typography> <List dense>
                {formData.attachedDocuments.map(doc => (
                    <ListItem key={doc._id} secondaryAction={<Tooltip title="Remove"><IconButton edge="end" onClick={() => handleRemoveStagedFile(doc._id)}><DeleteDocIcon /></IconButton></Tooltip>}>
                        <ListItemIcon><DocumentFileIcon /></ListItemIcon>
                        <ListItemText primary={<Link href={documentAPI.download(doc._id)} target="_blank" rel="noopener noreferrer">{doc.originalName}</Link>} secondary={`${formatFileSize(doc.size || 0)}`} />
                    </ListItem> ))} </List> </Grid> )}
            <Grid item xs={12}>
            <Paper {...getRootProps()} variant="outlined" sx={{ p: 2, mt:1, textAlign: 'center', cursor: 'pointer', border: isDragActive ? '2px dashed primary.main' : '2px dashed grey.500', backgroundColor: isDragActive ? 'action.hover' : 'transparent'}}>
                <input {...getInputProps()} /> <UploadIcon sx={{fontSize: 30, color: 'text.secondary'}}/>
                {isDragActive ? <Typography>Drop files here...</Typography> : <Typography>Drag 'n' drop files, or click to select</Typography>}
            </Paper>
            {filesToUpload.length > 0 && ( <Box mt={1}> <Typography variant="caption">Selected files to upload:</Typography> <List dense disablePadding>
                {filesToUpload.map((file, index) => ( <ListItem dense disableGutters key={`${file.name}-${index}`} secondaryAction={<IconButton size="small" onClick={() => setFilesToUpload(prev => prev.filter((_, i) => i !== index))}><DeleteDocIcon fontSize="small"/></IconButton>}> <ListItemIcon sx={{minWidth: 30}}><AttachFileIcon fontSize="small"/></ListItemIcon> <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(1)} KB`} /> </ListItem> ))} </List>
                <Button size="small" variant="outlined" onClick={handleUploadNewFiles} sx={{mt:1}} disabled={isUploading}> {isUploading ? <CircularProgress size={20}/> : 'Upload Selected & Stage'} </Button> </Box> )} </Grid>
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