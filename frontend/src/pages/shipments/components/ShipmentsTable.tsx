import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Link as MuiLink
} from '@mui/material';
import {
  Edit as EditIcon, Visibility as ViewIcon,
  CheckCircleOutline as CheckIcon, EmailOutlined as EmailIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import StatusUpdateSelect from '../../../components/common/StatusUpdateSelect';
import { quoteStatusOptions, shipmentStatusOptions } from '../constants/shipmentOptions';

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Date(date.getTime() + Math.abs(date.getTimezoneOffset() * 60000))
    .toLocaleDateString();
};

const ShipmentsTable = ({
  items, isLoading, activeTab,
  onEditItem, onViewDetails, onAddCheckIn, onGenerateEmail,
  onDeleteItem, getDisplayName
}) => {
  return (
    <TableContainer component={Paper}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{minWidth: 120}}>{activeTab === 'quotes' ? 'Quote #' : 'Shipment #'}</TableCell>
            <TableCell sx={{minWidth: 150}}>Mode</TableCell>
            <TableCell sx={{minWidth: 150}}>Shipper</TableCell>
            <TableCell sx={{minWidth: 150}}>{activeTab === 'quotes' ? 'Est. Carrier' : 'Carrier'}</TableCell>
            <TableCell sx={{minWidth: 180}}>Origin → Dest.</TableCell>
            <TableCell sx={{minWidth: 180}}>Status</TableCell>
            <TableCell sx={{minWidth: 100}}>Pickup</TableCell>
            <TableCell sx={{minWidth: 100}}>Delivery</TableCell>
            <TableCell sx={{minWidth: 120}}>{activeTab === 'quotes' ? 'Quoted Rate' : 'Container #'}</TableCell>
            <TableCell sx={{minWidth: 120}}>PRO #</TableCell>
            <TableCell align="center" sx={{minWidth: 180}}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading && items.length === 0 ? (
            <TableRow><TableCell colSpan={11} align="center">Loading items...</TableCell></TableRow>
          ) : items.length > 0 ? (
            items.map((item) => (
              <TableRow hover key={item._id}>
                <TableCell>
                  <MuiLink component={RouterLink} to={`/shipments/${item._id}`} sx={{ textDecoration: 'none', color: 'primary.main', '&:hover': {textDecoration: 'underline'} }}>
                      {item.shipmentNumber || 'N/A'}
                  </MuiLink>
                </TableCell>
                <TableCell sx={{textTransform: 'capitalize'}}>{item.modeOfTransport?.replace(/-/g, ' ') || 'N/A'}</TableCell>
                <TableCell>{getDisplayName(item.shipper)}</TableCell>
                <TableCell>{getDisplayName(item.carrier)}</TableCell>
                <TableCell>
                  {item?.origin?.city || item?.origin?.state || item?.stops?.[0]
                    ? `${item.origin?.city || item.stops?.[0]?.city || ''}${(item.origin?.city || item.stops?.[0]?.city) && (item.origin?.state || item.stops?.[0]?.state) ? ', ' : ''}${item.origin?.state || item.stops?.[0]?.state || ''}`
                    : 'N/A'
                  }
                  →
                  {item?.destination?.city || item?.destination?.state || item?.stops?.[1]
                    ? `${item.destination?.city || item.stops?.[1]?.city || ''}${(item.destination?.city || item.stops?.[1]?.city) && (item.destination?.state || item.stops?.[1]?.state) ? ', ' : ''}${item.destination?.state || item.stops?.[1]?.state || ''}`
                    : 'N/A'
                  }
                </TableCell>
                
                <TableCell>
                  <StatusUpdateSelect
                    shipmentId={item._id}
                    currentStatus={item.status || (activeTab === 'quotes' ? 'quote' : 'booked')}
                    statusOptions={activeTab === 'quotes' ? quoteStatusOptions : shipmentStatusOptions}
                    queryToInvalidate={activeTab}
                  />
                </TableCell>
                
                <TableCell>{formatDate(item.scheduledPickupDate)}</TableCell>
                <TableCell>{formatDate(item.scheduledDeliveryDate)}</TableCell>
                <TableCell>
                  {activeTab === 'quotes' 
                    ? `$${(item.totalCustomerRate ?? item.customerRate)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}` 
                    : item.containerNumber || 'N/A'}
                </TableCell>
                <TableCell>{item.proNumber || 'N/A'}</TableCell>
                <TableCell align="center">
                  <Tooltip title="Add Check-in"><IconButton size="small" onClick={() => onAddCheckIn(item)} disabled={activeTab === 'quotes'}><CheckIcon fontSize="inherit"/></IconButton></Tooltip>
                  <Tooltip title="Generate Email"><IconButton size="small" onClick={() => onGenerateEmail(item)}><EmailIcon fontSize="inherit"/></IconButton></Tooltip>
                  <Tooltip title="View Details"><IconButton size="small" onClick={() => onViewDetails(item)}><ViewIcon fontSize="inherit"/></IconButton></Tooltip>
                  <Tooltip title={activeTab === 'quotes' ? "Edit Quote" : "Edit Shipment"}><IconButton size="small" onClick={() => onEditItem(item)}><EditIcon fontSize="inherit"/></IconButton></Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => onDeleteItem(item)} color="error">
                      <DeleteIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow><TableCell colSpan={11} align="center">{`No ${activeTab} found.`}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ShipmentsTable;