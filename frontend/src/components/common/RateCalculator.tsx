// File: src/components/common/RateCalculator.tsx

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, TextField, MenuItem,
  Button, Divider, InputAdornment, IconButton, Autocomplete
} from '@mui/material';
import {
  AddCircleOutline as AddIcon,
  RemoveCircleOutline as RemoveIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { lookupAPI } from '../../services/api';

// --- Type Definitions (can be moved to a shared types file later) ---
interface AccessorialTypeOption { _id: string; name: string; defaultCustomerRate?: number; defaultCarrierCost?: number; }
interface CalculatorAccessorial {
  accessorialTypeId: string;
  name?: string;
  quantity: number;
  customerRate: number;
  carrierCost: number;
}
interface CalculatorState {
  customerRate: string;
  carrierCost: string;
  fscType: 'fixed' | 'percentage' | '';
  fscCustomerAmount: string;
  fscCarrierAmount: string;
  accessorials: CalculatorAccessorial[];
}

// Helper to format currency
const formatCurrency = (value: number) => {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const RateCalculator: React.FC = () => {
  const [state, setState] = useState<CalculatorState>({
    customerRate: '',
    carrierCost: '',
    fscType: '',
    fscCustomerAmount: '',
    fscCarrierAmount: '',
    accessorials: [],
  });
  
  const { data: accessorialTypesResponse } = useQuery('accessorialTypesLookupAll', () => lookupAPI.getAccessorialTypes({}));
  const accessorialTypesList: AccessorialTypeOption[] = accessorialTypesResponse?.data?.data?.accessorialTypes || [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name]: value }));
  };

  const handleAccessorialChange = (index: number, field: keyof CalculatorAccessorial, value: any) => {
    const updatedAccessorials = state.accessorials.map((acc, i) => {
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
    setState(prev => ({ ...prev, accessorials: updatedAccessorials }));
  };
  
  const addAccessorial = () => setState(prev => ({ ...prev, accessorials: [...prev.accessorials, { accessorialTypeId: '', name: '', quantity: 1, customerRate: 0, carrierCost: 0 }]}));
  const removeAccessorial = (index: number) => setState(prev => ({ ...prev, accessorials: prev.accessorials.filter((_, i) => i !== index)}));

  const calculateTotals = () => {
    const lineHaulCustomer = parseFloat(state.customerRate) || 0;
    const lineHaulCarrier = parseFloat(state.carrierCost) || 0;
    const fscCustomerAmount = parseFloat(state.fscCustomerAmount) || 0;
    const fscCarrierAmount = parseFloat(state.fscCarrierAmount) || 0;

    let fscCustomerValue = state.fscType === 'percentage' ? lineHaulCustomer * (fscCustomerAmount / 100) : fscCustomerAmount;
    let fscCarrierValue = state.fscType === 'percentage' ? lineHaulCarrier * (fscCarrierAmount / 100) : fscCarrierAmount;

    let totalAccessorialsCustomer = 0;
    let totalAccessorialsCarrier = 0;
    state.accessorials.forEach(acc => {
      totalAccessorialsCustomer += (acc.customerRate || 0) * (acc.quantity || 1);
      totalAccessorialsCarrier += (acc.carrierCost || 0) * (acc.quantity || 1);
    });
    
    const totalCustomer = lineHaulCustomer + fscCustomerValue + totalAccessorialsCustomer;
    const totalCarrier = lineHaulCarrier + fscCarrierValue + totalAccessorialsCarrier;
    const profit = totalCustomer - totalCarrier;
    const margin = totalCustomer > 0 ? (profit / totalCustomer) * 100 : 0;
    
    return { totalCustomer, totalCarrier, profit, margin };
  };

  const totals = calculateTotals();

  return (
    <Box sx={{ p: 3, width: 400 }}>
      <Typography variant="h6" gutterBottom>
        Quick Rate Calculator
      </Typography>
      <Divider sx={{ my: 2 }} />

      <Grid container spacing={2}>
        <Grid item xs={12}><Typography variant="subtitle2">Line Haul</Typography></Grid>
        <Grid item xs={6}>
            <TextField size="small" fullWidth label="Customer Rate" name="customerRate" type="number" value={state.customerRate} onChange={handleInputChange} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}}/>
        </Grid>
        <Grid item xs={6}>
            <TextField size="small" fullWidth label="Carrier Cost" name="carrierCost" type="number" value={state.carrierCost} onChange={handleInputChange} InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>}}/>
        </Grid>

        <Grid item xs={12}><Typography variant="subtitle2" sx={{ mt: 1 }}>Fuel Surcharge</Typography></Grid>
        <Grid item xs={4}>
            <TextField select fullWidth size="small" label="FSC Type" name="fscType" value={state.fscType} onChange={handleInputChange} >
              <MenuItem value=""><em>None</em></MenuItem><MenuItem value="fixed">Fixed</MenuItem><MenuItem value="percentage">%</MenuItem>
            </TextField>
        </Grid>
        <Grid item xs={4}><TextField size="small" fullWidth label="Customer FSC" name="fscCustomerAmount" type="number" value={state.fscCustomerAmount} onChange={handleInputChange} disabled={!state.fscType} /></Grid>
        <Grid item xs={4}><TextField size="small" fullWidth label="Carrier FSC" name="fscCarrierAmount" type="number" value={state.fscCarrierAmount} onChange={handleInputChange} disabled={!state.fscType} /></Grid>

        <Grid item xs={12}><Typography variant="subtitle2" sx={{ mt: 1 }}>Accessorials</Typography></Grid>
        {state.accessorials.map((acc, index) => (
          <React.Fragment key={`acc-${index}`}>
            <Grid item xs={9}><Autocomplete size="small" options={accessorialTypesList} getOptionLabel={(option) => option.name || ''} onChange={(e, val) => handleAccessorialChange(index, 'accessorialTypeId', val?._id || '')} renderInput={(params) => <TextField {...params} label="Type" />} /></Grid>
            <Grid item xs={2}><TextField size="small" fullWidth label="Qty" type="number" value={acc.quantity} onChange={(e) => handleAccessorialChange(index, 'quantity', e.target.value)} /></Grid>
            <Grid item xs={1}><IconButton size="small" onClick={() => removeAccessorial(index)}><RemoveIcon /></IconButton></Grid>
            <Grid item xs={6}><TextField size="small" fullWidth label="Customer Rate" type="number" value={acc.customerRate} onChange={(e) => handleAccessorialChange(index, 'customerRate', e.target.value)} /></Grid>
            <Grid item xs={6}><TextField size="small" fullWidth label="Carrier Cost" type="number" value={acc.carrierCost} onChange={(e) => handleAccessorialChange(index, 'carrierCost', e.target.value)} /></Grid>
          </React.Fragment>
        ))}
        <Grid item xs={12}><Button startIcon={<AddIcon />} onClick={addAccessorial} size="small">Add Accessorial</Button></Grid>

        <Grid item xs={12}><Divider sx={{ my: 2 }} /></Grid>
        <Grid item xs={12}><Typography variant="h6">Totals</Typography></Grid>
        <Grid item xs={6}><Typography>Customer:</Typography><Typography variant="h5">{formatCurrency(totals.totalCustomer)}</Typography></Grid>
        <Grid item xs={6}><Typography>Carrier:</Typography><Typography variant="h5">{formatCurrency(totals.totalCarrier)}</Typography></Grid>
        <Grid item xs={6}><Typography>Profit:</Typography><Typography variant="h5" color={totals.profit >= 0 ? 'success.main' : 'error.main'}>{formatCurrency(totals.profit)}</Typography></Grid>
        <Grid item xs={6}><Typography>Margin:</Typography><Typography variant="h5" color={totals.margin >= 0 ? 'success.main' : 'error.main'}>{totals.margin.toFixed(2)}%</Typography></Grid>
      </Grid>
    </Box>
  );
};

export default RateCalculator;