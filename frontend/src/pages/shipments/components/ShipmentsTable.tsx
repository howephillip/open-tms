// File: frontend/src/pages/shipments/components/ShipmentsTable.tsx
import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Tooltip, Link as MuiLink
} from '@mui/material';
import {
  Edit as EditIcon, Visibility as ViewIcon,
  CheckCircleOutline as CheckIcon, EmailOutlined as EmailIcon,
  DeleteOutline as DeleteIcon, // Import DeleteIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

interface ShipperCarrierStub { _id: string; name?: string; }
interface ShipmentRowData {
  _id: string;
  shipmentNumber?: string;
  modeOfTransport?: string;
  shipper?: ShipperCarrierStub | string | null;
  carrier?: ShipperCarrierStub | string | null;
  origin?: { city?: string; state?: string; };
  destination?: { city?: string; state?: string; };
  status?: string;
  scheduledPickupDate?: string;
  scheduledDeliveryDate?: string;
  containerNumber?: string;
  proNumber?: string;
  customerRate?: number;
}

interface ShipmentsTableProps {
  items: ShipmentRowData[];
  isLoading: boolean;
  activeTab: 'shipments' | 'quotes';
  onEditItem: (item: ShipmentRowData) => void;
  onViewDetails: (item: ShipmentRowData) => void;
  onAddCheckIn: (item: ShipmentRowData) => void;
  onGenerateEmail: (item: ShipmentRowData) => void;
  onDeleteItem: (item: ShipmentRowData) => void; // New prop for delete
  getDisplayName: (entity: ShipperCarrierStub | string | null | undefined) => string;
  getStatusColor: (status: string | undefined) => "default" | "primary" | "secondary" | "warning" | "info" | "success" | "error";
}

const ShipmentsTable: React.FC<ShipmentsTableProps> = ({
  items, isLoading, activeTab,
  onEditItem, onViewDetails, onAddCheckIn, onGenerateEmail,
  onDeleteItem, // Destructure new prop
  getDisplayName, getStatusColor
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
            <TableCell sx={{minWidth: 120}}>Status</TableCell>
            <TableCell sx={{minWidth: 100}}>Pickup</TableCell>
            <TableCell sx={{minWidth: 100}}>Delivery</TableCell>
            <TableCell sx={{minWidth: 120}}>{activeTab === 'quotes' ? 'Quoted Rate' : 'Container #'}</TableCell>
            <TableCell sx={{minWidth: 120}}>PRO #</TableCell>
            <TableCell align="center" sx={{minWidth: 180}}>Actions</TableCell> {/* Increased minWidth for more icons */}
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading && items.length === 0 ? (
            <TableRow><TableCell colSpan={11} align="center">Loading items...</TableCell></TableRow>
          ) : items.length > 0 ? (
            items.map((item) => (
              <TableRow hover key={item._id}>
                <TableCell>
                  <MuiLink
                      component={RouterLink}
                      to={`/shipments/${item._id}`}
                      sx={{ textDecoration: 'none', color: 'primary.main', '&:hover': {textDecoration: 'underline'} }}
                  >
                      {item.shipmentNumber || 'N/A'}
                  </MuiLink>
                </TableCell>
                <TableCell sx={{textTransform: 'capitalize'}}>{item.modeOfTransport?.replace(/-/g, ' ') || 'N/A'}</TableCell>
                <TableCell>{getDisplayName(item.shipper)}</TableCell>
                <TableCell>{getDisplayName(item.carrier)}</TableCell>
                <TableCell>{item.origin?.city || 'N/A'} → {item.destination?.city || 'N/A'}</TableCell>
                <TableCell><Chip label={item.status?.replace(/_/g,' ') || 'N/A'} color={getStatusColor(item.status)} size="small" sx={{textTransform: 'capitalize'}} /></TableCell>
                <TableCell>{item.scheduledPickupDate ? new Date(item.scheduledPickupDate).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell>{item.scheduledDeliveryDate ? new Date(item.scheduledDeliveryDate).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell>{activeTab === 'quotes' ? `$${item.customerRate?.toLocaleString() || 'N/A'}` : item.containerNumber || 'N/A'}</TableCell>
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