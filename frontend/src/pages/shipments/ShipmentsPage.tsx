// File: frontend/src/pages/shipments/ShipmentsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, TextField, InputAdornment, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Grid, Paper, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, RequestQuote as QuoteIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { shipmentAPI, shipperAPI, carrierAPI, lookupAPI } from '../../services/api';
import { toast } from 'react-toastify';
// import mongoose from 'mongoose'; // REMOVED - Not for frontend

// Import child components
import ShipmentFormDialog, { ShipmentFormDataForDialog } from './components/ShipmentFormDialog';
import QuoteFormDialog, { QuoteFormData } from './components/QuoteFormDialog';
import ShipmentsTable from './components/ShipmentsTable';
import CheckInDialog from './components/CheckInDialog';
import EmailGenDialog from './components/EmailGenDialog';

// Import mappers and initial form data from utils
import {
    mapShipmentToShipmentFormData,
    mapShipmentToQuoteFormData,
    initialShipmentFormData,
    initialQuoteFormData,
    formatDateForInput, formatDateTimeForInput
} from './utils/shipmentFormMappers';

// Import option constants
import {
  statusOptions as allStatusOptions,
  checkinMethodOptions,
  modeOfTransportOptions,
  locationTypeOptions
} from './constants/shipmentOptions';


// --- Interfaces ---
interface UserStub { _id: string; firstName?: string; lastName?: string; email?: string; }
interface ShipperStub { _id: string; name: string; contact?: { email?: string; name?: string; }}
interface CarrierStub { _id: string; name: string; contact?: { email?: string; name?: string; }}
interface EquipmentTypeOption { _id: string; name: string; code?: string; category?: string; }

type ModeOfTransportTypeLocal = typeof modeOfTransportOptions[number];
type LocationTypeLocal = typeof locationTypeOptions[number];
type StatusType = string;

interface CheckIn { _id?: string; dateTime: string | Date; method: string; notes: string; contactPerson?: string; currentLocation?: string; statusUpdate?: StatusType; createdBy?: UserStub | string;}
interface CheckInFormDataForPage { dateTime: string | Date; method: string; contactPerson?: string; currentLocation?: string; notes: string; statusUpdate?: StatusType | '';}
interface IReferenceNumberFE { type: string; value: string; _id?: string; }
interface IDocumentStubFE { _id: string; originalName: string; mimetype?: string; path?: string; size?: number; createdAt?: string; }

export interface Shipment {
  _id: string; shipmentNumber?: string; // Made shipmentNumber optional for initial quote data
  shipper: ShipperStub | string | null; carrier: CarrierStub | string | null;
  modeOfTransport: ModeOfTransportTypeLocal; status: StatusType;
  origin: { name?:string; city?: string; state?: string; address?: string; country?: string; locationType?: LocationTypeLocal; contactName?:string; contactPhone?:string; contactEmail?:string; notes?:string;};
  destination: { name?:string; city?: string; state?: string; address?: string; country?: string; locationType?: LocationTypeLocal; contactName?:string; contactPhone?:string; contactEmail?:string; notes?:string;};
  scheduledPickupDate: string; scheduledPickupTime?: string; pickupAppointmentNumber?: string; actualPickupDateTime?: string;
  scheduledDeliveryDate: string; scheduledDeliveryTime?: string; deliveryAppointmentNumber?: string; actualDeliveryDateTime?: string;
  billOfLadingNumber?: string; proNumber?: string; deliveryOrderNumber?: string; bookingNumber?: string;
  containerNumber?: string; sealNumber?: string; pickupNumber?: string; proofOfDeliveryNumber?: string;
  purchaseOrderNumbers?: string[]; otherReferenceNumbers?: IReferenceNumberFE[];
  steamshipLine?: string; vesselName?: string; voyageNumber?: string; terminal?: string;
  lastFreeDayPort?: string; lastFreeDayRail?: string; emptyReturnDepot?: string; emptyContainerReturnByDate?: string;
  chassisNumber?: string; chassisType?: string; chassisProvider?: string; chassisReturnByDate?: string;
  railOriginRamp?: string; railDestinationRamp?: string; railCarrier?: string;
  airline?: string; flightNumber?: string; masterAirWaybill?: string; houseAirWaybill?: string;
  airportOfDeparture?: string; airportOfArrival?: string;
  isTransload?: boolean; transloadFacility?: { name?: string; address?: string; city?: string; state?: string; zip?: string; };
  transloadDate?: string; equipmentType: string; equipmentLength?: number; equipmentUnit?: string;
  commodityDescription: string; pieceCount?: number; packageType?: string; totalWeight?: number;
  weightUnit?: string; isHazardous?: boolean; unNumber?: string; hazmatClass?: string;
  isTemperatureControlled?: boolean; temperatureMin?: number; temperatureMax?: number; tempUnit?: string;
  customerRate: number; carrierCostTotal: number; grossProfit?: number; margin?: number;
  fscType?: 'fixed' | 'percentage' | ''; fscCustomerAmount?: string; fscCarrierAmount?: string;
  chassisCustomerCost?: string; chassisCarrierCost?: string;
  internalNotes?: string; specialInstructions?: string; customTags?: string[];
  checkIns?: CheckIn[]; documents?: IDocumentStubFE[]; createdBy?: UserStub | string; quoteNotes?: string; quoteValidUntil?: string; accessorials?: any[];
  updatedAt?: string; createdAt?: string;
}


const initialCheckInFormDataState: CheckInFormDataForPage = { dateTime: new Date().toISOString().substring(0,16), method: 'email', notes: '', statusUpdate: '' };

interface ShipmentsPageProps { mode?: 'edit'; }

const ShipmentsPage: React.FC<ShipmentsPageProps> = ({ mode }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { shipmentId: shipmentIdFromUrl } = useParams<{ shipmentId?: string }>();

  const [activeTab, setActiveTab] = useState<'shipments' | 'quotes'>('shipments');
  const [isShipmentFormOpen, setIsShipmentFormOpen] = useState(false);
  const [editingShipmentInitialData, setEditingShipmentInitialData] = useState<ShipmentFormDataForDialog | null>(null);
  const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false);
  const [editingQuoteInitialData, setEditingQuoteInitialData] = useState<QuoteFormData | null>(null);

  const [isCheckInFormOpen, setIsCheckInFormOpen] = useState(false);
  const [isEmailGenOpen, setIsEmailGenOpen] = useState(false);
  const [currentShipmentForAction, setCurrentShipmentForAction] = useState<Shipment | null>(null);
  const [checkInFormDataForDialog, setCheckInFormDataForDialog] = useState<CheckInFormDataForPage>(initialCheckInFormDataState);
  const [generatedEmailContent, setGeneratedEmailContent] = useState('');

  const [searchTermInput, setSearchTermInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timerId = setTimeout(() => { setDebouncedSearchTerm(searchTermInput); }, 500);
    return () => clearTimeout(timerId);
  }, [searchTermInput]);

  const { data: apiResponse, isLoading: isLoadingItems, isError: isErrorItems, error: errorItems } =
    useQuery(['shipmentsAndQuotes', debouncedSearchTerm, activeTab],
    () => shipmentAPI.getAll({ limit: 100, sort: '-createdAt', ...(debouncedSearchTerm && { searchTerm: debouncedSearchTerm }), ...(activeTab === 'quotes' ? { status: 'quote' } : { statusesNotIn: 'quote' }) }), { keepPreviousData: true });
  const displayItems: Shipment[] = apiResponse?.data?.data?.shipments || [];

  const { data: shippersResponse, isLoading: isLoadingShippers } = useQuery('shippersListForForms', () => shipperAPI.getAll({ limit: 200, select: 'name _id' }));
  const shippersList: ShipperStub[] = shippersResponse?.data?.data?.shippers || [];
  const { data: carriersResponse, isLoading: isLoadingCarriers } = useQuery('carriersListForForms', () => carrierAPI.getAll({ limit: 200, select: 'name _id' }));
  const carriersList: CarrierStub[] = carriersResponse?.data?.data?.carriers || [];
  const { data: equipmentTypesResponse, isLoading: isLoadingEquipmentTypes } = useQuery('equipmentTypesLookup', lookupAPI.getEquipmentTypes);
  const equipmentTypesList: EquipmentTypeOption[] = equipmentTypesResponse?.data?.data?.equipmentTypes || [];

  const { isLoading: isLoadingItemToEdit } = useQuery(['itemDetailsForEdit', shipmentIdFromUrl], () => shipmentAPI.getById(shipmentIdFromUrl!),
    {
      enabled: mode === 'edit' && !!shipmentIdFromUrl,
      onSuccess: (data) => {
        if (data?.data?.data) {
          const itemRecord: Shipment = data.data.data;
          if (itemRecord.status === 'quote') {
            const quoteFormDataMapped = mapShipmentToQuoteFormData(itemRecord);
            setEditingQuoteInitialData(quoteFormDataMapped);
            setIsQuoteFormOpen(true); setActiveTab('quotes');
          } else {
            const shipmentFormDataVal = mapShipmentToShipmentFormData(itemRecord);
            setEditingShipmentInitialData(shipmentFormDataVal);
            setIsShipmentFormOpen(true); setActiveTab('shipments');
          }
        } else if (mode === 'edit') { toast.error(`Item with ID ${shipmentIdFromUrl} not found.`); navigate('/shipments', { replace: true }); }
      },
      onError: (err: any) => { if (mode === 'edit') { toast.error(`Error fetching item: ${err.message}`); navigate('/shipments', { replace: true }); } }
    }
  );

  const itemMutation = useMutation(
    (data: { id?: string, formData: any }) => data.id ? shipmentAPI.update(data.id, data.formData) : shipmentAPI.create(data.formData),
    {
        onSuccess: (response, variables) => { toast.success(response.data.message || `Item ${variables.id ? 'updated' : 'created'}!`); queryClient.invalidateQueries('shipmentsAndQuotes'); setIsShipmentFormOpen(false); setIsQuoteFormOpen(false); setEditingShipmentInitialData(null); setEditingQuoteInitialData(null); },
        onError: (err: any, variables) => { toast.error(err.response?.data?.message || `Error ${variables.id ? 'updating' : 'creating'} item.`); console.error("Item Mutation error:", err.response?.data || err.message); },
    }
  );
  const addCheckInMutation = useMutation( (data: { shipmentId: string, checkInData: Partial<CheckInFormDataForPage> }) => shipmentAPI.addCheckIn(data.shipmentId, data.checkInData), { onSuccess: (response) => { toast.success(response.data.message || "Check-in added!"); queryClient.invalidateQueries('shipmentsAndQuotes'); queryClient.invalidateQueries(['shipmentDetails', currentShipmentForAction?._id]); queryClient.invalidateQueries(['itemDetailsForEdit', currentShipmentForAction?._id]); setIsCheckInFormOpen(false); }, onError: (err: any) => {toast.error(err.response?.data?.message || "Error adding check-in.");}});
  const generateEmailMutation = useMutation( (shipmentId: string) => shipmentAPI.generateEmail(shipmentId), { onSuccess: (response) => { setGeneratedEmailContent(response.data.data.emailContent); const shipmentContext = response.data.data.shipmentForContext || displayItems.find(s => s._id === shipmentId); setCurrentShipmentForAction(shipmentContext || null); setIsEmailGenOpen(true); }, onError: (err: any) => {toast.error(err.response?.data?.message || "Error generating email.");}});

  const deleteItemMutation = useMutation(
    (itemId: string) => shipmentAPI.delete(itemId),
    {
      onSuccess: (response, itemId) => {
        toast.success(response?.data?.message || `Item deleted successfully!`);
        queryClient.invalidateQueries('shipmentsAndQuotes');
        queryClient.invalidateQueries(['shipmentDetails', itemId]); // Invalidate specific item cache
        queryClient.invalidateQueries(['itemDetailsForEdit', itemId]);
      },
      onError: (error: any, itemId) => {
        toast.error(error.response?.data?.message || `Error deleting item.`);
        console.error("Delete Item error:", error.response?.data || error.message);
      },
    }
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: 'shipments' | 'quotes') => { setActiveTab(newValue); };

  const handleOpenFormDialog = (itemToEdit?: Shipment) => {
    const isQuoteContext = activeTab === 'quotes' || itemToEdit?.status === 'quote';
    if (isQuoteContext) {
      if (itemToEdit) { setEditingQuoteInitialData(mapShipmentToQuoteFormData(itemToEdit)); }
      else { setEditingQuoteInitialData({...initialQuoteFormData}); }
      setIsQuoteFormOpen(true);
    } else {
      if (itemToEdit) { setEditingShipmentInitialData(mapShipmentToShipmentFormData(itemToEdit)); }
      else { setEditingShipmentInitialData({...initialShipmentFormData, status: 'booked' }); }
      setIsShipmentFormOpen(true);
    }
  };
  const handleCloseShipmentForm = () => { setIsShipmentFormOpen(false); setEditingShipmentInitialData(null); if (mode === 'edit' && shipmentIdFromUrl && activeTab === 'shipments') navigate('/shipments', {replace: true}); };
  const handleCloseQuoteForm = () => { setIsQuoteFormOpen(false); setEditingQuoteInitialData(null); if (mode === 'edit' && shipmentIdFromUrl && activeTab === 'quotes') navigate('/shipments', {replace: true}); };

  const handleSaveItemForm = (formDataFromDialog: ShipmentFormDataForDialog | QuoteFormData, idToUpdate?: string) => {
    let apiPayload: any;
    const isQuoteForm = formDataFromDialog.status === 'quote';
    const loggedInUserIdPlaceholder = "6653cd3f59985b9329451689"; // REPLACE with actual auth user ID

    if (isQuoteForm) {
        const quoteData = formDataFromDialog as QuoteFormData;
        apiPayload = {
            status: 'quote', shipmentNumber: quoteData.quoteNumber || undefined,
            shipper: quoteData.shipper, carrier: quoteData.carrier || undefined,
            modeOfTransport: quoteData.modeOfTransport, equipmentType: quoteData.equipmentType,
            origin: { name: '', address: quoteData.originAddress, city: quoteData.originCity, state: quoteData.originState, zip: quoteData.originZip, locationType: quoteData.originLocationType },
            destination: { name: '', address: quoteData.destinationAddress, city: quoteData.destinationCity, state: quoteData.destinationState, zip: quoteData.destinationZip, locationType: quoteData.destinationLocationType },
            scheduledPickupDate: quoteData.scheduledPickupDate ? new Date(quoteData.scheduledPickupDate).toISOString() : undefined,
            scheduledDeliveryDate: quoteData.scheduledDeliveryDate ? new Date(quoteData.scheduledDeliveryDate).toISOString() : undefined,
            commodityDescription: quoteData.commodityDescription,
            totalWeight: parseFloat(quoteData.totalWeight || '0') || undefined,
            pieceCount: parseInt(quoteData.pieceCount || '0') || undefined,
            customerRate: parseFloat(quoteData.customerRate) || 0,
            carrierCostTotal: parseFloat(quoteData.carrierCostTotal) || 0,

            fscType: quoteData.fscType || undefined,
            fscCustomerAmount: quoteData.fscCustomerAmount ? parseFloat(quoteData.fscCustomerAmount) : undefined,
            fscCarrierAmount: quoteData.fscCarrierAmount ? parseFloat(quoteData.fscCarrierAmount) : undefined,

            chassisCustomerCost: quoteData.chassisCustomerCost ? parseFloat(quoteData.chassisCustomerCost) : undefined,
            chassisCarrierCost: quoteData.chassisCarrierCost ? parseFloat(quoteData.chassisCarrierCost) : undefined,

            accessorials: quoteData.accessorials.map(acc => ({
                accessorialTypeId: acc.accessorialTypeId,
                name: acc.name,
                quantity: acc.quantity,
                customerRate: acc.customerRate,
                carrierCost: acc.carrierCost,
                notes: acc.notes,
                _id: acc._id ? acc._id : undefined
            })),
            quoteNotes: quoteData.quoteNotes, quoteValidUntil: quoteData.quoteValidUntil ? new Date(quoteData.quoteValidUntil).toISOString() : undefined,
            purchaseOrderNumbers: quoteData.purchaseOrderNumbers?.split(',').map(po => po.trim()).filter(po => po) || [],
            billOfLadingNumber: quoteData.billOfLadingNumber, proNumber: quoteData.proNumber, deliveryOrderNumber: quoteData.deliveryOrderNumber,
            bookingNumber: quoteData.bookingNumber, containerNumber: quoteData.containerNumber, sealNumber: quoteData.sealNumber,
            pickupNumber: quoteData.pickupNumber, proofOfDeliveryNumber: quoteData.proofOfDeliveryNumber,
            otherReferenceNumbers: quoteData.otherReferenceNumbersString?.split(',').map(refStr => { const [type, ...valP] = refStr.split(':'); return { type: type?.trim(), value: valP.join(':')?.trim() }; }).filter(ref => ref.type && ref.value) || [],
            documentIds: quoteData.documentIds || [],
            createdBy: idToUpdate ? undefined : loggedInUserIdPlaceholder,
            updatedBy: idToUpdate ? loggedInUserIdPlaceholder : undefined,
        };
    } else {
        const shipmentData = formDataFromDialog as ShipmentFormDataForDialog;
        const { purchaseOrderNumbers: poString, otherReferenceNumbersString, _id, attachedDocuments, ...restOfFormData } = shipmentData;
        const parseDate = (dateStr: string) => dateStr ? new Date(dateStr).toISOString() : undefined;
        const parseDateTime = (dateTimeStr: string) => dateTimeStr ? new Date(dateTimeStr).toISOString() : undefined;
        apiPayload = {
            ...restOfFormData, shipmentNumber: shipmentData.shipmentNumber || undefined,
            shipper: shipmentData.shipper || undefined, carrier: shipmentData.carrier || undefined,
            equipmentLength: parseFloat(shipmentData.equipmentLength) || undefined,
            pieceCount: parseInt(shipmentData.pieceCount) || undefined,
            totalWeight: parseFloat(shipmentData.totalWeight) || undefined,
            temperatureMin: parseFloat(shipmentData.temperatureMin) || undefined,
            temperatureMax: parseFloat(shipmentData.temperatureMax) || undefined,
            customerRate: parseFloat(shipmentData.customerRate) || 0,
            carrierCostTotal: parseFloat(shipmentData.carrierCostTotal) || 0,
            purchaseOrderNumbers: poString?.split(',').map(po => po.trim()).filter(po => po) || [],
            otherReferenceNumbers: otherReferenceNumbersString?.split(',')
                .map(refStr => { const [type, ...valP] = refStr.split(':'); return { type: type?.trim(), value: valP.join(':')?.trim() }; })
                .filter(ref => ref.type && ref.value) || [],
            customTags: shipmentData.customTags?.split(',').map(tag => tag.trim()).filter(tag => tag) || [],
            origin: { name: shipmentData.originName, address: shipmentData.originAddress, city: shipmentData.originCity, state: shipmentData.originState, zip: shipmentData.originZip, country: shipmentData.originCountry, locationType: shipmentData.originLocationType, contactName: shipmentData.originContactName, contactPhone: shipmentData.originContactPhone, contactEmail: shipmentData.originContactEmail, notes: shipmentData.originNotes },
            destination: { name: shipmentData.destinationName, address: shipmentData.destinationAddress, city: shipmentData.destinationCity, state: shipmentData.destinationState, zip: shipmentData.destinationZip, country: shipmentData.destinationCountry, locationType: shipmentData.destinationLocationType, contactName: shipmentData.destinationContactName, contactPhone: shipmentData.destinationContactPhone, contactEmail: shipmentData.destinationContactEmail, notes: shipmentData.destinationNotes },
            transloadFacility: shipmentData.isTransload ? { name: shipmentData.transloadFacilityName, address: shipmentData.transloadFacilityAddress, city: shipmentData.transloadFacilityCity, state: shipmentData.transloadFacilityState, zip: shipmentData.transloadFacilityZip } : undefined,
            documentIds: shipmentData.documentIds || [],
            scheduledPickupDate: parseDate(shipmentData.scheduledPickupDate), scheduledDeliveryDate: parseDate(shipmentData.scheduledDeliveryDate),
            lastFreeDayPort: parseDate(shipmentData.lastFreeDayPort), lastFreeDayRail: parseDate(shipmentData.lastFreeDayRail),
            emptyContainerReturnByDate: parseDate(shipmentData.emptyContainerReturnByDate), chassisReturnByDate: parseDate(shipmentData.chassisReturnByDate),
            transloadDate: parseDate(shipmentData.transloadDate), actualPickupDateTime: parseDateTime(shipmentData.actualPickupDateTime),
            actualDeliveryDateTime: parseDateTime(shipmentData.actualDeliveryDateTime),
            createdBy: idToUpdate ? undefined : loggedInUserIdPlaceholder, updatedBy: idToUpdate ? loggedInUserIdPlaceholder : undefined,
        };
        if (!apiPayload.isTransload) delete apiPayload.transloadFacility;
          ['equipmentLength', 'pieceCount', 'totalWeight', 'temperatureMin', 'temperatureMax'].forEach(key => { if (isNaN(apiPayload[key]) || apiPayload[key] === null) delete apiPayload[key]; });
          if (!apiPayload.scheduledPickupTime?.trim()) delete apiPayload.scheduledPickupTime;
          if (!apiPayload.scheduledDeliveryTime?.trim()) delete apiPayload.scheduledDeliveryTime;
    }
    itemMutation.mutate({ id: idToUpdate || formDataFromDialog._id, formData: apiPayload });
  };

  // --- ADDED: Delete Handler ---
  const handleDeleteItem = (itemToDelete: Shipment) => {
    if (window.confirm(`Are you sure you want to delete ${activeTab === 'quotes' ? 'quote' : 'shipment'} #${itemToDelete.shipmentNumber || itemToDelete._id}? This action cannot be undone.`)) {
      deleteItemMutation.mutate(itemToDelete._id);
    }
  };

  const handleOpenCheckInForm = (item: Shipment) => { setCurrentShipmentForAction(item); setCheckInFormDataForDialog({...initialCheckInFormDataState, dateTime: new Date().toISOString().substring(0,16)}); setIsCheckInFormOpen(true);};
  const handleCloseCheckInForm = () => setIsCheckInFormOpen(false);
  const handleSaveCheckIn = (checkInDataFromDialog: CheckInFormDataForPage) => {
    if (!currentShipmentForAction) return;
    if (!checkInDataFromDialog.notes || !checkInDataFromDialog.dateTime) {
        toast.error("Date/Time and Notes are required for check-in."); return;
    }
    addCheckInMutation.mutate({
        shipmentId: currentShipmentForAction._id,
        checkInData: {...checkInDataFromDialog, dateTime: new Date(checkInDataFromDialog.dateTime as string).toISOString()}
    });
  };

  const handleGenerateEmail = (item: Shipment) => { setCurrentShipmentForAction(item); generateEmailMutation.mutate(item._id);};
  const handleCloseEmailGen = () => setIsEmailGenOpen(false);
  const handleOpenDetailView = (item: Shipment) => { navigate(`/shipments/${item._id}`); };

  const getStatusColor = (status: string | undefined): "default" | "primary"| "secondary" | "warning" | "info" | "success" | "error" => {
      switch (status?.toLowerCase().replace(/_/g, ' ')) {
        case 'quote': return 'default'; case 'pending': return 'warning';
        case 'booked': case 'dispatched': case 'at pickup': case 'in transit origin drayage': case 'at origin port ramp': case 'in transit main leg': case 'at destination port ramp': case 'in transit destination drayage': case 'at delivery': return 'info';
        case 'picked up': case 'delivered': case 'pod received': return 'success';
        case 'invoiced': return 'primary'; case 'paid': return 'secondary';
        case 'cancelled': case 'on hold': case 'problem': return 'error';
        default: return 'default';
      }
  };
  const getDisplayName = (entity: ShipperStub | CarrierStub | UserStub | string | null | undefined): string => {
    if (!entity) return 'N/A';
    if (typeof entity === 'string') {
      const shipper = shippersList.find(s => s._id === entity); if (shipper) return shipper.name;
      const carrier = carriersList.find(c => c._id === entity); if (carrier) return carrier.name;
      return `ID: ${entity.substring(0, 8)}...`;
    }
    if (entity && 'firstName' in entity && entity.firstName && 'lastName' in entity && entity.lastName) return `${entity.firstName} ${entity.lastName}`;
    return (entity as any).name || 'Unknown';
  };

  const overallIsLoading = isLoadingItems || isLoadingShippers || isLoadingCarriers || isLoadingEquipmentTypes || (mode === 'edit' && isLoadingItemToEdit);

  if (overallIsLoading) {
    return <Box sx={{p:3, textAlign:'center', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }
  if (isErrorItems) {
    return <Alert severity="error">Error fetching items: {(errorItems as any)?.response?.data?.message || (errorItems as any)?.message || 'Unknown error'}</Alert>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h4">Shipments & Quotes</Typography>
        <Box display="flex" alignItems="center">
            <TextField label={`Search ${activeTab === 'quotes' ? 'Quotes' : 'Shipments'}`} variant="outlined" size="small" value={searchTermInput} onChange={(e) => setSearchTermInput(e.target.value)} sx={{ mr: 2, minWidth: 300 }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>), }} />
            <Button variant="contained" startIcon={activeTab === 'quotes' ? <QuoteIcon /> : <AddIcon />} onClick={() => handleOpenFormDialog()}>
              {activeTab === 'quotes' ? 'New Quote' : 'New Shipment'}
            </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="Shipments or Quotes Tabs">
          <Tab label={`Active Shipments (${displayItems.filter(it => it.status !== 'quote').length})`} value="shipments" />
          <Tab label={`Quotes (${displayItems.filter(it => it.status === 'quote').length})`} value="quotes" />
        </Tabs>
      </Box>

      <ShipmentsTable
        items={displayItems}
        isLoading={isLoadingItems}
        activeTab={activeTab}
        onEditItem={handleOpenFormDialog}
        onViewDetails={handleOpenDetailView}
        onAddCheckIn={handleOpenCheckInForm}
        onGenerateEmail={handleGenerateEmail}
        onDeleteItem={handleDeleteItem}
        getDisplayName={getDisplayName}
        getStatusColor={getStatusColor}
      />

      {isShipmentFormOpen && editingShipmentInitialData && (
        <ShipmentFormDialog
          open={isShipmentFormOpen} onClose={handleCloseShipmentForm} onSubmit={handleSaveItemForm}
          initialData={editingShipmentInitialData} isLoading={itemMutation.isLoading}
          shippersList={shippersList} isLoadingShippers={isLoadingShippers}
          carriersList={carriersList} isLoadingCarriers={isLoadingCarriers}
          equipmentTypesList={equipmentTypesList} isLoadingEquipmentTypes={isLoadingEquipmentTypes}
        />
      )}
      {isQuoteFormOpen && editingQuoteInitialData && (
        <QuoteFormDialog
            open={isQuoteFormOpen} onClose={handleCloseQuoteForm} onSubmit={handleSaveItemForm}
            initialData={editingQuoteInitialData} isLoading={itemMutation.isLoading}
            shippersList={shippersList} isLoadingShippers={isLoadingShippers}
            carriersList={carriersList} isLoadingCarriers={isLoadingCarriers}
            equipmentTypesList={equipmentTypesList} isLoadingEquipmentTypes={isLoadingEquipmentTypes}
            // modeOfTransportOptions and locationTypeOptions are now imported directly by QuoteFormDialog
        />
      )}

      {currentShipmentForAction && isCheckInFormOpen && (
        <CheckInDialog
            open={isCheckInFormOpen}
            onClose={handleCloseCheckInForm}
            onSubmit={handleSaveCheckIn}
            isLoading={addCheckInMutation.isLoading}
            shipmentNumber={currentShipmentForAction?.shipmentNumber}
        />
      )}

      {currentShipmentForAction && isEmailGenOpen && (
        <EmailGenDialog
            open={isEmailGenOpen}
            onClose={handleCloseEmailGen}
            emailContent={generatedEmailContent}
            shipmentNumber={currentShipmentForAction?.shipmentNumber}
            recipientInfo={typeof currentShipmentForAction?.shipper === 'object' ? currentShipmentForAction?.shipper?.contact?.email || currentShipmentForAction?.shipper?.name : 'Shipper Contact'}
        />
      )}
    </Box>
  );
};

export default ShipmentsPage;