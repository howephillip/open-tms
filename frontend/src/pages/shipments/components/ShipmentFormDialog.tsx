// File: frontend/src/pages/shipments/components/ShipmentFormDialog.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Grid, TextField, MenuItem, Checkbox, FormControlLabel,
  Typography, Divider, CircularProgress, InputAdornment,
  Box, List, ListItem, ListItemText, ListItemIcon, IconButton, Paper, Link
} from '@mui/material';
import {
  LocalShipping as DrayageIcon, Train as RailIcon, Unarchive as TransloadIcon,
  Category as GenericRefIcon, ConfirmationNumber as BookingIcon, VpnKey as SealIcon,
  Inventory2Outlined as ContainerIcon, DescriptionOutlined as DONumberIcon, 
  ReceiptLongOutlined as BOLIcon, ArticleOutlined as PONumberIcon,    
  FlightTakeoffOutlined as FlightIcon, DirectionsBoatOutlined as VesselIcon,
  AttachFile as AttachFileIcon, DeleteOutline as DeleteDocIcon, CloudUpload as UploadIcon,
  Article as DocumentFileIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { documentAPI } from '../../../services/api'; // For document uploads
import { toast } from 'react-toastify';

// Import types and initial data from mappers
import { 
    initialShipmentFormData as dialogInitialShipmentFormData, 
    ShipmentFormDataForDialog,
    IDocumentStubFE // Ensure this type is exported from mappers or defined here
} from '../utils/shipmentFormMappers'; 

// Import option constants DIRECTLY
import { 
    modeOfTransportOptions, statusOptions, locationTypeOptions, 
    weightUnitOptions, equipmentUnitOptions, tempUnitOptions
} from '../constants/shipmentOptions'; 

// --- Type Definitions for props (passed from ShipmentsPage) ---
interface ShipperStub { _id: string; name: string; } 
interface CarrierStub { _id: string; name: string; } 
interface EquipmentTypeOption { _id: string; name: string; code?: string; }
// Types used by this form's state (imported or ensure they match)
type ModeOfTransportType = ShipmentFormDataForDialog['modeOfTransport'];
type StatusType = ShipmentFormDataForDialog['status'];
type LocationType = ShipmentFormDataForDialog['originLocationType'];
type WeightUnitType = ShipmentFormDataForDialog['weightUnit'];
type EquipmentUnitType = ShipmentFormDataForDialog['equipmentUnit'];
type TempUnitType = ShipmentFormDataForDialog['tempUnit'];


interface ShipmentFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: ShipmentFormDataForDialog, id?: string) => void;
  initialData?: ShipmentFormDataForDialog | null;
  isLoading: boolean; // For the save/update mutation
  // Lists for dropdowns
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

