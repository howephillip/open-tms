// File: frontend/src/pages/shippers/ShipperDetailsView.tsx
import React from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useQuery } from 'react-query';
import { shipperAPI, shipmentAPI } from '../../services/api';
import {
  Box, Typography, CircularProgress, Alert, Paper, Grid, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Link
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';

// Interfaces (Ensure these match your backend IShipper and simplified IShipment)
interface ShipperDetails {
  _id: string; name: string; industry?: string;
  address?: { street?: string; city?: string; state?: string; zip?: string; };
  contact?: { name?: string; phone?: string; email?: string; };
  billingInfo?: { paymentTerms?: string; creditLimit?: number; invoiceEmail?: string; };
  preferredEquipment?: string[];
  totalShipments?: number; totalRevenue?: number; averageMargin?: number;
  // documents?: any[]; // If you populate documents for shippers
}
interface ShipmentForShipperTable {
  _id: string; shipmentNumber: string; status: string;
  destination: { city?: string; state?: string; name?: string; };
  scheduledDeliveryDate: string; customerRate?: number; modeOfTransport?: string;
}


const ShipperDetailsView: React.FC = () => {
  const { shipperId } = useParams<{ shipperId: string }>();
  const navigate = useNavigate();

  const { data: shipperResponse, isLoading: isLoadingShipper, isError: isErrorShipper, error: errorShipper } = 
    useQuery(['shipperDetails', shipperId], () => shipperAPI.getById(shipperId!), { enabled: !!shipperId });
  const shipper: ShipperDetails | null = shipperResponse?.data?.data || null;

  const { data: shipmentsResponse, isLoading: isLoadingShipments, isError: isErrorShipments, error: errorShipmentsData } = 
    useQuery(['shipperShipmentsList', shipperId], () => shipmentAPI.getAll({ shipper: shipperId, limit: 100, sort: '-scheduledPickupDate' }), { enabled: !!shipperId });
  const shipments: ShipmentForShipperTable[] = shipmentsResponse?.data?.data?.shipments || [];

  const getStatusColor = (status: string | undefined): "default" | "primary"| "secondary" | "warning" | "info" | "success" | "error" => {
    switch (status?.toLowerCase().replace(/_/g, ' ')) {
      case 'quote': return 'default'; case 'pending': return 'warning';
      case 'booked': case 'dispatched': case 'at pickup': /* ... more ... */ return 'info';
      case 'picked up': case 'delivered': case 'pod received': return 'success';
      case 'invoiced': return 'primary'; case 'paid': return 'secondary';
      case 'cancelled': case 'on hold': case 'problem': return 'error';
      default: return 'default';
    }
  };

  if (isLoadingShipper) return <Box sx={{p:3, display: 'flex', justifyContent: 'center'}}><CircularProgress /></Box>;
  if (isErrorShipper) return <Alert severity="error">Error fetching shipper: {(errorShipper as any)?.response?.data?.message || (errorShipper as any)?.message}</Alert>;
  if (!shipper) return <Alert severity="warning">Shipper (ID: {shipperId}) not found.</Alert>;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/shippers')} sx={{ mb: 2 }}>
        Back to Shippers List
      </Button>
      <Paper sx={{ p: { xs: 1.5, sm: 2, md: 3 }, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Typography variant="h4" component="h1" gutterBottom>{shipper.name}</Typography>
            {/* TODO: Add Edit Shipper button that navigates to an edit route for shippers, similar to shipments */}
            {/* <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => navigate(`/shippers/edit/${shipper._id}`)}>Edit Shipper</Button> */}
        </Box>
        <Typography variant="subtitle1" color="textSecondary" gutterBottom>Industry: {shipper.industry || 'N/A'}</Typography>
        
        <Grid container spacing={2} mt={1}>
            <Grid item xs={12} md={6}>
                <Typography variant="h6">Contact Information</Typography>
                <Divider sx={{my:1}}/>
                <Typography><strong>Name:</strong> {shipper.contact?.name || 'N/A'}</Typography>
                <Typography><strong>Phone:</strong> {shipper.contact?.phone || 'N/A'}</Typography>
                <Typography><strong>Email:</strong> <Link href={`mailto:${shipper.contact?.email}`}>{shipper.contact?.email || 'N/A'}</Link></Typography>
                <Typography mt={1}><strong>Address:</strong> {`${shipper.address?.street || ''}, ${shipper.address?.city || ''}, ${shipper.address?.state || ''} ${shipper.address?.zip || ''}`}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
                <Typography variant="h6">Billing Information</Typography>
                <Divider sx={{my:1}}/>
                <Typography><strong>Invoice Email:</strong> {shipper.billingInfo?.invoiceEmail || 'N/A'}</Typography>
                <Typography><strong>Payment Terms:</strong> {shipper.billingInfo?.paymentTerms || 'N/A'}</Typography>
                <Typography><strong>Credit Limit:</strong> ${shipper.billingInfo?.creditLimit?.toLocaleString() || '0'}</Typography>
            </Grid>
             {shipper.preferredEquipment && shipper.preferredEquipment.length > 0 && (
                <Grid item xs={12}><Typography mt={1}><strong>Preferred Equipment:</strong> {shipper.preferredEquipment.join(', ')}</Typography></Grid>
            )}
             <Grid item xs={12}><Divider sx={{my:2}}><Chip label="Performance Metrics (Sample)"/></Divider></Grid>
             <Grid item xs={12} sm={4}><Typography><strong>Total Shipments:</strong> {shipper.totalShipments || 0}</Typography></Grid>
             <Grid item xs={12} sm={4}><Typography><strong>Total Revenue:</strong> ${shipper.totalRevenue?.toLocaleString() || 0}</Typography></Grid>
             <Grid item xs={12} sm={4}><Typography><strong>Avg. Margin:</strong> {shipper.averageMargin?.toFixed(2) || 0}%</Typography></Grid>
        </Grid>
      </Paper>

      <Typography variant="h5" component="h2" gutterBottom>Shipments for {shipper.name}</Typography>
      {isLoadingShipments && <CircularProgress sx={{display: 'block', margin: '20px auto'}}/>}
      {isErrorShipments && <Alert severity="error">Error fetching shipments for this shipper.</Alert>}
      {!isLoadingShipments && !isErrorShipments && shipments.length === 0 && (
        <Typography>No shipments found for this shipper.</Typography>
      )}
      {!isLoadingShipments && !isErrorShipments && shipments.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small" stickyHeader>
            <TableHead><TableRow>
                <TableCell>Shipment #</TableCell><TableCell>Status</TableCell>
                <TableCell>Mode</TableCell><TableCell>Destination</TableCell>
                <TableCell>Delivery Date</TableCell><TableCell align="right">Rate</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {shipments.map(shipment => (
                <TableRow hover key={shipment._id} sx={{ '&:hover': { cursor: 'pointer' } }} onClick={() => navigate(`/shipments/${shipment._id}`)}>
                  <TableCell><Link component={RouterLink} to={`/shipments/${shipment._id}`} sx={{textDecoration:'none', color:'inherit', '&:hover':{color:'primary.main'}}}>{shipment.shipmentNumber}</Link></TableCell>
                  <TableCell><Chip label={shipment.status?.replace(/_/g,' ') || 'N/A'} color={getStatusColor(shipment.status)} size="small" sx={{textTransform:'capitalize'}}/></TableCell>
                  <TableCell sx={{textTransform:'capitalize'}}>{shipment.modeOfTransport?.replace(/-/g,' ') || 'N/A'}</TableCell>
                  <TableCell>{shipment.destination?.name || `${shipment.destination?.city || 'N/A'}, ${shipment.destination?.state || ''}`}</TableCell>
                  <TableCell>{new Date(shipment.scheduledDeliveryDate).toLocaleDateString()}</TableCell>
                  <TableCell align="right">${shipment.customerRate?.toLocaleString() || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ShipperDetailsView;