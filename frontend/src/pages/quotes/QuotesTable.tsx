import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Link as MuiLink, Box, Typography,
  Chip, Select, MenuItem
} from '@mui/material';
import {
  Edit as EditIcon, Visibility as ViewIcon,
  DeleteOutline as DeleteIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { Shipment, QuoteAccessorialForm } from '../shipments/ShipmentsPage'; 
import { quoteStatusOptions } from '../shipments/constants/shipmentOptions';

// Helper to format currency
const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null || isNaN(value)) return '$0.00';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper to format dates
const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
};

interface CostItem {
  name: string;
  customer: number;
  carrier: number;
}

// Main Component
const QuotesTable: React.FC<{
  items: Shipment[];
  isLoading: boolean;
  onEditItem: (item: Shipment) => void;
  onDeleteItem: (item: Shipment) => void;
  onViewDetails: (item: Shipment) => void;
  // --- CHANGE 1: Added handler for status update ---
  onStatusChange: (itemId: string, newStatus: string) => void;
}> = ({ items, isLoading, onEditItem, onViewDetails, onDeleteItem, onStatusChange }) => {

  const renderCostBreakdown = (item: Shipment) => {
    const costs: CostItem[] = [];

    costs.push({ name: 'Line Haul', customer: item.customerRate, carrier: item.carrierCostTotal });

    if (item.fscType && (item.fscCustomerAmount || item.fscCarrierAmount)) {
      let customerFsc = 0;
      let carrierFsc = 0;
      
      if (item.fscType === 'percentage') {
        if(item.fscCustomerAmount) customerFsc = item.customerRate * (item.fscCustomerAmount / 100);
        if(item.fscCarrierAmount) carrierFsc = item.carrierCostTotal * (item.fscCarrierAmount / 100);
      } else {
        customerFsc = item.fscCustomerAmount || 0;
        carrierFsc = item.fscCarrierAmount || 0;
      }
      costs.push({ name: 'FSC', customer: customerFsc, carrier: carrierFsc });
    }

    if (item.chassisCustomerCost || item.chassisCarrierCost) {
      costs.push({ name: 'Chassis', customer: item.chassisCustomerCost || 0, carrier: item.chassisCarrierCost || 0 });
    }
    
    item.accessorials?.forEach((acc: QuoteAccessorialForm) => {
      costs.push({ name: acc.name || 'Accessorial', customer: acc.customerRate, carrier: acc.carrierCost });
    });

    // --- CHANGE 3: Cost column formatting fix ---
    const columnWidth = '160px'; // Set a fixed width for each cost column

    return (
      <Box sx={{ display: 'flex' }}>
        {/* Customer Cost Column */}
        <Box sx={{ pr: 2, borderRight: '1px solid #eee', textAlign: 'left', minWidth: columnWidth, maxWidth: columnWidth }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>Customer</Typography>
          {costs.map((cost, index) => (
            <Tooltip title={`${cost.name}: ${formatCurrency(cost.customer)}`} key={`cust-tip-${index}`}>
              <Typography key={`cust-${index}`} variant="body2" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cost.name}: {formatCurrency(cost.customer)}
              </Typography>
            </Tooltip>
          ))}
          <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5, borderTop: '1px solid #ddd' }}>
            Total: {formatCurrency(item.totalCustomerRate)}
          </Typography>
        </Box>
        {/* Carrier Cost Column */}
        <Box sx={{ pl: 2, textAlign: 'left', minWidth: columnWidth, maxWidth: columnWidth }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>Carrier</Typography>
          {costs.map((cost, index) => (
            <Tooltip title={`${cost.name}: ${formatCurrency(cost.carrier)}`} key={`carr-tip-${index}`}>
              <Typography key={`carr-${index}`} variant="body2" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cost.name}: {formatCurrency(cost.carrier)}
              </Typography>
            </Tooltip>
          ))}
          <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 0.5, borderTop: '1px solid #ddd' }}>
            Total: {formatCurrency(item.totalCarrierCost)}
          </Typography>
        </Box>
      </Box>
    );
  };
  
  return (
    <TableContainer component={Paper}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 100, textAlign: 'center' }}>Actions</TableCell>
            <TableCell sx={{ minWidth: 100 }}>Quote Date</TableCell>
            <TableCell sx={{ minWidth: 100 }}>Quote #</TableCell>
            <TableCell sx={{ minWidth: 120 }}>Status</TableCell>
            <TableCell sx={{ minWidth: 150 }}>Shipper</TableCell>
            <TableCell sx={{ minWidth: 180 }}>Lane</TableCell>
            <TableCell sx={{ minWidth: 120 }}>Equipment</TableCell>
            <TableCell sx={{ minWidth: 350 }}>Costs (Customer / Carrier)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} sx={{my: 2}} /></TableCell></TableRow>
          ) : items.length > 0 ? (
            items.map((item) => {
              // --- CHANGE 2: Lane population fix ---
              const origin = item.origin || (item.stops && item.stops[0]);
              const destination = item.destination || (item.stops && item.stops[item.stops.length - 1]);

              return (
              <TableRow key={item._id} hover>
                {/* Actions Cell */}
                <TableCell align="center">
                  <Tooltip title="Edit Quote"><IconButton size="small" onClick={() => onEditItem(item)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="View Details"><IconButton size="small" onClick={() => onViewDetails(item)}><ViewIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Delete Quote"><IconButton size="small" onClick={() => onDeleteItem(item)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
                {/* Quote Date */}
                <TableCell>{formatDate(item.createdAt)}</TableCell>
                {/* Quote # */}
                <TableCell>
                    <MuiLink component={RouterLink} to={`/shipments/${item._id}`} underline="hover">
                        {item.shipmentNumber || 'N/A'}
                    </MuiLink>
                </TableCell>
                {/* Status */}
                <TableCell>
                  {/* --- CHANGE 1: Replaced Chip with Select dropdown --- */}
                  <Select
                    value={item.status}
                    onChange={(e) => onStatusChange(item._id, e.target.value)}
                    size="small"
                    variant="standard"
                    fullWidth
                    sx={{
                        fontSize: '0.875rem',
                        '.MuiSelect-select': { textTransform: 'capitalize', padding: '4px 8px' },
                        '&:before': { borderBottom: 0 },
                        '&:hover:not(.Mui-disabled):before': { borderBottom: 0 },
                        '&.Mui-focused:after': { borderBottom: 0 }
                    }}
                  >
                    {quoteStatusOptions.map(status => (
                      <MenuItem key={status} value={status} sx={{textTransform: 'capitalize'}}>
                        {status.replace(/_/g, ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                {/* Shipper */}
                <TableCell>{item.shipper?.name || 'N/A'}</TableCell>
                {/* Lane */}
                <TableCell>
                  <Box>
                    <Typography variant="body2">{origin?.city}, {origin?.state}</Typography>
                    <Typography variant="caption" color="text.secondary">to</Typography>
                    <Typography variant="body2">{destination?.city}, {destination?.state}</Typography>
                  </Box>
                </TableCell>
                {/* Equipment */}
                <TableCell>{item.equipmentType || 'N/A'}</TableCell>
                {/* Costs */}
                <TableCell>{renderCostBreakdown(item)}</TableCell>
              </TableRow>
            )})
          ) : (
            <TableRow><TableCell colSpan={8} align="center">No quotes found.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default QuotesTable;