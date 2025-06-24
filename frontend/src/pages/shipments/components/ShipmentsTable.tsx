import React from 'react';
import { Box, Typography } from '@mui/material';
import * as material from '@mui/material';
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

const formatDateTime = (dateString?: string, timeString?: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const formattedDate = new Date(date.getTime() + Math.abs(date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  return `${formattedDate} ${timeString || ''}`;
};

const ShipmentsTable = ({
  items, isLoading, activeTab,
  onEditItem, onViewDetails, onAddCheckIn, onGenerateEmail,
  onDeleteItem, getDisplayName
}) => {
  return (
    <material.TableContainer component={material.Paper}>
      <material.Table stickyHeader size="small">
        <material.TableHead>
          <material.TableRow>
            <material.TableCell sx={{ minWidth: 150, textAlign: 'center' }}></material.TableCell>
            <material.TableCell sx={{ minWidth: 100, textAlign: 'center' }}>DO #</material.TableCell>
            <material.TableCell sx={{ minWidth: 150, textAlign: 'center' }}>Customer</material.TableCell>
            <material.TableCell sx={{ minWidth: 180, textAlign: 'center' }}>PU/DO Info</material.TableCell>
            <material.TableCell sx={{ minWidth: 150, textAlign: 'center' }}>Container</material.TableCell>
            <material.TableCell sx={{ minWidth: 150, textAlign: 'center' }}>SSL</material.TableCell>
            <material.TableCell sx={{ minWidth: 180, textAlign: 'center' }}>Origin → Dest.</material.TableCell>
            <material.TableCell sx={{ minWidth: 140, textAlign: 'center' }}>Customer Ref #</material.TableCell>
            <material.TableCell sx={{ minWidth: 110, textAlign: 'center' }}>ETA</material.TableCell>
            <material.TableCell sx={{ minWidth: 150, textAlign: 'center' }}>Carrier</material.TableCell>
            <material.TableCell sx={{ minWidth: 150, textAlign: 'center' }}>Pulled</material.TableCell>
            <material.TableCell sx={{ minWidth: 150, textAlign: 'center' }}>Appointment</material.TableCell>
            <material.TableCell sx={{ minWidth: 150, textAlign: 'center' }}>Ingated</material.TableCell>
            <material.TableCell sx={{ minWidth: 150, textAlign: 'center' }}>POD</material.TableCell>
            <material.TableCell sx={{ minWidth: 110, textAlign: 'center' }}>LFD</material.TableCell>
          </material.TableRow>
        </material.TableHead>
        <material.TableBody>
          {isLoading && items.length === 0 ? (
            <material.TableRow><material.TableCell colSpan={15} align="center">Loading items...</material.TableCell></material.TableRow>
          ) : items.length > 0 ? (
            items.map((item) => (
              <material.TableRow key={item._id} hover>
                <material.TableCell>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <material.Tooltip title="Edit">
                      <material.IconButton size="small" onClick={() => onEditItem(item)}>
                        <EditIcon fontSize="small" />
                      </material.IconButton>
                    </material.Tooltip>
                    <material.Tooltip title="View Details">
                      <material.IconButton size="small" onClick={() => onViewDetails(item)}>
                        <ViewIcon fontSize="small" />
                      </material.IconButton>
                    </material.Tooltip>
                    <material.Tooltip title="Add Check-In">
                      <material.IconButton size="small" onClick={() => onAddCheckIn(item)}>
                        <CheckIcon fontSize="small" />
                      </material.IconButton>
                    </material.Tooltip>
                    <material.Tooltip title="Generate Email">
                      <material.IconButton size="small" onClick={() => onGenerateEmail(item)}>
                        <EmailIcon fontSize="small" />
                      </material.IconButton>
                    </material.Tooltip>
                    <material.Tooltip title="Delete">
                      <material.IconButton size="small" onClick={() => onDeleteItem(item)}>
                        <DeleteIcon fontSize="small" />
                      </material.IconButton>
                    </material.Tooltip>
                  </Box>
                </material.TableCell>
                <material.TableCell align="center">{item.deliveryOrderNumber || 'N/A'}</material.TableCell>
                <material.TableCell align="center">
                  {item.shipper?._id ? (
                    <material.Link component={RouterLink} to={`/shippers/${item.shipper._id}`} underline="hover">
                      {getDisplayName(item.shipper)}
                    </material.Link>
                  ) : (
                    getDisplayName(item.shipper)
                  )}
                </material.TableCell>
                <material.TableCell align="center">
                  {item.destination?.contactPhone || item.stops?.[1]?.contactPhone || 'N/A'}
                </material.TableCell>
                <material.TableCell align="center">{item.containerNumber || 'N/A'}</material.TableCell>
                <material.TableCell align="center">{item.steamshipLine || 'N/A'}</material.TableCell>
                <material.TableCell align="center">
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="body2">
                      {item?.origin?.city || item?.stops?.[0]?.city || ''}{(item?.origin?.city || item?.stops?.[0]?.city) && (item?.origin?.state || item?.stops?.[0]?.state) ? ', ' : ''}{item?.origin?.state || item?.stops?.[0]?.state || ''}
                    </Typography>
                    <Typography variant="caption">via</Typography>
                    <Typography variant="body2">
                      {item?.destination?.city || item?.stops?.[1]?.city || ''}{(item?.destination?.city || item?.stops?.[1]?.city) && (item?.destination?.state || item?.stops?.[1]?.state) ? ', ' : ''}{item?.destination?.state || item?.stops?.[1]?.state || ''}
                    </Typography>
                  </Box>
                </material.TableCell>
                <material.TableCell align="center">{item.shipmentNumber || 'N/A'}</material.TableCell>
                <material.TableCell align="center">{item.estimatedReadyDate ? formatDate(item.estimatedReadyDate) : 'N/A'}</material.TableCell>
                <material.TableCell align="center">
                  {item.carrier?._id ? (
                    <material.Link component={RouterLink} to={`/carriers/${item.carrier._id}`} underline="hover">
                      {getDisplayName(item.carrier)}
                    </material.Link>
                  ) : (
                    getDisplayName(item.carrier)
                  )}
                </material.TableCell>
                <material.TableCell align="center">{formatDateTime(item.actualPickupDate, item.actualPickupTime)}</material.TableCell>
                <material.TableCell align="center">{formatDateTime(item.scheduledDeliveryDate, item.scheduledDeliveryTime)}</material.TableCell>
                <material.TableCell align="center">{item.ingatedDate || 'N/A'}</material.TableCell>
                <material.TableCell align="center">{item.proofOfDeliveryNumber || 'N/A'}</material.TableCell>
                <material.TableCell align="center">{item.lastFreeDay || 'N/A'}</material.TableCell>
              </material.TableRow>
            ))
          ) : (
            <material.TableRow><material.TableCell colSpan={15} align="center">{`No ${activeTab} found.`}</material.TableCell></material.TableRow>
          )}
        </material.TableBody>
      </material.Table>
    </material.TableContainer>
  );
};

export default ShipmentsTable;