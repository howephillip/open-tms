import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { shipmentAPI, shipperAPI, carrierAPI, lookupAPI } from '../../services/api';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import ShipmentFormDialog, { ShipmentFormDataForDialog } from './components/ShipmentFormDialog';
import ShipmentsTable from './components/ShipmentsTable';
import CheckInDialog from './components/CheckInDialog';
import EmailGenDialog from './components/EmailGenDialog';
import { mapShipmentToShipmentFormData, initialShipmentFormData } from './utils/shipmentFormMappers';

export interface Shipment {
  _id: string; shipmentNumber?: string; shipper: any; carrier: any;
  modeOfTransport: any; status: any; origin: any; destination: any;
  scheduledPickupDate: string; scheduledDeliveryDate: string;
  [key: string]: any; 
}
interface ShipperStub { _id: string; name: string; }
interface CarrierStub { _id: string; name: string; }
interface EquipmentTypeOption { _id: string; name: string; }
interface CheckInFormDataForPage { dateTime: string | Date; method: string; contactPerson?: string; currentLocation?: string; notes: string; statusUpdate?: string | '';}

const initialCheckInFormDataState: CheckInFormDataForPage = { dateTime: new Date().toISOString().substring(0,16), method: 'email', notes: '', statusUpdate: '' };

interface ShipmentsPageProps { mode?: 'edit'; }

const ShipmentsPage: React.FC<ShipmentsPageProps> = ({ mode }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { shipmentId: shipmentIdFromUrl } = useParams<{ shipmentId?: string }>();

  const [isShipmentFormOpen, setIsShipmentFormOpen] = useState(false);
  const [editingShipmentInitialData, setEditingShipmentInitialData] = useState<ShipmentFormDataForDialog | null>(null);
  const [isCheckInFormOpen, setIsCheckInFormOpen] = useState(false);
  const [isEmailGenOpen, setIsEmailGenOpen] = useState(false);
  const [currentShipmentForAction, setCurrentShipmentForAction] = useState<Shipment | null>(null);
  const [generatedEmailContent, setGeneratedEmailContent] = useState('');
  const [searchTermInput, setSearchTermInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timerId = setTimeout(() => { setDebouncedSearchTerm(searchTermInput); }, 500);
    return () => clearTimeout(timerId);
  }, [searchTermInput]);

  const { data: apiResponse, isLoading: isLoadingItems, isError: isErrorItems, error: errorItems } =
    useQuery(['shipments', debouncedSearchTerm],
    () => shipmentAPI.getAll({ 
      limit: 100, 
      sort: '-createdAt', 
      statusesNotIn: 'quote',
      ...(debouncedSearchTerm && { searchTerm: debouncedSearchTerm })
    }), { keepPreviousData: true });
  
  const shipments: Shipment[] = apiResponse?.data?.data?.shipments || [];

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
        const itemRecord: Shipment = data?.data?.data;
        if (itemRecord) {
          if (itemRecord.status === 'quote') {
            navigate('/quotes', { replace: true });
            toast.info("Editing a quote. Redirected to Quotes page.");
          } else {
            setEditingShipmentInitialData(mapShipmentToShipmentFormData(itemRecord));
            setIsShipmentFormOpen(true);
          }
        } else if (mode === 'edit') { toast.error(`Item with ID ${shipmentIdFromUrl} not found.`); navigate('/shipments', { replace: true }); }
      },
      onError: (err: any) => { if (mode === 'edit') { toast.error(`Error fetching item: ${err.message}`); navigate('/shipments', { replace: true }); } }
    }
  );
  
  const shipmentMutation = useMutation(
    (data: { id?: string, formData: any }) => data.id ? shipmentAPI.update(data.id, data.formData) : shipmentAPI.create(data.formData),
    {
        onSuccess: (response, variables) => { toast.success(`Shipment ${variables.id ? 'updated' : 'created'} successfully!`); queryClient.invalidateQueries('shipments'); setIsShipmentFormOpen(false); setEditingShipmentInitialData(null); },
        onError: (err: any) => { toast.error(err.response?.data?.message || `Error creating/updating shipment.`); },
    }
  );
  const addCheckInMutation = useMutation( (data: { shipmentId: string, checkInData: any }) => shipmentAPI.addCheckIn(data.shipmentId, data.checkInData), { onSuccess: () => { toast.success("Check-in added!"); queryClient.invalidateQueries('shipments'); queryClient.invalidateQueries(['shipmentDetails', currentShipmentForAction?._id]); setIsCheckInFormOpen(false); }, onError: (err: any) => {toast.error(err.response?.data?.message || "Error adding check-in.");}});
  const generateEmailMutation = useMutation( (shipmentId: string) => shipmentAPI.generateEmail(shipmentId), { onSuccess: (response) => { setGeneratedEmailContent(response.data.data.emailContent); setCurrentShipmentForAction(response.data.data.shipmentForContext || null); setIsEmailGenOpen(true); }, onError: (err: any) => {toast.error(err.response?.data?.message || "Error generating email.");}});
  const deleteShipmentMutation = useMutation((itemId: string) => shipmentAPI.delete(itemId), {
    onSuccess: (response) => { toast.success(response?.data?.message || 'Shipment deleted!'); queryClient.invalidateQueries('shipments'); },
    onError: (error: any) => { toast.error(error.response?.data?.message || 'Error deleting shipment.'); },
  });

  const handleOpenShipmentForm = (itemToEdit?: Shipment) => {
    setEditingShipmentInitialData(itemToEdit ? mapShipmentToShipmentFormData(itemToEdit) : { ...initialShipmentFormData, status: 'booked' });
    setIsShipmentFormOpen(true);
  };
  const handleCloseShipmentForm = () => { setIsShipmentFormOpen(false); setEditingShipmentInitialData(null); if (mode === 'edit') navigate('/shipments', {replace: true}); };
  const handleSaveShipmentForm = (formDataFromDialog: ShipmentFormDataForDialog, idToUpdate?: string) => { shipmentMutation.mutate({ id: idToUpdate || formDataFromDialog._id, formData: formDataFromDialog }); };
  const handleOpenCheckInForm = (item: Shipment) => { setCurrentShipmentForAction(item); setIsCheckInFormOpen(true);};
  const handleCloseCheckInForm = () => setIsCheckInFormOpen(false);
  const handleSaveCheckIn = (checkInDataFromDialog: any) => { if (currentShipmentForAction) addCheckInMutation.mutate({ shipmentId: currentShipmentForAction._id, checkInData: checkInDataFromDialog }); };
  const handleDeleteItem = (itemToDelete: Shipment) => { if (window.confirm(`Are you sure you want to delete shipment #${itemToDelete.shipmentNumber || itemToDelete._id}?`)) { deleteShipmentMutation.mutate(itemToDelete._id); }};
  const handleGenerateEmail = (item: Shipment) => { generateEmailMutation.mutate(item._id); };
  const handleCloseEmailGen = () => setIsEmailGenOpen(false);
  const handleOpenDetailView = (item: Shipment) => { navigate(`/shipments/${item._id}`); };

  const getStatusColor = (status: any) => 'info';
  const getDisplayName = (entity: any): string => entity?.name || 'N/A';
  
  const overallIsLoading = isLoadingItems || isLoadingShippers || isLoadingCarriers || isLoadingEquipmentTypes || isLoadingItemToEdit;

  if (overallIsLoading && !apiResponse?.data) {
    return <Box sx={{p:3, textAlign:'center', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }
  if (isErrorItems) {
    return <Alert severity="error">Error fetching shipments: {(errorItems as any)?.response?.data?.message || (errorItems as any)?.message || 'Unknown error'}</Alert>;
  }

  return (
    <Box>
      <PageHeader
        title="Shipments"
        searchLabel="Search Shipments"
        searchTerm={searchTermInput}
        onSearchChange={(e) => setSearchTermInput(e.target.value)}
      >
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenShipmentForm()}>New Shipment</Button>
      </PageHeader>

      <ShipmentsTable
        items={shipments}
        isLoading={isLoadingItems}
        activeTab="shipments"
        onEditItem={handleOpenShipmentForm}
        onViewDetails={handleOpenDetailView}
        onAddCheckIn={handleOpenCheckInForm}
        onGenerateEmail={handleGenerateEmail}
        onDeleteItem={handleDeleteItem}
        getDisplayName={getDisplayName}
        getStatusColor={getStatusColor}
      />
      
      {isShipmentFormOpen && editingShipmentInitialData && (
        <ShipmentFormDialog
          open={isShipmentFormOpen} onClose={handleCloseShipmentForm} onSubmit={handleSaveShipmentForm}
          initialData={editingShipmentInitialData} isLoading={shipmentMutation.isLoading}
          shippersList={shippersList} isLoadingShippers={isLoadingShippers}
          carriersList={carriersList} isLoadingCarriers={isLoadingCarriers}
          equipmentTypesList={equipmentTypesList} isLoadingEquipmentTypes={isLoadingEquipmentTypes}
        />
      )}

      {currentShipmentForAction && isCheckInFormOpen && (
        <CheckInDialog
            open={isCheckInFormOpen} onClose={handleCloseCheckInForm} onSubmit={handleSaveCheckIn}
            isLoading={addCheckInMutation.isLoading} shipmentNumber={currentShipmentForAction?.shipmentNumber}
        />
      )}

      {currentShipmentForAction && isEmailGenOpen && (
        <EmailGenDialog
            open={isEmailGenOpen} onClose={handleCloseEmailGen}
            emailContent={generatedEmailContent} shipmentNumber={currentShipmentForAction?.shipmentNumber}
            recipientInfo={typeof currentShipmentForAction?.shipper === 'object' ? currentShipmentForAction?.shipper?.contact?.email || currentShipmentForAction?.shipper?.name : 'Shipper Contact'}
        />
      )}
    </Box>
  );
};

export default ShipmentsPage;