// File: frontend/src/pages/shipments/components/QuoteFormDialog.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Grid, TextField, MenuItem, Checkbox, FormControlLabel,
  Typography, Divider, CircularProgress, IconButton, Box, Paper, Autocomplete, Link, List, ListItem, ListItemIcon, ListItemText,
  InputAdornment, Tooltip
} from '@mui/material';
import {
  AddCircleOutline as AddAccessorialIcon,
  RemoveCircleOutline as RemoveAccessorialIcon,
  AttachFile as AttachFileIcon, DeleteOutline as DeleteDocIcon, CloudUpload as UploadIcon,
  Article as DocumentFileIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { lookupAPI, documentAPI, settingsAPI } from '../../../services/api'; // Added settingsAPI
import { toast } from 'react-toastify';
import { useQuery, useQueryClient } from 'react-query';
// import mongoose from 'mongoose'; // Ensure this is removed

// --- Import constants ---
import {
    modeOfTransportOptions as importedModeOfTransportOptions,
    locationTypeOptions as importedLocationTypeOptions
} from '../constants/shipmentOptions';


// --- Type Definitions ---
interface ShipperStub { _id: string; name: string; }
interface CarrierStub { _id: string; name: string; }
interface EquipmentTypeOption { _id: string; name: string; code?: string; category?: string; }
interface AccessorialTypeOption {
    _id: string; name: string; code?: string;
    defaultCustomerRate?: number; defaultCarrierCost?: number;
    isPerUnit?: boolean; unitName?: string;
}
type ModeOfTransportType = typeof importedModeOfTransportOptions[number];
type LocationType = typeof importedLocationTypeOptions[number];


export interface IDocumentStubFE { _id: string; originalName: string; mimetype?: string; path?: string; size?: number; createdAt?: string; }

export interface QuoteAccessorialForm {
  _id?: string;
  accessorialTypeId: string;
  name?: string;
  quantity: number;
  customerRate: number;
  carrierCost: number;
  notes?: string;
}

export interface QuoteFormData {
  _id?: string; quoteNumber?: string; status: 'quote'; shipper: string; carrier?: string;
  modeOfTransport: ModeOfTransportType; equipmentType: string;
  originCity: string; originState: string; originZip?: string;
  originLocationType?: LocationType; originAddress?: string;
  destinationCity: string; destinationState: string; destinationZip?: string;
  destinationLocationType?: LocationType; destinationAddress?: string;
  scheduledPickupDate: string; scheduledDeliveryDate: string;
  commodityDescription: string; totalWeight?: string; pieceCount?: string;
  customerRate: string;
  carrierCostTotal: string;

  fscType?: 'fixed' | 'percentage' | '';
  fscCustomerAmount?: string;
  fscCarrierAmount?: string;

  chassisCustomerCost?: string;
  chassisCarrierCost?: string;

  accessorials: QuoteAccessorialForm[];
  quoteNotes?: string; quoteValidUntil?: string; purchaseOrderNumbers?: string;
  documentIds?: string[]; attachedDocuments?: IDocumentStubFE[];
  billOfLadingNumber?: string; proNumber?: string; deliveryOrderNumber?: string; bookingNumber?: string;
  containerNumber?: string; sealNumber?: string; pickupNumber?: string; proofOfDeliveryNumber?: string; otherReferenceNumbersString?: string;
  steamshipLine?: string; vesselName?: string; voyageNumber?: string; terminal?: string;
  lastFreeDayPort?: string; lastFreeDayRail?: string; emptyReturnDepot?: string; emptyContainerReturnByDate?: string;
  chassisNumber?: string; chassisType?: string; chassisProvider?: string; chassisReturnByDate?: string;
  railOriginRamp?: string; railDestinationRamp?: string; railCarrier?: string;
  airline?: string; flightNumber?: string; masterAirWaybill?: string; houseAirWaybill?: string;
  airportOfDeparture?: string; airportOfArrival?: string;
  isTransload?: boolean; transloadFacilityName?: string; transloadFacilityAddress?: string;
  transloadFacilityCity?: string; transloadFacilityState?: string; transloadFacilityZip?: string;
  transloadDate?: string;
  scheduledPickupTime?: string; pickupAppointmentNumber?: string; actualPickupDateTime?: string;
  scheduledDeliveryTime?: string; deliveryAppointmentNumber?: string; actualDeliveryDateTime?: string;
  equipmentLength?: string; equipmentUnit?: string; packageType?: string; weightUnit?: string;
  isHazardous?: boolean; unNumber?: string; hazmatClass?: string; isTemperatureControlled?: boolean;
  temperatureMin?: string; temperatureMax?: string; tempUnit?: string;
  internalNotes?: string; specialInstructions?: string; customTags?: string;
}

export const initialQuoteFormData: QuoteFormData = {
  status: 'quote', shipper: '', carrier: '', modeOfTransport: 'truckload-ftl', equipmentType: '',
  originCity: '', originState: '', originZip: '', originLocationType: 'shipper_facility', originAddress: '',
  destinationCity: '', destinationState: '', destinationZip: '', destinationLocationType: 'consignee_facility', destinationAddress: '',
  scheduledPickupDate: '', scheduledDeliveryDate: '',
  commodityDescription: '', totalWeight: '', pieceCount: '',
  customerRate: '0', carrierCostTotal: '0',
  fscType: '', fscCustomerAmount: '', fscCarrierAmount: '',
  chassisCustomerCost: '', chassisCarrierCost: '',
  accessorials: [],
  quoteNotes: '', quoteValidUntil: '', purchaseOrderNumbers: '',
  documentIds: [], attachedDocuments: [],
   _id: undefined, quoteNumber: '', billOfLadingNumber: '', proNumber: '', deliveryOrderNumber: '', bookingNumber: '',
  containerNumber: '', sealNumber: '', pickupNumber: '', proofOfDeliveryNumber: '', otherReferenceNumbersString: '',
  steamshipLine: '', vesselName: '', voyageNumber: '', terminal: '',
  lastFreeDayPort: '', lastFreeDayRail: '', emptyReturnDepot: '', emptyContainerReturnByDate: '',
  chassisNumber: '', chassisType: '', chassisProvider: '', chassisReturnByDate: '',
  railOriginRamp: '', railDestinationRamp: '', railCarrier: '',
  airline: '', flightNumber: '', masterAirWaybill: '', houseAirWaybill: '', airportOfDeparture: '', airportOfArrival: '',
  isTransload: false, transloadFacilityName: '', transloadFacilityAddress: '', transloadFacilityCity: '', transloadFacilityState: '', transloadFacilityZip: '', transloadDate: '',
  scheduledPickupTime: '', pickupAppointmentNumber: '', actualPickupDateTime: '',
  scheduledDeliveryTime: '', deliveryAppointmentNumber: '', actualDeliveryDateTime: '',
  equipmentLength: '', equipmentUnit: 'ft', packageType: '', weightUnit: 'lbs',
  isHazardous: false, unNumber: '', hazmatClass: '', isTemperatureControlled: false,
  temperatureMin: '', temperatureMax: '', tempUnit: 'C',
  internalNotes: '', specialInstructions: '', customTags: '',
};

const ALL_QUOTE_FIELDS_FOR_DIALOG = [
  { id: 'shipper', label: 'Shipper' },
  { id: 'carrier', label: 'Carrier' },
  { id: 'modeOfTransport', label: 'Mode of Transport' },
  { id: 'equipmentType', label: 'Equipment Type' },
  { id: 'originCity', label: 'Origin City' },
  { id: 'originState', label: 'Origin State' },
  { id: 'originZip', label: 'Origin Zip Code' },
  { id: 'originAddress', label: 'Origin Address' },
  { id: 'originLocationType', label: 'Origin Location Type' },
  { id: 'destinationCity', label: 'Destination City' },
  { id: 'destinationState', label: 'Destination State' },
  { id: 'destinationZip', label: 'Destination Zip Code' },
  { id: 'destinationAddress', label: 'Destination Address' },
  { id: 'destinationLocationType', label: 'Destination Location Type' },
  { id: 'scheduledPickupDate', label: 'Ready Date' },
  { id: 'scheduledDeliveryDate', label: 'Desired Delivery Date' },
  { id: 'quoteValidUntil', label: 'Quote Valid Until' },
  { id: 'commodityDescription', label: 'Commodity Description' },
  { id: 'totalWeight', label: 'Total Weight' },
  { id: 'pieceCount', label: 'Piece Count' },
  { id: 'customerRate', label: 'Line Haul (Customer Rate)' },
  { id: 'carrierCostTotal', label: 'Line Haul (Carrier Cost)' },
  { id: 'purchaseOrderNumbers', label: 'PO Number(s)' },
  { id: 'quoteNotes', label: 'Quote Notes' },
] as const;

type QuoteFieldIdForDialog = typeof ALL_QUOTE_FIELDS_FOR_DIALOG[number]['id'];

interface QuoteSettingsFromStorage {
  requiredFields: QuoteFieldIdForDialog[];
  quoteNumberPrefix: string;
  quoteNumberNextSequence: number;
}

const defaultQuoteSettings: QuoteSettingsFromStorage = {
  requiredFields: ['shipper', 'modeOfTransport', 'equipmentType', 'originCity', 'originState', 'destinationCity', 'destinationState', 'scheduledPickupDate', 'commodityDescription', 'customerRate'],
  quoteNumberPrefix: 'QT-',
  quoteNumberNextSequence: 1001,
};

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

const formatFileSize = (bytes: number = 0) => { if (bytes === 0) return '0 Bytes'; const k = 1024; const sz = ['Bytes', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sz[i]}`; };

const QuoteFormDialog: React.FC<QuoteFormDialogProps> = ({
  open, onClose, onSubmit, initialData, isLoading,
  shippersList, isLoadingShippers, carriersList, isLoadingCarriers,
  equipmentTypesList, isLoadingEquipmentTypes,
}) => {
  const [formData, setFormData] = useState<QuoteFormData>(initialQuoteFormData);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const { data: fetchedQuoteSettings, isLoading: isLoadingQuoteSettings, isError: isErrorQuoteSettings, error: quoteSettingsError } = useQuery<QuoteSettingsFromStorage>(
    'quoteFormSettings',
    async () => {
        const response = await settingsAPI.getQuoteFormSettings();
        return response.data.data || defaultQuoteSettings;
    },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: open, // Only fetch when the dialog is open
      refetchOnWindowFocus: false,
    }
  );
  const currentQuoteSettings = fetchedQuoteSettings || defaultQuoteSettings;


  const { data: accessorialTypesResponse, isLoading: isLoadingAccessorialTypes } =
    useQuery(['accessorialTypesLookup', formData.modeOfTransport],
            () => lookupAPI.getAccessorialTypes({ mode: formData.modeOfTransport }),
            { enabled: !!formData.modeOfTransport && open });
  const accessorialTypesList: AccessorialTypeOption[] = accessorialTypesResponse?.data?.data?.accessorialTypes || [];

  useEffect(() => {
    if (open) {
      // Settings are now fetched by react-query, no need to manually load here
      if (initialData) {
        setFormData({ ...initialQuoteFormData, ...initialData, accessorials: initialData.accessorials || [], documentIds: initialData.documentIds || [], attachedDocuments: initialData.attachedDocuments || [] });
      } else {
        setFormData({...initialQuoteFormData, status: 'quote', accessorials: [], documentIds: [], attachedDocuments: []});
      }
      setFilesToUpload([]);
    }
  }, [initialData, open]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleSelectChange = (name: keyof QuoteFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAccessorialChange = (index: number, field: keyof QuoteAccessorialForm, value: string | number) => {
    const updatedAccessorials = formData.accessorials.map((acc, i) => {
        if (i === index) {
            const newAcc = { ...acc, [field]: field.endsWith('Rate') || field.endsWith('Cost') || field === 'quantity' ? parseFloat(value as string) || 0 : value };
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

    let fscCustomerValue = 0;
    let fscCarrierValue = 0;

    if (formData.fscType && formData.fscCustomerAmount) {
      const fscAmount = parseFloat(formData.fscCustomerAmount) || 0;
      if (formData.fscType === 'percentage') {
        fscCustomerValue = lineHaulCustomer * (fscAmount / 100);
      } else { fscCustomerValue = fscAmount; }
    }
    if (formData.fscType && formData.fscCarrierAmount) {
      const fscAmount = parseFloat(formData.fscCarrierAmount) || 0;
      if (formData.fscType === 'percentage') {
        fscCarrierValue = lineHaulCarrier * (fscAmount / 100);
      } else { fscCarrierValue = fscAmount; }
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
    return { totalCustomer, totalCarrier, profit, margin, lineHaulCustomer, lineHaulCarrier, fscCustomerValue, fscCarrierValue, chassisCustomerValue, chassisCarrierValue };
  };
  const totals = calculateTotals();

  const onDrop = useCallback((acceptedFiles: File[]) => { setFilesToUpload(prevFiles => [...prevFiles, ...acceptedFiles]); }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

  const handleUploadNewFiles = async () => {
    if (filesToUpload.length === 0) { toast.warn("No new files selected."); return; }
    setIsUploading(true);
    const uploadFormDataAPI = new FormData();
    filesToUpload.forEach(file => uploadFormDataAPI.append('files', file));
    uploadFormDataAPI.append('relatedToType', 'shipment');
    try {
      const response = await documentAPI.upload(uploadFormDataAPI);
      if (response.data.success && response.data.data) {
        const uploadedDocsInfo: IDocumentStubFE[] = response.data.data.map((doc: any) => ({ _id: doc._id, originalName: doc.originalName, mimetype: doc.mimetype, path: doc.path, size: doc.size, createdAt: doc.createdAt }));
        setFormData(prev => ({ ...prev, documentIds: [...new Set([...(prev.documentIds || []), ...uploadedDocsInfo.map(d => d._id)])], attachedDocuments: [...(prev.attachedDocuments || []), ...uploadedDocsInfo] }));
        toast.success(`${uploadedDocsInfo.length} file(s) uploaded and staged.`);
        setFilesToUpload([]);
      } else { toast.error(response.data.message || "File upload failed."); }
    } catch (error: any) { toast.error(error.response?.data?.message || "Error during file upload."); }
    finally { setIsUploading(false); }
  };

  const handleRemoveStagedFile = (fileIdToRemove: string) => {
    setFormData(prev => ({ ...prev, documentIds: prev.documentIds?.filter(id => id !== fileIdToRemove), attachedDocuments: prev.attachedDocuments?.filter(doc => doc._id !== fileIdToRemove) }));
  };

  const isFieldRequired = (fieldId: QuoteFieldIdForDialog): boolean => {
    return currentQuoteSettings.requiredFields.includes(fieldId);
  };

  const handleSubmit = () => {
    const missingFieldsLabels: string[] = [];
    ALL_QUOTE_FIELDS_FOR_DIALOG.forEach(fieldInfo => {
      if (currentQuoteSettings.requiredFields.includes(fieldInfo.id)) {
        const value = formData[fieldInfo.id as keyof QuoteFormData];
        if (fieldInfo.id === 'carrier' && formData.status === 'quote') {
          return;
        }
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
          missingFieldsLabels.push(fieldInfo.label);
        }
      }
    });

    if (missingFieldsLabels.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFieldsLabels.join(', ')}.`);
      return;
    }
    
    const payload = { ...formData };
    onSubmit(payload, payload._id);
  };

  const equipmentIsContainer = equipmentTypesList.find(eq => eq.name === formData.equipmentType)?.category === 'container';
  const showChassisFields = formData.modeOfTransport?.includes('drayage') || equipmentIsContainer;

  if (isLoadingQuoteSettings && open) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Loading Quote Form...</DialogTitle>
            <DialogContent sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px'}}>
                <CircularProgress />
            </DialogContent>
        </Dialog>
    );
  }
  if (isErrorQuoteSettings && open) {
     return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Error</DialogTitle>
            <DialogContent>
                <Typography color="error">Could not load form settings: {(quoteSettingsError as any)?.message || "Unknown error"}</Typography>
            </DialogContent>
            <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
        </Dialog>
     );
  }


  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { maxHeight: '90vh' } }}>
      <DialogTitle>{formData._id ? 'Edit Quote' : 'New Quote'} - {formData.quoteNumber || (formData._id ? '' : `(${currentQuoteSettings.quoteNumberPrefix}...)`)}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0.1 }}>
          {/* Core Quote Info */}
          <Grid item xs={12}><Typography variant="overline">Quote Details</Typography><Divider /></Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              size="small"
              fullWidth
              label="Quote Number (Optional)"
              name="quoteNumber"
              value={formData.quoteNumber || ''}
              onChange={handleInputChange}
              helperText="Auto-generated if blank using settings prefix"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              size="small" select fullWidth
              label={`Shipper${isFieldRequired('shipper') ? '*' : ''}`}
              name="shipper" value={formData.shipper}
              onChange={(e)=>handleSelectChange('shipper', e.target.value)}
              required={isFieldRequired('shipper')}
              disabled={isLoadingShippers}
            >
              {isLoadingShippers ? <MenuItem value=""><em>Loading...</em></MenuItem> : shippersList.map(s => <MenuItem key={s._id} value={s._id}>{s.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              size="small" select fullWidth
              label={`Carrier${isFieldRequired('carrier') && formData.status !== 'quote' ? '*' : ' (Optional)'}`}
              name="carrier"
              value={formData.carrier || ''}
              onChange={(e)=>handleSelectChange('carrier', e.target.value)}
              required={isFieldRequired('carrier') && formData.status !== 'quote'}
              disabled={isLoadingCarriers}
            >
              <MenuItem value=""><em>None Selected</em></MenuItem>
              {isLoadingCarriers ? <MenuItem value=""><em>Loading...</em></MenuItem> : carriersList.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
            </TextField>
          </Grid>

          <Grid item xs={12}><Typography variant="overline" sx={{mt:1}}>Transportation</Typography><Divider /></Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              size="small" select fullWidth
              label={`Mode of Transport${isFieldRequired('modeOfTransport') ? '*' : ''}`}
              name="modeOfTransport"
              value={formData.modeOfTransport}
              onChange={(e) => handleSelectChange('modeOfTransport', e.target.value as ModeOfTransportType)}
              required={isFieldRequired('modeOfTransport')}
            >
              {importedModeOfTransportOptions.map(mode => <MenuItem key={mode} value={mode} sx={{textTransform: 'capitalize'}}>{mode.replace(/-/g, ' ')}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              size="small" select fullWidth
              label={`Equipment Type${isFieldRequired('equipmentType') ? '*' : ''}`}
              name="equipmentType"
              value={formData.equipmentType}
              onChange={(e) => handleSelectChange('equipmentType', e.target.value)}
              required={isFieldRequired('equipmentType')}
              disabled={isLoadingEquipmentTypes}
            >
              {isLoadingEquipmentTypes ? <MenuItem value=""><em>Loading...</em></MenuItem> : equipmentTypesList.length === 0 ? <MenuItem value=""><em>No equipment</em></MenuItem> : equipmentTypesList.map(eq => <MenuItem key={eq._id} value={eq.name}>{eq.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              size="small" fullWidth
              label={`Ready Date${isFieldRequired('scheduledPickupDate') ? '*' : ''}`}
              name="scheduledPickupDate" type="date"
              value={formData.scheduledPickupDate}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              required={isFieldRequired('scheduledPickupDate')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              size="small" fullWidth
              label={`Desired Delivery Date${isFieldRequired('scheduledDeliveryDate') ? '*' : ''}`}
              name="scheduledDeliveryDate" type="date"
              value={formData.scheduledDeliveryDate}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              required={isFieldRequired('scheduledDeliveryDate')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              size="small" fullWidth
              label={`Quote Valid Until${isFieldRequired('quoteValidUntil') ? '*' : ''}`}
              name="quoteValidUntil" type="date"
              value={formData.quoteValidUntil}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
              required={isFieldRequired('quoteValidUntil')}
            />
          </Grid>

          <Grid item xs={12}><Typography variant="overline" sx={{mt:1}}>Route</Typography><Divider /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label={`Origin City${isFieldRequired('originCity') ? '*' : ''}`} name="originCity" value={formData.originCity} onChange={handleInputChange} required={isFieldRequired('originCity')} /></Grid>
          <Grid item xs={12} sm={3} md={2}><TextField size="small" fullWidth label={`Origin State${isFieldRequired('originState') ? '*' : ''}`} name="originState" value={formData.originState} onChange={handleInputChange} required={isFieldRequired('originState')} /></Grid>
          <Grid item xs={12} sm={3} md={2}><TextField size="small" fullWidth label={`Origin Zip${isFieldRequired('originZip') ? '*' : ''}`} name="originZip" value={formData.originZip || ''} onChange={handleInputChange} required={isFieldRequired('originZip')} /></Grid>
          <Grid item xs={12} sm={6} md={2}><TextField size="small" select fullWidth label={`Origin Loc Type${isFieldRequired('originLocationType') ? '*' : ''}`} name="originLocationType" value={formData.originLocationType || ''} onChange={(e) => handleSelectChange('originLocationType', e.target.value as LocationType )} required={isFieldRequired('originLocationType')}>
              <MenuItem value=""><em>Unknown</em></MenuItem>
              {importedLocationTypeOptions.map(lt=><MenuItem key={`orig-${lt}`} value={lt} sx={{textTransform:'capitalize'}}>{lt.replace(/_/g, ' ')}</MenuItem>)}
          </TextField></Grid>
          <Grid item xs={12} md={3}><TextField size="small" fullWidth label={`Origin Address${isFieldRequired('originAddress') ? '*' : ' (Opt.)'}`} name="originAddress" value={formData.originAddress || ''} onChange={handleInputChange} required={isFieldRequired('originAddress')} /></Grid>

          <Grid item xs={12} sm={6} md={3}><TextField size="small" fullWidth label={`Destination City${isFieldRequired('destinationCity') ? '*' : ''}`} name="destinationCity" value={formData.destinationCity} onChange={handleInputChange} required={isFieldRequired('destinationCity')} /></Grid>
          <Grid item xs={12} sm={3} md={2}><TextField size="small" fullWidth label={`Destination State${isFieldRequired('destinationState') ? '*' : ''}`} name="destinationState" value={formData.destinationState} onChange={handleInputChange} required={isFieldRequired('destinationState')} /></Grid>
          <Grid item xs={12} sm={3} md={2}><TextField size="small" fullWidth label={`Destination Zip${isFieldRequired('destinationZip') ? '*' : ''}`} name="destinationZip" value={formData.destinationZip || ''} onChange={handleInputChange} required={isFieldRequired('destinationZip')} /></Grid>
          <Grid item xs={12} sm={6} md={2}><TextField size="small" select fullWidth label={`Dest. Loc Type${isFieldRequired('destinationLocationType') ? '*' : ''}`} name="destinationLocationType" value={formData.destinationLocationType || ''} onChange={(e) => handleSelectChange('destinationLocationType', e.target.value as LocationType )} required={isFieldRequired('destinationLocationType')}>
            <MenuItem value=""><em>Unknown</em></MenuItem>
            {importedLocationTypeOptions.map(lt=><MenuItem key={`dest-${lt}`} value={lt} sx={{textTransform:'capitalize'}}>{lt.replace(/_/g, ' ')}</MenuItem>)}
          </TextField></Grid>
          <Grid item xs={12} md={3}><TextField size="small" fullWidth label={`Destination Address${isFieldRequired('destinationAddress') ? '*' : ' (Opt.)'}`} name="destinationAddress" value={formData.destinationAddress || ''} onChange={handleInputChange} required={isFieldRequired('destinationAddress')} /></Grid>

          <Grid item xs={12}><Typography variant="overline" sx={{mt:1}}>Freight</Typography><Divider /></Grid>
          <Grid item xs={12} sm={8} md={6}><TextField size="small" fullWidth label={`Commodity Description${isFieldRequired('commodityDescription') ? '*' : ''}`} name="commodityDescription" value={formData.commodityDescription} onChange={handleInputChange} required={isFieldRequired('commodityDescription')} /></Grid>
          <Grid item xs={6} sm={2} md={3}><TextField size="small" fullWidth label={`Weight${isFieldRequired('totalWeight') ? '*' : ''}`} name="totalWeight" type="number" value={formData.totalWeight || ''} onChange={handleInputChange} required={isFieldRequired('totalWeight')} /></Grid>
          <Grid item xs={6} sm={2} md={3}><TextField size="small" fullWidth label={`Pieces${isFieldRequired('pieceCount') ? '*' : ''}`} name="pieceCount" type="number" value={formData.pieceCount || ''} onChange={handleInputChange} required={isFieldRequired('pieceCount')} /></Grid>

          <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Charges & Costs</Typography><Divider/></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" fullWidth label={`Line Haul (Customer Rate)${isFieldRequired('customerRate') ? '*' : ''}`} name="customerRate" type="number" value={formData.customerRate} onChange={handleInputChange} required={isFieldRequired('customerRate')} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}} /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" fullWidth label={`Line Haul (Carrier Cost)${isFieldRequired('carrierCostTotal') ? '*' : ''}`} name="carrierCostTotal" type="number" value={formData.carrierCostTotal} onChange={handleInputChange} required={isFieldRequired('carrierCostTotal')} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}} /></Grid>

          <Grid item xs={12} sm={4}>
            <TextField select fullWidth size="small" label="FSC Type" name="fscType" value={formData.fscType || ''} onChange={(e) => handleSelectChange('fscType', e.target.value as 'fixed' | 'percentage' | '')} >
              <MenuItem value=""><em>None</em></MenuItem> <MenuItem value="fixed">Fixed Amount</MenuItem> <MenuItem value="percentage">Percentage</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField size="small" fullWidth label={`FSC Customer ${formData.fscType === 'percentage' ? '(%)' : '($)'}`} name="fscCustomerAmount" type="number" value={formData.fscCustomerAmount || ''} onChange={handleInputChange} InputProps={{ startAdornment: formData.fscType === 'fixed' ? <InputAdornment position="start">$</InputAdornment> : null, endAdornment: formData.fscType === 'percentage' ? <InputAdornment position="end">%</InputAdornment> : null, }} disabled={!formData.fscType} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField size="small" fullWidth label={`FSC Carrier ${formData.fscType === 'percentage' ? '(%)' : '($)'}`} name="fscCarrierAmount" type="number" value={formData.fscCarrierAmount || ''} onChange={handleInputChange} InputProps={{ startAdornment: formData.fscType === 'fixed' ? <InputAdornment position="start">$</InputAdornment> : null, endAdornment: formData.fscType === 'percentage' ? <InputAdornment position="end">%</InputAdornment> : null, }} disabled={!formData.fscType} />
          </Grid>

          {showChassisFields && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Chassis Customer Cost" name="chassisCustomerCost" type="number" value={formData.chassisCustomerCost || ''} onChange={handleInputChange} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Chassis Carrier Cost" name="chassisCarrierCost" type="number" value={formData.chassisCarrierCost || ''} onChange={handleInputChange} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}} />
              </Grid>
            </>
          )}

          <Grid item xs={12}><Typography variant="subtitle2" sx={{mt:1}}>Accessorials</Typography></Grid>
          {formData.accessorials.map((acc, index) => (
            <React.Fragment key={`acc-frag-${index}`}>
              <Grid item xs={12} sm={5} md={3}>
                <Autocomplete size="small" options={accessorialTypesList} getOptionLabel={(option) => option.name || ''} value={accessorialTypesList.find(opt => opt._id === acc.accessorialTypeId) || null} onChange={(event, newValue) => { handleAccessorialChange(index, 'accessorialTypeId', newValue ? newValue._id : ''); }} isOptionEqualToValue={(option, value) => option._id === value?._id} renderInput={(params) => <TextField {...params} label="Accessorial Type" variant="outlined" disabled={isLoadingAccessorialTypes} />} />
              </Grid>
              <Grid item xs={4} sm={2} md={1.5}><TextField size="small" fullWidth label="Qty" name={`accQty${index}`} type="number" value={acc.quantity} onChange={(e) => handleAccessorialChange(index, 'quantity', e.target.value)} InputProps={{ inputProps: { min: 0 } }} /></Grid>
              <Grid item xs={4} sm={2} md={2}><TextField size="small" fullWidth label="Rate" name={`accRate${index}`} type="number" value={acc.customerRate} onChange={(e) => handleAccessorialChange(index, 'customerRate', e.target.value)} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}} /></Grid>
              <Grid item xs={4} sm={2} md={2}><TextField size="small" fullWidth label="Cost" name={`accCost${index}`} type="number" value={acc.carrierCost} onChange={(e) => handleAccessorialChange(index, 'carrierCost', e.target.value)} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}} /></Grid>
              <Grid item xs={10} sm={5} md={2.5}><TextField size="small" fullWidth label="Notes" name={`accNotes${index}`} value={acc.notes || ''} onChange={(e) => handleAccessorialChange(index, 'notes', e.target.value)} /></Grid>
              <Grid item xs={2} sm={1} md={1} display="flex" alignItems="center" justifyContent="center"> <IconButton onClick={() => removeAccessorial(index)} size="small" color="error"><RemoveAccessorialIcon /></IconButton> </Grid>
            </React.Fragment>
          ))}
          <Grid item xs={12}> <Button startIcon={<AddAccessorialIcon />} onClick={addAccessorial} size="small">Add Accessorial</Button> </Grid>

          <Grid item xs={12}><Divider sx={{my:1.5}}/></Grid>
          <Grid item xs={12} sm={3}><Typography variant="subtitle1">Total Quoted: ${totals.totalCustomer.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</Typography></Grid>
          <Grid item xs={12} sm={3}><Typography variant="subtitle1">Total Est. Cost: ${totals.totalCarrier.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</Typography></Grid>
          <Grid item xs={12} sm={3}><Typography variant="subtitle1" color={totals.profit >= 0 ? "green" : "error"}>Est. Profit: ${totals.profit.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</Typography></Grid>
          <Grid item xs={12} sm={3}><Typography variant="subtitle1" color={totals.margin >= 0 ? "green" : "error"}>Est. Margin: {totals.margin.toFixed(2)}%</Typography></Grid>

          <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Attach Documents (Optional)</Typography><Divider/></Grid>
            {formData.attachedDocuments && formData.attachedDocuments.length > 0 && (
            <Grid item xs={12}> <Typography variant="subtitle2">Staged Documents:</Typography> <List dense>
                {formData.attachedDocuments.map(doc => ( <ListItem key={doc._id} secondaryAction={<Tooltip title="Remove"><IconButton edge="end" onClick={() => handleRemoveStagedFile(doc._id)}><DeleteDocIcon /></IconButton></Tooltip>}> <ListItemIcon><DocumentFileIcon /></ListItemIcon> <ListItemText primary={<Link href={documentAPI.download(doc._id)} target="_blank" rel="noopener noreferrer">{doc.originalName}</Link>} secondary={`${doc.mimetype || 'N/A'} - ${formatFileSize(doc.size || 0)}`} /> </ListItem> ))} </List> </Grid> )}
            <Grid item xs={12}>
            <Paper {...getRootProps()} variant="outlined" sx={{ p: 2, mt:1, textAlign: 'center', cursor: 'pointer', border: isDragActive ? '2px dashed primary.main' : '2px dashed grey.500', backgroundColor: isDragActive ? 'action.hover' : 'transparent'}}>
                <input {...getInputProps()} /> <UploadIcon sx={{fontSize: 30, color: 'text.secondary'}}/>
                {isDragActive ? <Typography>Drop files here...</Typography> : <Typography>Drag 'n' drop files, or click to select</Typography>}
            </Paper>
            {filesToUpload.length > 0 && ( <Box mt={1}> <Typography variant="caption">Selected files for upload:</Typography> <List dense disablePadding> {filesToUpload.map((file, index) => ( <ListItem dense disableGutters key={`${file.name}-${index}`} secondaryAction={<IconButton size="small" onClick={() => setFilesToUpload(prev => prev.filter((_, i) => i !== index))}><DeleteDocIcon fontSize="small"/></IconButton>}> <ListItemIcon sx={{minWidth: 30}}><AttachFileIcon fontSize="small"/></ListItemIcon> <ListItemText primary={file.name} secondary={`${(file.size / 1024).toFixed(1)} KB`} /> </ListItem> ))} </List> <Button size="small" variant="outlined" onClick={handleUploadNewFiles} sx={{mt:1}} disabled={isUploading}> {isUploading ? <CircularProgress size={20}/> : 'Upload Selected & Stage'} </Button> </Box> )} </Grid>

          <Grid item xs={12}><Typography variant="overline" sx={{mt:1.5}}>Additional Info</Typography><Divider /></Grid>
          <Grid item xs={12} sm={6}><TextField size="small" fullWidth label={`PO Number(s)${isFieldRequired('purchaseOrderNumbers') ? '*' : ' (comma-sep)'}`} name="purchaseOrderNumbers" value={formData.purchaseOrderNumbers || ''} onChange={handleInputChange} required={isFieldRequired('purchaseOrderNumbers')} /></Grid>
          <Grid item xs={12}><TextField size="small" fullWidth label={`Quote Notes${isFieldRequired('quoteNotes') ? '*' : ' / Internal Notes'}`} name="quoteNotes" value={formData.quoteNotes || ''} onChange={handleInputChange} multiline minRows={2} required={isFieldRequired('quoteNotes')} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isLoading || isUploading || isLoadingQuoteSettings}>
          {isLoading || isUploading || isLoadingQuoteSettings ? <CircularProgress size={24} sx={{color: 'white'}} /> : (formData._id ? 'Update Quote' : 'Save Quote')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuoteFormDialog;