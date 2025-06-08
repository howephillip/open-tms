// File: backend/src/pages/carriers/CarrierDetailsView.tsx
import React from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useQuery } from 'react-query';
import { carrierAPI, shipmentAPI } from '../../services/api';
import {
  Box, Typography, CircularProgress, Alert, Paper, Grid, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Link
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Interfaces
interface CarrierInfo {
  _id: string; name: string; mcNumber: string; dotNumber: string;
  contact?: { name?: string; phone?: string; email?: string; };
  address?: { street?: string; city?: string; state?: string; zip?: string; };
  saferData?: { saferRating?: string; status?: string; lastUpdated?: string | Date; insuranceInfo?: any; totalDrivers?: number; totalPowerUnits?: number; };
  equipment?: string[]; preferredLanes?: string[];
}
interface ShipmentForCarrierTable {
  _id: string; shipmentNumber: string; status: string; 
  origin: { city?: string; state?: string; name?: string; };
  destination: { city?: string; state?: string; name?: string; };
  scheduledPickupDate: string; scheduledDeliveryDate: string;
  customerRate?: number;
  carrierCostTotal?: number; // Added for correct totals
  modeOfTransport?: string;
}


const CarrierDetailsView: React.FC = () => {
  const { carrierId } = useParams<{ carrierId: string }>();
  const navigate = useNavigate();

  const { data: carrierResponse, isLoading: isLoadingCarrier, isError: isErrorCarrier, error: errorCarrier } = 
    useQuery(['carrierDetails', carrierId], () => carrierAPI.getById(carrierId!), { enabled: !!carrierId });
  const carrier: CarrierInfo | null = carrierResponse?.data?.data || null;

  // We need to request totalCarrierCost in the fields
  const { data: shipmentsResponse, isLoading: isLoadingShipments, isError: isErrorShipments, error: errorShipmentsData } = 
    useQuery(['carrierShipmentsList', carrierId], () => shipmentAPI.getAll({ carrier: carrierId, limit: 100, sort: '-scheduledPickupDate', select: 'shipmentNumber status origin destination scheduledPickupDate scheduledDeliveryDate carrierCostTotal modeOfTransport' }), { enabled: !!carrierId });
  const shipments: ShipmentForCarrierTable[] = shipmentsResponse?.data?.data?.shipments || [];

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

  if (isLoadingCarrier) return <Box sx={{p:3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh'}}><CircularProgress /></Box>;
  if (isErrorCarrier) return <Alert severity="error">Error fetching carrier details: {(errorCarrier as any)?.response?.data?.message || (errorCarrier as any)?.message}</Alert>;
  if (!carrier) return <Alert severity="warning">Carrier (ID: {carrierId}) not found.</Alert>;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/carriers')} sx={{ mb: 2 }}>
        Back to Carriers List
      </Button>
      <Paper sx={{ p: { xs: 1.5, sm: 2, md: 3 }, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>{carrier.name}</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}><Typography><strong>MC #:</strong> {carrier.mcNumber || 'N/A'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={4}><Typography><strong>DOT #:</strong> {carrier.dotNumber || 'N/A'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={4}><Typography><strong>Contact:</strong> {carrier.contact?.name || 'N/A'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={4}><Typography><strong>Phone:</strong> {carrier.contact?.phone || 'N/A'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={4}><Typography><strong>Email:</strong> <Link href={`mailto:${carrier.contact?.email}`}>{carrier.contact?.email || 'N/A'}</Link></Typography></Grid>
          <Grid item xs={12}><Typography><strong>Address:</strong> {`${carrier.address?.street || ''}, ${carrier.address?.city || ''}, ${carrier.address?.state || ''} ${carrier.address?.zip || ''}`}</Typography></Grid>
          
          <Grid item xs={12}><Divider sx={{my:1}}><Chip label="Compliance & SAFER Data"/></Divider></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography><strong>SAFER Rating:</strong> {carrier.saferData?.saferRating || 'N/A'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography><strong>FMCSA Status:</strong> {carrier.saferData?.status || 'N/A'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography><strong>Drivers:</strong> {carrier.saferData?.totalDrivers ?? 'N/A'}</Typography></Grid>
          <Grid item xs={12} sm={6} md={3}><Typography><strong>Power Units:</strong> {carrier.saferData?.totalPowerUnits ?? 'N/A'}</Typography></Grid>
          <Grid item xs={12}><Typography><strong>SAFER Last Update:</strong> {carrier.saferData?.lastUpdated ? new Date(carrier.saferData.lastUpdated).toLocaleDateString() : 'N/A'}</Typography></Grid>

          {carrier.equipment && carrier.equipment.length > 0 && (
            <Grid item xs={12}><Typography mt={1}><strong>Equipment Types:</strong> {carrier.equipment.join(', ')}</Typography></Grid>
          )}
           {carrier.preferredLanes && carrier.preferredLanes.length > 0 && (
            <Grid item xs={12}><Typography><strong>Preferred Lanes:</strong> {carrier.preferredLanes.join('; ')}</Typography></Grid>
          )}
        </Grid>
      </Paper>

      <Typography variant="h5" component="h2" gutterBottom>Shipments Handled by {carrier.name}</Typography>
      {isLoadingShipments && <CircularProgress sx={{display: 'block', margin: '20px auto'}}/>}
      {isErrorShipments && <Alert severity="error">Error fetching shipments for this carrier: {(errorShipmentsData as any)?.response?.data?.message || (errorShipmentsData as any)?.message}</Alert>}
      {!isLoadingShipments && !isErrorShipments && shipments.length === 0 && (
        <Typography>No shipments found for this carrier.</Typography>
      )}
      {!isLoadingShipments && !isErrorShipments && shipments.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Shipment #</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell>Origin</TableCell>
                <TableCell>Destination</TableCell>
                <TableCell>Pickup</TableCell>
                <TableCell>Delivery</TableCell>
                <TableCell align="right">Carrier Cost</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shipments.map(shipment => (
                <TableRow hover key={shipment._id} sx={{ '&:hover': { cursor: 'pointer' } }} onClick={() => navigate(`/shipments/${shipment._id}`)}>
                  <TableCell component="th" scope="row">
                    <Link component={RouterLink} to={`/shipments/${shipment._id}`} sx={{ textDecoration: 'none', color: 'inherit' }}>
                      {shipment.shipmentNumber}
                    </Link>
                  </TableCell>
                  <TableCell><Chip label={shipment.status?.replace(/_/g,' ') || 'N/A'} color={getStatusColor(shipment.status)} size="small" sx={{textTransform:'capitalize'}}/></TableCell>
                  <TableCell sx={{textTransform:'capitalize'}}>{shipment.modeOfTransport?.replace(/-/g,' ') || 'N/A'}</TableCell>
                  <TableCell>{shipment.origin?.name || `${shipment.origin?.city || 'N/A'}, ${shipment.origin?.state || ''}`}</TableCell>
                  <TableCell>{shipment.destination?.name || `${shipment.destination?.city || 'N/A'}, ${shipment.destination?.state || ''}`}</TableCell>
                  <TableCell>{shipment.scheduledPickupDate ? new Date(shipment.scheduledPickupDate).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>{shipment.scheduledDeliveryDate ? new Date(shipment.scheduledDeliveryDate).toLocaleDateString() : 'N/A'}</TableCell>
                  {/* --- THIS IS THE FIX --- */}
                  <TableCell align="right">${(shipment.carrierCostTotal)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default CarrierDetailsView;