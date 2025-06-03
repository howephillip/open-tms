// File: frontend/src/pages/settings/components/QuoteFormSettingsPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, FormGroup, FormControlLabel, Checkbox,
  TextField, Button, Grid, Paper, Divider, Tooltip, IconButton, CircularProgress
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { toast } from 'react-toastify';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { settingsAPI } from '../../../services/api'; // Import the actual settingsAPI

const ALL_QUOTE_FIELDS = [
  { id: 'shipper', label: 'Shipper', category: 'Core Info' },
  { id: 'carrier', label: 'Carrier (Optional for Quote)', category: 'Core Info' },
  { id: 'modeOfTransport', label: 'Mode of Transport', category: 'Core Info' },
  { id: 'equipmentType', label: 'Equipment Type', category: 'Core Info' },
  { id: 'originCity', label: 'Origin City', category: 'Origin' },
  { id: 'originState', label: 'Origin State', category: 'Origin' },
  { id: 'originZip', label: 'Origin Zip Code', category: 'Origin' },
  { id: 'originAddress', label: 'Origin Address', category: 'Origin' },
  { id: 'originLocationType', label: 'Origin Location Type', category: 'Origin' },
  { id: 'destinationCity', label: 'Destination City', category: 'Destination' },
  { id: 'destinationState', label: 'Destination State', category: 'Destination' },
  { id: 'destinationZip', label: 'Destination Zip Code', category: 'Destination' },
  { id: 'destinationAddress', label: 'Destination Address', category: 'Destination' },
  { id: 'destinationLocationType', label: 'Destination Location Type', category: 'Destination' },
  { id: 'scheduledPickupDate', label: 'Ready Date', category: 'Dates' },
  { id: 'scheduledDeliveryDate', label: 'Desired Delivery Date', category: 'Dates' },
  { id: 'quoteValidUntil', label: 'Quote Valid Until', category: 'Dates' },
  { id: 'commodityDescription', label: 'Commodity Description', category: 'Freight' },
  { id: 'totalWeight', label: 'Total Weight', category: 'Freight' },
  { id: 'pieceCount', label: 'Piece Count', category: 'Freight' },
  { id: 'customerRate', label: 'Line Haul (Customer Rate)', category: 'Pricing' },
  { id: 'carrierCostTotal', label: 'Line Haul (Carrier Cost)', category: 'Pricing' },
  { id: 'purchaseOrderNumbers', label: 'PO Number(s)', category: 'Additional Info' },
  { id: 'quoteNotes', label: 'Quote Notes', category: 'Additional Info' },
] as const;

type QuoteFieldId = typeof ALL_QUOTE_FIELDS[number]['id'];

interface QuoteSettings {
  requiredFields: QuoteFieldId[];
  quoteNumberPrefix: string;
  quoteNumberNextSequence: number;
}

const defaultPanelSettings: QuoteSettings = {
  requiredFields: ['shipper', 'modeOfTransport', 'equipmentType', 'originCity', 'originState', 'destinationCity', 'destinationState', 'scheduledPickupDate', 'commodityDescription', 'customerRate'],
  quoteNumberPrefix: 'QT-',
  quoteNumberNextSequence: 1001,
};


const QuoteFormSettingsPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentSettings, setCurrentSettings] = useState<QuoteSettings>(defaultPanelSettings);

  const { data: loadedSettings, isLoading: isLoadingSettings, isError, error: queryError } = useQuery<QuoteSettings>(
    'quoteFormSettings', // Unique query key
    async () => {
        // Use the imported settingsAPI directly
        const response = await settingsAPI.getQuoteFormSettings();
        // Assuming API returns { success: true, data: settingsObject } or similar
        // If backend sends default settings when none are in DB, response.data.data should exist.
        return response.data.data || defaultPanelSettings;
    },
    {
      onSuccess: (data) => {
        if (data) {
          setCurrentSettings(data);
        }
      },
      onError: () => {
        toast.error("Could not load quote settings from server. Using defaults.");
        setCurrentSettings(defaultPanelSettings); // Fallback to local defaults on error
      },
      // Optional:
      // staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
      // refetchOnWindowFocus: false,
    }
  );

  const updateSettingsMutation = useMutation(
    (newSettings: QuoteSettings) => settingsAPI.updateQuoteFormSettings(newSettings), // Use imported settingsAPI
    {
      onSuccess: (response) => {
        toast.success('Quote form settings saved successfully!');
        if (response.data.success && response.data.data) {
          queryClient.setQueryData('quoteFormSettings', response.data.data); // Update react-query cache
          setCurrentSettings(response.data.data); // Update local state from the successful response
        } else {
           toast.error(response.data.message || 'Failed to save settings due to server response.');
        }
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'An error occurred while saving settings.');
      },
    }
  );

  useEffect(() => {
    // This effect ensures that if loadedSettings becomes available after initial render,
    // (e.g., after isLoadingSettings turns false), currentSettings is updated.
    if (loadedSettings) {
      setCurrentSettings(loadedSettings);
    }
  }, [loadedSettings]);


  const handleRequiredFieldChange = (fieldId: QuoteFieldId) => {
    setCurrentSettings(prev => {
      const newRequiredFields = prev.requiredFields.includes(fieldId)
        ? prev.requiredFields.filter(id => id !== fieldId)
        : [...prev.requiredFields, fieldId];
      return { ...prev, requiredFields: newRequiredFields };
    });
  };

  const handleSettingInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setCurrentSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'quoteNumberNextSequence' ? parseInt(value) || 0 : value),
    }));
  };

  const handleSaveChanges = () => {
    updateSettingsMutation.mutate(currentSettings);
  };

  const fieldsByCategory: Record<string, {id: QuoteFieldId, label: string}[]> =
  ALL_QUOTE_FIELDS.reduce((acc, field) => {
      acc[field.category] = acc[field.category] || [];
      acc[field.category].push({id: field.id, label: field.label});
      return acc;
  }, {} as Record<string, {id: QuoteFieldId, label: string}[]>);


  if (isLoadingSettings) {
    return <Box p={3} display="flex" justifyContent="center"><CircularProgress /></Box>;
  }

  if (isError && !loadedSettings) { // Show error only if data hasn't been loaded (e.g. from cache) and there's an error
    return <Box p={3}><Typography color="error">Error loading settings: {(queryError as any)?.message || "Unknown error"}. Default settings are being used.</Typography></Box>;
  }

  return (
    <Box p={3}>
      <Typography variant="h6" gutterBottom>
        Quote Form Configuration
      </Typography>
      <Paper elevation={2} sx={{ p: { xs: 1, sm: 2, md: 3 }, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Required Fields
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{mb: 2}}>
          Select which fields must be filled out when creating a new quote.
        </Typography>
        <Grid container spacing={2}>
            {Object.entries(fieldsByCategory).map(([category, fields]) => (
                <Grid item xs={12} sm={6} md={4} key={category}>
                    <Typography variant="overline">{category}</Typography>
                    <FormGroup>
                        {fields.map(field => (
                        <FormControlLabel
                            key={field.id}
                            control={
                            <Checkbox
                                checked={currentSettings.requiredFields.includes(field.id)}
                                onChange={() => handleRequiredFieldChange(field.id)}
                                name={field.id}
                            />
                            }
                            label={field.label}
                        />
                        ))}
                    </FormGroup>
                </Grid>
            ))}
        </Grid>
      </Paper>

      <Paper elevation={2} sx={{ p: { xs: 1, sm: 2, md: 3 }, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Quote Numbering
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="Quote Number Prefix"
              name="quoteNumberPrefix"
              value={currentSettings.quoteNumberPrefix}
              onChange={handleSettingInputChange}
              InputProps={{
                endAdornment: (
                  <Tooltip title="This prefix will be added to auto-generated quote numbers (e.g., QT-, Q-, INV-).">
                    <IconButton size="small"><HelpOutlineIcon fontSize="small" /></IconButton>
                  </Tooltip>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="Next Sequence Number"
              name="quoteNumberNextSequence"
              type="number"
              value={currentSettings.quoteNumberNextSequence}
              onChange={handleSettingInputChange}
              InputProps={{
                inputProps: { min: 1 },
                endAdornment: (
                  <Tooltip title="The starting number for the next auto-generated quote number. Backend will manage actual sequence increment.">
                    <IconButton size="small"><HelpOutlineIcon fontSize="small" /></IconButton>
                  </Tooltip>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="textSecondary">
                Example next: {currentSettings.quoteNumberPrefix}{currentSettings.quoteNumberNextSequence}
              </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={2} sx={{ p: { xs: 1, sm: 2, md: 3 }, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Emailable Quote Template
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{mb: 2}}>
          Configure the template for generating a copy-pasteable quote for emails. (Coming Soon)
        </Typography>
      </Paper>


      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSaveChanges}
          disabled={updateSettingsMutation.isLoading}
        >
          {updateSettingsMutation.isLoading ? <CircularProgress size={24} sx={{color: 'white'}}/> : 'Save Quote Settings'}
        </Button>
      </Box>
    </Box>
  );
};

export default QuoteFormSettingsPanel;