const ShipmentFormDialog: React.FC<ShipmentFormDialogProps> = ({
  open, onClose, onSubmit, initialData, isLoading,
  shippersList, isLoadingShippers, carriersList, isLoadingCarriers,
  equipmentTypesList, isLoadingEquipmentTypes
}) => {
  const [formData, setFormData] = useState<ShipmentFormDataForDialog>(dialogInitialShipmentFormData);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false); // Local loading state for file uploads

  useEffect(() => {
    if (open) {
      if (initialData) {
        // Ensure all fields from initialData are correctly mapped, especially arrays
        setFormData({ 
            ...dialogInitialShipmentFormData, // Apply defaults first
            ...initialData, // Override with passed data
            documentIds: initialData.documentIds || [], 
            attachedDocuments: initialData.attachedDocuments || [] 
        });
      } else {
        setFormData({...dialogInitialShipmentFormData, status: 'booked'}); // Default for new booked shipment
      }
      setFilesToUpload([]); // Clear pending files when dialog opens/re-initializes
    }
  }, [initialData, open]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = event.target;
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
    const name = target.name;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof ShipmentFormDataForDialog, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFilesToUpload(prevFiles => [...prevFiles, ...acceptedFiles]);
  }, []);
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
            documentIds: [...new Set([...prev.documentIds, ...uploadedDocsInfo.map(d => d._id)])], 
            attachedDocuments: [...(prev.attachedDocuments || []), ...uploadedDocsInfo] 
        }));
        toast.success(`${uploadedDocsInfo.length} file(s) uploaded and staged.`);
        setFilesToUpload([]);
      } else {
        toast.error(response.data.message || "File upload failed.");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error during file upload.");
      console.error("File upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRemoveStagedFile = (fileIdToRemove: string) => {
    setFormData(prev => ({
        ...prev,
        documentIds: prev.documentIds.filter(id => id !== fileIdToRemove),
        attachedDocuments: prev.attachedDocuments?.filter(doc => doc._id !== fileIdToRemove)
    }));
  };

  const handleSubmit = () => {
    if (!formData.shipper || !formData.carrier || !formData.modeOfTransport || !formData.status || !formData.equipmentType || !formData.commodityDescription || !formData.customerRate || !formData.carrierCostTotal || !formData.scheduledPickupDate || !formData.scheduledDeliveryDate || !formData.originAddress || !formData.destinationAddress) {
        toast.error("Please fill in all required (*) fields."); return;
    }
    onSubmit(formData, formData._id);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
      <DialogTitle>{formData._id ? 'Edit Shipment' : 'New Shipment'}: {formData.shipmentNumber || '(New)'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.1 }}>
            {/* Section 1: Core Info */}
            <Grid item xs={12}><Typography variant="overline">Core Information</Typography><Divider /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Shipment Number" name="shipmentNumber" value={formData.shipmentNumber} onChange={handleInputChange} helperText={!formData._id ? "Auto-generated if new & empty" : ""} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" select fullWidth label="Mode of Transport" name="modeOfTransport" value={formData.modeOfTransport} 
                           onChange={(e) => handleSelectChange('modeOfTransport', e.target.value as ModeOfTransportType)} required>
                {modeOfTransportOptions.map(mode => <MenuItem key={mode} value={mode} sx={{textTransform: 'capitalize'}}>{mode.replace(/-/g, ' ')}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" select fullWidth label="Status" name="status" value={formData.status} 
                           onChange={(e) => handleSelectChange('status', e.target.value as StatusType)} required>
                {statusOptions.filter(s => s !== 'quote').map(s => <MenuItem key={s} value={s} sx={{textTransform: 'capitalize'}}>{s.replace(/_/g, ' ')}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" select fullWidth label="Equipment Type" name="equipmentType" value={formData.equipmentType} onChange={(e) => handleSelectChange('equipmentType', e.target.value)} required disabled={isLoadingEquipmentTypes}>
                {isLoadingEquipmentTypes ? <MenuItem value=""><em>Loading...</em></MenuItem> : equipmentTypesList.length === 0 ? <MenuItem value=""><em>No equipment</em></MenuItem> : equipmentTypesList.map(eq => <MenuItem key={eq._id} value={eq.name}>{eq.name}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={6} md={6}><TextField size="small" select fullWidth label="Shipper" name="shipper" value={formData.shipper} onChange={(e) => handleSelectChange('shipper', e.target.value)} required disabled={isLoadingShippers}>
                {isLoadingShippers? <MenuItem value=""><em>Loading...</em></MenuItem> : shippersList.map(s => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12} sm={6} md={6}><TextField size="small" select fullWidth label="Carrier" name="carrier" value={formData.carrier} onChange={(e) => handleSelectChange('carrier', e.target.value)} required disabled={isLoadingCarriers}>
                {isLoadingCarriers? <MenuItem value=""><em>Loading...</em></MenuItem> : carriersList.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
            </TextField></Grid>
            
            {/* Section 2: Dates & Times */}
            <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Dates & Times</Typography><Divider/></Grid>
            <Grid item xs={6} sm={4} md={2}><TextField size="small" fullWidth label="Sched. Pickup Date" name="scheduledPickupDate" type="date" value={formData.scheduledPickupDate} onChange={handleInputChange} InputLabelProps={{ shrink: true }} required /></Grid>
            <Grid item xs={6} sm={2} md={1}><TextField size="small" fullWidth label="Time" name="scheduledPickupTime" value={formData.scheduledPickupTime} onChange={handleInputChange} placeholder="HH:MM or window" /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Actual Pickup D/T" name="actualPickupDateTime" type="datetime-local" value={formData.actualPickupDateTime} onChange={handleInputChange} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6} sm={4} md={2}><TextField size="small" fullWidth label="Sched. Delivery Date" name="scheduledDeliveryDate" type="date" value={formData.scheduledDeliveryDate} onChange={handleInputChange} InputLabelProps={{ shrink: true }} required /></Grid>
            <Grid item xs={6} sm={2} md={1}><TextField size="small" fullWidth label="Time" name="scheduledDeliveryTime" value={formData.scheduledDeliveryTime} onChange={handleInputChange} placeholder="HH:MM or window" /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Actual Delivery D/T" name="actualDeliveryDateTime" type="datetime-local" value={formData.actualDeliveryDateTime} onChange={handleInputChange} InputLabelProps={{ shrink: true }} /></Grid>
            
            {/* Section 3: Locations */}
            <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Locations</Typography><Divider/></Grid>
            <Grid item xs={12} md={6}> <Typography variant="caption" display="block" gutterBottom>Origin Details</Typography> <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Origin Name (Opt.)" name="originName" value={formData.originName} onChange={handleInputChange} /></Grid>
                    <Grid item xs={12} sm={6}><TextField size="small" select fullWidth label="Origin Location Type" name="originLocationType" value={formData.originLocationType} onChange={(e) => handleSelectChange('originLocationType', e.target.value as LocationType )}> {locationTypeOptions.map(lt=><MenuItem key={`orig-${lt}`} value={lt} sx={{textTransform:'capitalize'}}>{lt.replace(/_/g, ' ')}</MenuItem>)} </TextField></Grid>
                    <Grid item xs={12}><TextField size="small" fullWidth label="Origin Address" name="originAddress" value={formData.originAddress} onChange={handleInputChange} required /></Grid>
                    <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Origin City" name="originCity" value={formData.originCity} onChange={handleInputChange} required /></Grid>
                    <Grid item xs={12} sm={2}><TextField size="small" fullWidth label="Origin State" name="originState" value={formData.originState} onChange={handleInputChange} required /></Grid>
                    <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="Origin Zip" name="originZip" value={formData.originZip} onChange={handleInputChange} required /></Grid>
                    <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="Origin Country" name="originCountry" value={formData.originCountry} onChange={handleInputChange} /></Grid>
                    <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Origin Contact Name" name="originContactName" value={formData.originContactName} onChange={handleInputChange} /></Grid>
                    <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Origin Contact Phone" name="originContactPhone" value={formData.originContactPhone} onChange={handleInputChange} /></Grid>
                    <Grid item xs={12}><TextField size="small" fullWidth label="Origin Notes" name="originNotes" value={formData.originNotes} onChange={handleInputChange} multiline minRows={1}/> </Grid>
                </Grid></Grid>
            <Grid item xs={12} md={6}> <Typography variant="caption" display="block" gutterBottom>Destination Details</Typography> <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Dest. Name (Opt.)" name="destinationName" value={formData.destinationName} onChange={handleInputChange} /></Grid>
                    <Grid item xs={12} sm={6}><TextField size="small" select fullWidth label="Dest. Location Type" name="destinationLocationType" value={formData.destinationLocationType} onChange={(e) => handleSelectChange('destinationLocationType', e.target.value as LocationType)}> {locationTypeOptions.map(lt=><MenuItem key={`dest-${lt}`} value={lt} sx={{textTransform:'capitalize'}}>{lt.replace(/_/g, ' ')}</MenuItem>)} </TextField></Grid>
                    <Grid item xs={12}><TextField size="small" fullWidth label="Dest. Address" name="destinationAddress" value={formData.destinationAddress} onChange={handleInputChange} required /></Grid>
                    <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Dest. City" name="destinationCity" value={formData.destinationCity} onChange={handleInputChange} required /></Grid>
                    <Grid item xs={12} sm={2}><TextField size="small" fullWidth label="Dest. State" name="destinationState" value={formData.destinationState} onChange={handleInputChange} required /></Grid>
                    <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="Dest. Zip" name="destinationZip" value={formData.destinationZip} onChange={handleInputChange} required /></Grid>
                    <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="Dest. Country" name="destinationCountry" value={formData.destinationCountry} onChange={handleInputChange} /></Grid>
                    <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Dest. Contact Name" name="destinationContactName" value={formData.destinationContactName} onChange={handleInputChange} /></Grid>
                    <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Dest. Contact Phone" name="destinationContactPhone" value={formData.destinationContactPhone} onChange={handleInputChange} /></Grid>
                    <Grid item xs={12}><TextField size="small" fullWidth label="Dest. Notes" name="destinationNotes" value={formData.destinationNotes} onChange={handleInputChange} multiline minRows={1} /></Grid>
                </Grid></Grid>

            <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Freight Details</Typography><Divider/></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Commodity Description" name="commodityDescription" value={formData.commodityDescription} onChange={handleInputChange} required /></Grid>
            <Grid item xs={6} sm={3} md={2}><TextField size="small" fullWidth label="Piece Count" name="pieceCount" type="number" value={formData.pieceCount} onChange={handleInputChange} /></Grid>
            <Grid item xs={6} sm={3} md={2}><TextField size="small" fullWidth label="Package Type" name="packageType" value={formData.packageType} onChange={handleInputChange} /></Grid>
            <Grid item xs={6} sm={3} md={2}><TextField size="small" fullWidth label="Total Weight" name="totalWeight" type="number" value={formData.totalWeight} onChange={handleInputChange} /></Grid>
            <Grid item xs={6} sm={3} md={2}><TextField size="small" select fullWidth label="Weight Unit" name="weightUnit" value={formData.weightUnit} onChange={(e) => handleSelectChange('weightUnit', e.target.value as WeightUnitType)}> {weightUnitOptions.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)} </TextField></Grid>
            <Grid item xs={12} sm={4} md={2}><TextField size="small" fullWidth label="Equip. Length" name="equipmentLength" type="number" value={formData.equipmentLength} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={4} md={2}><TextField size="small" select fullWidth label="Equip. Unit" name="equipmentUnit" value={formData.equipmentUnit} onChange={(e) => handleSelectChange('equipmentUnit', e.target.value as EquipmentUnitType)}> {equipmentUnitOptions.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)} </TextField></Grid>
            <Grid item xs={12} sm={4} md={2}><FormControlLabel control={<Checkbox checked={formData.isHazardous} onChange={handleInputChange} name="isHazardous" size="small" />} label="Hazardous" /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="UN Number" name="unNumber" value={formData.unNumber} onChange={handleInputChange} disabled={!formData.isHazardous} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Hazmat Class" name="hazmatClass" value={formData.hazmatClass} onChange={handleInputChange} disabled={!formData.isHazardous} /></Grid>
            <Grid item xs={12} sm={4} md={2}><FormControlLabel control={<Checkbox checked={formData.isTemperatureControlled} onChange={handleInputChange} name="isTemperatureControlled" size="small" />} label="Temp Control" /></Grid>
            <Grid item xs={6} sm={3} md={2}><TextField size="small" fullWidth label="Min Temp" name="temperatureMin" type="number" value={formData.temperatureMin} onChange={handleInputChange} disabled={!formData.isTemperatureControlled} /></Grid>
            <Grid item xs={6} sm={3} md={2}><TextField size="small" fullWidth label="Max Temp" name="temperatureMax" type="number" value={formData.temperatureMax} onChange={handleInputChange} disabled={!formData.isTemperatureControlled} /></Grid>
            <Grid item xs={12} sm={4} md={2}><TextField size="small" select fullWidth label="Temp Unit" name="tempUnit" value={formData.tempUnit} onChange={(e) => handleSelectChange('tempUnit', e.target.value as TempUnitType)} disabled={!formData.isTemperatureControlled} > <MenuItem value="C">°C</MenuItem><MenuItem value="F">°F</MenuItem> </TextField></Grid>

            <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Reference Numbers</Typography><Divider/></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="BOL #" name="billOfLadingNumber" value={formData.billOfLadingNumber} onChange={handleInputChange} InputProps={{startAdornment: <BOLIcon fontSize="small" sx={{mr:0.5}}/>}} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="PRO #" name="proNumber" value={formData.proNumber} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="DO #" name="deliveryOrderNumber" value={formData.deliveryOrderNumber} onChange={handleInputChange} InputProps={{startAdornment: <DONumberIcon fontSize="small" sx={{mr:0.5}}/>}} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Booking #" name="bookingNumber" value={formData.bookingNumber} onChange={handleInputChange} InputProps={{startAdornment: <BookingIcon fontSize="small" sx={{mr:0.5}}/>}} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Container #" name="containerNumber" value={formData.containerNumber} onChange={handleInputChange} InputProps={{startAdornment: <ContainerIcon fontSize="small" sx={{mr:0.5}}/>}} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Seal #" name="sealNumber" value={formData.sealNumber} onChange={handleInputChange} InputProps={{startAdornment: <SealIcon fontSize="small" sx={{mr:0.5}}/>}} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Pickup #" name="pickupNumber" value={formData.pickupNumber} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="POD Ref #" name="proofOfDeliveryNumber" value={formData.proofOfDeliveryNumber} onChange={handleInputChange} /></Grid>
            <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="PO #s (comma-sep)" name="purchaseOrderNumbers" value={formData.purchaseOrderNumbers} onChange={handleInputChange} InputProps={{startAdornment: <PONumberIcon fontSize="small" sx={{mr:0.5}}/>}} /></Grid>
            <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="Other Refs (type:value,...)" name="otherReferenceNumbersString" value={formData.otherReferenceNumbersString} onChange={handleInputChange} InputProps={{startAdornment: <GenericRefIcon fontSize="small" sx={{mr:0.5}}/>}} /></Grid>

            {(formData.modeOfTransport.includes('drayage') || formData.modeOfTransport.includes('intermodal') || formData.modeOfTransport.includes('ocean')) && ( <>
                <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Drayage / Port / Vessel / Ocean</Typography><Divider/></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Steamship Line" name="steamshipLine" value={formData.steamshipLine} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Vessel Name" name="vesselName" value={formData.vesselName} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Voyage #" name="voyageNumber" value={formData.voyageNumber} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Terminal" name="terminal" value={formData.terminal} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="LFD @ Port" name="lastFreeDayPort" type="date" value={formData.lastFreeDayPort} onChange={handleInputChange} InputLabelProps={{ shrink: true }} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Empty Return Depot" name="emptyReturnDepot" value={formData.emptyReturnDepot} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Empty Return By" name="emptyContainerReturnByDate" type="date" value={formData.emptyContainerReturnByDate} onChange={handleInputChange} InputLabelProps={{ shrink: true }} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Chassis #" name="chassisNumber" value={formData.chassisNumber} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Chassis Type" name="chassisType" value={formData.chassisType} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Chassis Provider" name="chassisProvider" value={formData.chassisProvider} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Chassis Return By" name="chassisReturnByDate" type="date" value={formData.chassisReturnByDate} onChange={handleInputChange} InputLabelProps={{ shrink: true }} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Pickup Appt #" name="pickupAppointmentNumber" value={formData.pickupAppointmentNumber} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Delivery Appt #" name="deliveryAppointmentNumber" value={formData.deliveryAppointmentNumber} onChange={handleInputChange} /></Grid>
              </>)}
            {formData.modeOfTransport.includes('rail') && ( <>
                <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Rail Details</Typography><Divider/></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Rail Origin Ramp" name="railOriginRamp" value={formData.railOriginRamp} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Rail Dest. Ramp" name="railDestinationRamp" value={formData.railDestinationRamp} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Rail Carrier" name="railCarrier" value={formData.railCarrier} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="LFD @ Rail" name="lastFreeDayRail" type="date" value={formData.lastFreeDayRail} onChange={handleInputChange} InputLabelProps={{ shrink: true }} /></Grid>
              </>)}
            {formData.modeOfTransport.includes('air') && ( <>
                <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Air Freight Details</Typography><Divider/></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Airline" name="airline" value={formData.airline} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Flight #" name="flightNumber" value={formData.flightNumber} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="MAWB #" name="masterAirWaybill" value={formData.masterAirWaybill} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="HAWB #" name="houseAirWaybill" value={formData.houseAirWaybill} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={6}><TextField size="small" fullWidth label="Airport of Departure (IATA)" name="airportOfDeparture" value={formData.airportOfDeparture} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={6}><TextField size="small" fullWidth label="Airport of Arrival (IATA)" name="airportOfArrival" value={formData.airportOfArrival} onChange={handleInputChange} /></Grid>
              </>)}
            <Grid item xs={12}><FormControlLabel control={<Checkbox checked={formData.isTransload} onChange={handleInputChange} name="isTransload" size="small"/>} label="Transload Required" /></Grid>
            {formData.isTransload && ( <>
                <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Transload Details</Typography><Divider/></Grid>
                <Grid item xs={12} sm={6} md={4}><TextField size="small" fullWidth label="Transload Facility Name" name="transloadFacilityName" value={formData.transloadFacilityName} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={6} md={4}><TextField size="small" fullWidth label="Transload Date" name="transloadDate" type="date" value={formData.transloadDate} onChange={handleInputChange} InputLabelProps={{ shrink: true }} /></Grid>
                <Grid item xs={12} sm={8} md={4}><TextField size="small" fullWidth label="Transload Facility Address" name="transloadFacilityAddress" value={formData.transloadFacilityAddress} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={5} md={4}><TextField size="small" fullWidth label="Facility City" name="transloadFacilityCity" value={formData.transloadFacilityCity} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={3} md={4}><TextField size="small" fullWidth label="Facility State" name="transloadFacilityState" value={formData.transloadFacilityState} onChange={handleInputChange} /></Grid>
                <Grid item xs={12} sm={4} md={4}><TextField size="small" fullWidth label="Facility Zip" name="transloadFacilityZip" value={formData.transloadFacilityZip} onChange={handleInputChange} /></Grid>
              </>)}

            {/* Documents Section */}
            <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Documents</Typography><Divider/></Grid>
            {formData.attachedDocuments && formData.attachedDocuments.length > 0 && (
            <Grid item xs={12}> <Typography variant="subtitle2">Attached Documents:</Typography> <List dense>
                {formData.attachedDocuments.map(doc => (
                    <ListItem key={doc._id} secondaryAction={<Tooltip title="Remove"><IconButton edge="end" onClick={() => handleRemoveStagedFile(doc._id)}><DeleteDocIcon /></IconButton></Tooltip>}>
                        <ListItemIcon><DocumentFileIcon /></ListItemIcon>
                        <ListItemText primary={<Link href={documentAPI.download(doc._id)} target="_blank" rel="noopener noreferrer">{doc.originalName}</Link>} secondary={`${doc.mimetype || 'N/A'} - ${formatFileSize(doc.size || 0)}`} />
                    </ListItem> ))} </List> </Grid> )}
            <Grid item xs={12}>
            <Paper {...getRootProps()} variant="outlined" sx={{ p: 2, mt:1, textAlign: 'center', cursor: 'pointer', border: isDragActive ? '2px dashed primary.main' : '2px dashed grey.500', backgroundColor: isDragActive ? 'action.hover' : 'transparent'}}>
                <input {...getInputProps()} /> <UploadIcon sx={{fontSize: 30, color: 'text.secondary'}}/>
                {isDragActive ? <Typography>Drop files here...</Typography> : <Typography>Drag 'n' drop files, or click to select</Typography>}
            </Paper>
            {filesToUpload.length > 0 && ( <Box mt={1}> <Typography variant="caption">Selected files to upload:</Typography> <List dense disablePadding>
                {filesToUpload.map((file, index) => ( <ListItem dense disableGutters key={`${file.name}-${index}`} secondaryAction={<IconButton size="small" onClick={() => setFilesToUpload(prev => prev.filter((_, i) => i !== index))}><DeleteDocIcon fontSize="small"/></IconButton>}> <ListItemIcon sx={{minWidth: 30}}><AttachFileIcon fontSize="small"/></ListItemIcon> <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(1)} KB`} /> </ListItem> ))} </List>
                <Button size="small" variant="outlined" onClick={handleUploadNewFiles} sx={{mt:1}} disabled={isUploading}> {isUploading ? <CircularProgress size={20}/> : 'Upload Selected & Stage'} </Button> </Box> )} </Grid>

            <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Financials & Notes</Typography><Divider/></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Customer Rate ($)" name="customerRate" type="number" value={formData.customerRate} onChange={handleInputChange} required /></Grid>
            <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label="Carrier Cost ($)" name="carrierCostTotal" type="number" value={formData.carrierCostTotal} onChange={handleInputChange} required /></Grid>
            <Grid item xs={12} sm={6} md={6}><TextField size="small" fullWidth label="Custom Tags (comma-sep)" name="customTags" value={formData.customTags} onChange={handleInputChange} /></Grid>
            <Grid item xs={12}><TextField size="small" fullWidth label="Internal Notes" name="internalNotes" value={formData.internalNotes} onChange={handleInputChange} multiline minRows={2} /></Grid>
            <Grid item xs={12}><TextField size="small" fullWidth label="Special Instructions (for carrier)" name="specialInstructions" value={formData.specialInstructions} onChange={handleInputChange} multiline minRows={2} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isLoading || isUploading}>
          {isLoading || isUploading ? <CircularProgress size={24} /> : (formData._id ? 'Update Shipment' : 'Save Shipment')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShipmentFormDialog;