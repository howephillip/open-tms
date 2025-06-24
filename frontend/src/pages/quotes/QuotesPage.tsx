import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert
} from '@mui/material';
import { RequestQuote as QuoteIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { shipmentAPI, shipperAPI, carrierAPI, lookupAPI } from '../../services/api';
import { toast } from 'react-toastify';

import PageHeader from '../../components/common/PageHeader';
import QuoteFormDialog, { QuoteFormData } from '../shipments/components/QuoteFormDialog';
import QuotesTable from './QuotesTable'; 
import EmailGenDialog from '../shipments/components/EmailGenDialog';
import { mapShipmentToQuoteFormData, initialQuoteFormData } from '../shipments/utils/shipmentFormMappers';
import { Shipment } from '../shipments/ShipmentsPage';
import { quoteStatusOptions } from '../shipments/constants/shipmentOptions';

interface ShipperStub { _id: string; name: string; contact?: { email?: string; name?: string; }; }
interface CarrierStub { _id: string; name: string; }
interface EquipmentTypeOption { _id: string; name: string; code?: string; category?: string; }

const QuotesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false);
  const [editingQuoteInitialData, setEditingQuoteInitialData] = useState<QuoteFormData | null>(null);
  const [isEmailGenOpen, setIsEmailGenOpen] = useState(false);
  const [currentQuoteForAction, setCurrentQuoteForAction] = useState<Shipment | null>(null);
  const [generatedEmailContent, setGeneratedEmailContent] = useState('');
  const [searchTermInput, setSearchTermInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timerId = setTimeout(() => { setDebouncedSearchTerm(searchTermInput); }, 500);
    return () => clearTimeout(timerId);
  }, [searchTermInput]);

  const { data: apiResponse, isLoading: isLoadingItems, isError: isErrorItems, error: errorItems } =
    useQuery(['quotes', debouncedSearchTerm],
    () => shipmentAPI.getAll({ 
      limit: 100, 
      sort: '-createdAt', 
      statusesIn: quoteStatusOptions.join(','), 
      ...(debouncedSearchTerm && { searchTerm: debouncedSearchTerm })
    }), { keepPreviousData: true });

  const quotes: Shipment[] = apiResponse?.data?.data?.shipments || [];

  const { data: shippersResponse, isLoading: isLoadingShippers } = useQuery('shippersListForForms', () => shipperAPI.getAll({ limit: 200, select: 'name _id' }));
  const shippersList: ShipperStub[] = shippersResponse?.data?.data?.shippers || [];
  const { data: carriersResponse, isLoading: isLoadingCarriers } = useQuery('carriersListForForms', () => carrierAPI.getAll({ limit: 200, select: 'name _id' }));
  const carriersList: CarrierStub[] = carriersResponse?.data?.data?.carriers || [];
  const { data: equipmentTypesResponse, isLoading: isLoadingEquipmentTypes } = useQuery('equipmentTypesLookup', lookupAPI.getEquipmentTypes);
  const equipmentTypesList: EquipmentTypeOption[] = equipmentTypesResponse?.data?.data?.equipmentTypes || [];

  const quoteMutation = useMutation(
    (data: { id?: string, formData: any }) => data.id ? shipmentAPI.update(data.id, data.formData) : shipmentAPI.create(data.formData),
    {
        onSuccess: (response, variables) => { 
            toast.success(`Quote ${variables.id ? 'updated' : 'created'} successfully!`); 
            queryClient.invalidateQueries('quotes');
            setIsQuoteFormOpen(false); 
            setEditingQuoteInitialData(null);
        },
        onError: (err: any) => { toast.error(err.response?.data?.message || `Error creating/updating quote.`); },
    }
  );

  const generateEmailMutation = useMutation( (shipmentId: string) => shipmentAPI.generateEmail(shipmentId), { onSuccess: (response) => { setGeneratedEmailContent(response.data.data.emailContent); setCurrentQuoteForAction(response.data.data.shipmentForContext || null); setIsEmailGenOpen(true); }, onError: (err: any) => {toast.error(err.response?.data?.message || "Error generating email.");}});

  const deleteQuoteMutation = useMutation((itemId: string) => shipmentAPI.delete(itemId), {
    onSuccess: (response) => { toast.success(response?.data?.message || 'Quote deleted!'); queryClient.invalidateQueries('quotes'); },
    onError: (error: any) => { toast.error(error.response?.data?.message || 'Error deleting quote.'); },
  });

  const handleOpenQuoteForm = (itemToEdit?: Shipment) => {
    setEditingQuoteInitialData(itemToEdit ? mapShipmentToQuoteFormData(itemToEdit) : { ...initialQuoteFormData });
    setIsQuoteFormOpen(true);
  };

  const handleCloseQuoteForm = () => { setIsQuoteFormOpen(false); setEditingQuoteInitialData(null); };

  const handleSaveQuoteForm = (formDataFromDialog: QuoteFormData, idToUpdate?: string) => {
    const apiPayload = { ...formDataFromDialog, status: 'quote' };
    apiPayload.documentIds = formDataFromDialog.documentIds || [];

    if (apiPayload.accessorials && Array.isArray(apiPayload.accessorials)) {
        apiPayload.accessorials = apiPayload.accessorials.filter(
        acc => acc.accessorialTypeId && acc.accessorialTypeId.trim() !== ''
      );
    }

    if (apiPayload.shipper === '') delete (apiPayload as any).shipper;
    if (apiPayload.carrier === '') delete (apiPayload as any).carrier;

    quoteMutation.mutate({ id: idToUpdate || formDataFromDialog._id, formData: apiPayload });
  };

  const handleDeleteItem = (itemToDelete: Shipment) => { if (window.confirm(`Are you sure you want to delete quote #${itemToDelete.shipmentNumber || itemToDelete._id}?`)) { deleteQuoteMutation.mutate(itemToDelete._id); }};
  const handleGenerateEmail = (item: Shipment) => { generateEmailMutation.mutate(item._id); };
  const handleCloseEmailGen = () => setIsEmailGenOpen(false);
  const handleOpenDetailView = (item: Shipment) => { navigate(`/shipments/${item._id}`); };

  const overallIsLoading = isLoadingItems || isLoadingShippers || isLoadingCarriers || isLoadingEquipmentTypes;

  const statusUpdateMutation = useMutation(
    (data: { id: string, status: string }) => shipmentAPI.update(data.id, { status: data.status }),
    {
      onSuccess: () => {
        toast.success('Quote status updated!');
        queryClient.invalidateQueries('quotes');
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Error updating status.');
      },
    }
  );

  const handleStatusChange = (itemId: string, newStatus: string) => {
    statusUpdateMutation.mutate({ id: itemId, status: newStatus });
  };

  if (overallIsLoading && !apiResponse?.data) {
    return <Box sx={{p:3, textAlign:'center', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }
  if (isErrorItems) {
    return <Alert severity="error">Error fetching quotes: {(errorItems as any)?.response?.data?.message || (errorItems as any)?.message || 'Unknown error'}</Alert>;
  }

  return (
    <Box>
      <PageHeader
        title="Quotes"
        searchLabel="Search Quotes"
        searchTerm={searchTermInput}
        onSearchChange={(e) => setSearchTermInput(e.target.value)}
      >
        <Button variant="contained" startIcon={<QuoteIcon />} onClick={() => handleOpenQuoteForm()}>New Quote</Button>
      </PageHeader>
      
      {/* *** CHANGE 2: Use the new QuotesTable component *** */}
      <QuotesTable
        items={quotes}
        isLoading={isLoadingItems}
        onEditItem={handleOpenQuoteForm}
        onDeleteItem={handleDeleteItem}
        onViewDetails={handleOpenDetailView}
        onStatusChange={handleStatusChange}
      />

      {isQuoteFormOpen && editingQuoteInitialData && (
        <QuoteFormDialog
            open={isQuoteFormOpen} onClose={handleCloseQuoteForm} onSubmit={handleSaveQuoteForm}
            initialData={editingQuoteInitialData} isLoading={quoteMutation.isLoading}
            shippersList={shippersList} isLoadingShippers={isLoadingShippers}
            carriersList={carriersList} isLoadingCarriers={isLoadingCarriers}
            equipmentTypesList={equipmentTypesList} isLoadingEquipmentTypes={isLoadingEquipmentTypes}
        />
      )}

      {currentQuoteForAction && isEmailGenOpen && (
        <EmailGenDialog
            open={isEmailGenOpen} onClose={handleCloseEmailGen}
            emailContent={generatedEmailContent} shipmentNumber={currentQuoteForAction?.shipmentNumber}
            recipientInfo={typeof currentQuoteForAction?.shipper === 'object' ? currentQuoteForAction?.shipper?.contact?.email || currentQuoteForAction?.shipper?.name : 'Shipper Contact'}
        />
      )}
    </Box>
  );
};

export default QuotesPage;