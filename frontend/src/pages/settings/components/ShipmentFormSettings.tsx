import React, { useState, useEffect } from 'react';
import {
  Box, Typography, FormGroup, FormControlLabel, Checkbox,
  Button, Grid, Paper, Divider, CircularProgress
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { toast } from 'react-toastify';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { settingsAPI } from '../../../services/api';

const ALL_SHIPMENT_FIELDS = [
    { id: 'shipper', label: 'Shipper', category: 'Core Info' },
    { id: 'carrier', label: 'Carrier', category: 'Core Info' },
    { id: 'modeOfTransport', label: 'Mode of Transport', category: 'Core Info' },
    { id: 'status', label: 'Status', category: 'Core Info' },
    { id: 'origin.address', label: 'Origin Address', category: 'Origin' },
    { id: 'origin.city', label: 'Origin City', category: 'Origin' },
    { id: 'origin.state', label: 'Origin State', category: 'Origin' },
    { id: 'origin.zip', label: 'Origin Zip', category: 'Origin' },
    { id: 'destination.address', label: 'Destination Address', category: 'Destination' },
    { id: 'destination.city', label: 'Destination City', category: 'Destination' },
    { id: 'destination.state', label: 'Destination State', category: 'Destination' },
    { id: 'destination.zip', label: 'Destination Zip', category: 'Destination' },
    { id: 'scheduledPickupDate', label: 'Pickup Date', category: 'Dates' },
    { id: 'scheduledDeliveryDate', label: 'Delivery Date', category: 'Dates' },
    { id: 'equipmentType', label: 'Equipment Type', category: 'Freight' },
    { id: 'commodityDescription', label: 'Commodity', category: 'Freight' },
    { id: 'totalWeight', label: 'Total Weight', category: 'Freight' },
    { id: 'customerRate', label: 'Customer Rate', category: 'Pricing' },
    { id: 'carrierCostTotal', label: 'Carrier Cost', category: 'Pricing' },
    { id: 'billOfLadingNumber', label: 'BOL Number', category: 'References' },
    { id: 'proNumber', label: 'PRO Number', category: 'References' },
] as const;

type ShipmentFieldId = typeof ALL_SHIPMENT_FIELDS[number]['id'];
interface ShipmentSettings { requiredFields: ShipmentFieldId[]; }
const defaultSettings: ShipmentSettings = {
  requiredFields: ['shipper', 'carrier', 'modeOfTransport', 'status', 'equipmentType', 'commodityDescription', 'customerRate', 'carrierCostTotal', 'scheduledPickupDate', 'scheduledDeliveryDate', 'origin.address', 'destination.address'],
};

const ShipmentFormSettingsPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentSettings, setCurrentSettings] = useState<ShipmentSettings>(defaultSettings);

  const { data: loadedSettings, isLoading: isLoadingSettings } = useQuery<ShipmentSettings>(
    'shipmentFormSettings', () => settingsAPI.getShipmentFormSettings().then(res => res.data.data),
    { onSuccess: (data) => { if (data) setCurrentSettings(data); } }
  );

  const updateSettingsMutation = useMutation(
    (newSettings: ShipmentSettings) => settingsAPI.updateShipmentFormSettings(newSettings), {
      onSuccess: (response) => {
        toast.success('Shipment form settings saved successfully!');
        queryClient.setQueryData('shipmentFormSettings', response.data.data);
        setCurrentSettings(response.data.data);
      },
      onError: (error: any) => { toast.error(error.response?.data?.message || 'An error occurred.'); },
    }
  );

  useEffect(() => { if (loadedSettings) setCurrentSettings(loadedSettings); }, [loadedSettings]);

  const handleRequiredFieldChange = (fieldId: ShipmentFieldId) => {
    setCurrentSettings(prev => ({
      ...prev,
      requiredFields: prev.requiredFields.includes(fieldId)
        ? prev.requiredFields.filter(id => id !== fieldId)
        : [...prev.requiredFields, fieldId],
    }));
  };

  const handleSaveChanges = () => { updateSettingsMutation.mutate(currentSettings); };

  const fieldsByCategory: Record<string, {id: ShipmentFieldId, label: string}[]> =
  ALL_SHIPMENT_FIELDS.reduce((acc, field) => {
      acc[field.category] = acc[field.category] || [];
      acc[field.category].push({id: field.id, label: field.label});
      return acc;
  }, {} as Record<string, {id: ShipmentFieldId, label: string}[]>);

  if (isLoadingSettings) return <Box p={3} display="flex" justifyContent="center"><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Typography variant="h6" gutterBottom>Shipment Form Configuration</Typography>
      <Paper elevation={2} sx={{ p: { xs: 1, sm: 2, md: 3 }, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>Required Fields</Typography>
        <Typography variant="body2" color="textSecondary" sx={{mb: 2}}>
          Select which fields must be filled out when creating or updating a shipment.
        </Typography>
        <Grid container spacing={2}>
            {Object.entries(fieldsByCategory).map(([category, fields]) => (
                <Grid item xs={12} sm={6} md={4} key={category}>
                    <Typography variant="overline">{category}</Typography>
                    <FormGroup>
                        {fields.map(field => (
                        <FormControlLabel key={field.id} control={
                            <Checkbox checked={currentSettings.requiredFields.includes(field.id)} onChange={() => handleRequiredFieldChange(field.id)} name={field.id} />
                        } label={field.label} />
                        ))}
                    </FormGroup>
                </Grid>
            ))}
        </Grid>
      </Paper>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveChanges} disabled={updateSettingsMutation.isLoading}>
          {updateSettingsMutation.isLoading ? <CircularProgress size={24} /> : 'Save Shipment Settings'}
        </Button>
      </Box>
    </Box>
  );
};

export default ShipmentFormSettingsPanel;