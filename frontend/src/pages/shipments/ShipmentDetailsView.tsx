// File: frontend/src/pages/shipments/ShipmentDetailsView.tsx
import React from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useQuery } from 'react-query';
import { shipmentAPI, documentAPI } from '../../services/api'; // Added documentAPI
import { 
    Box, Typography, CircularProgress, Alert, Paper, Grid, Button, 
    Divider, Chip, Link, List, ListItem, ListItemText, ListItemIcon 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EventIcon from '@mui/icons-material/Event'; // Can use for dates
import BusinessIcon from '@mui/icons-material/Business';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ArticleIcon from '@mui/icons-material/Article'; // For documents
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import NotesIcon from '@mui/icons-material/Notes';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import FlightIcon from '@mui/icons-material/Flight';
import TrainIcon from '@mui/icons-material/Train';

// --- Interfaces ---
interface ContactStub { name?: string; phone?: string; email?: string; }
interface UserStub { _id: string; firstName?: string; lastName?: string; email?: string; }
interface ShipperStub { _id: string; name: string; contact?: ContactStub; }
interface CarrierStub { _id: string; name: string; mcNumber?: string; dotNumber?: string; contact?: ContactStub; }
interface IReferenceNumberFE { type: string; value: string; _id?: string; }
type ModeOfTransportType = string; type StatusType = string; type LocationType = string;
interface CheckIn { dateTime: string | Date; method: string; notes: string; contactPerson?: string; currentLocation?: string; statusUpdate?: StatusType; createdBy?: UserStub | string; _id?: string;}
interface IDocumentStub { _id: string; originalName: string; mimetype: string; size: number; createdAt: string; path: string;} // path is key for download
interface Shipment {
  _id: string; shipmentNumber: string; shipper: ShipperStub | string | null; carrier: CarrierStub | string | null; modeOfTransport: ModeOfTransportType;
  billOfLadingNumber?: string; proNumber?: string; deliveryOrderNumber?: string; bookingNumber?: string;
  containerNumber?: string; sealNumber?: string; pickupNumber?: string; proofOfDeliveryNumber?: string;
  purchaseOrderNumbers?: string[]; otherReferenceNumbers?: IReferenceNumberFE[];
  steamshipLine?: string; vesselName?: string; voyageNumber?: string; terminal?: string;
  lastFreeDayPort?: string; lastFreeDayRail?: string; emptyReturnDepot?: string; emptyContainerReturnByDate?: string;
  chassisNumber?: string; chassisType?: string; chassisProvider?: string; chassisReturnByDate?: string;
  railOriginRamp?: string; railDestinationRamp?: string; railCarrier?: string;
  airline?: string; flightNumber?: string; masterAirWaybill?: string; houseAirWaybill?: string;
  airportOfDeparture?: string; airportOfArrival?: string;
  isTransload?: boolean; transloadFacility?: { name?: string; address?: string; city?: string; state?: string; zip?: string; };
  transloadDate?: string;
  origin: { name?: string; address: string; city: string; state: string; zip: string; country?: string; locationType?: LocationType; contactName?: string; contactPhone?: string; contactEmail?: string; notes?: string; };
  destination: { name?: string; address: string; city: string; state: string; zip: string; country?: string; locationType?: LocationType; contactName?: string; contactPhone?: string; contactEmail?: string; notes?: string; };
  scheduledPickupDate: string; scheduledPickupTime?: string; pickupAppointmentNumber?: string; actualPickupDateTime?: string;
  scheduledDeliveryDate: string; scheduledDeliveryTime?: string; deliveryAppointmentNumber?: string; actualDeliveryDateTime?: string;
  status: StatusType; equipmentType: string; equipmentLength?: number; equipmentUnit?: 'ft' | 'm';
  commodityDescription: string; pieceCount?: number; packageType?: string; totalWeight?: number;
  weightUnit?: 'lbs' | 'kg'; isHazardous?: boolean; unNumber?: string; hazmatClass?: string;
  isTemperatureControlled?: boolean; temperatureMin?: number; temperatureMax?: number; tempUnit?: 'C' | 'F';
  customerRate: number; carrierCostTotal: number; grossProfit?: number; margin?: number;
  internalNotes?: string; specialInstructions?: string; customTags?: string[];
  checkIns?: CheckIn[]; documents?: IDocumentStub[]; createdBy?: UserStub | string; updatedAt?: string; createdAt?: string;
}

const formatDisplayDateTime = (dateTimeString?: string | Date): string => { if (!dateTimeString) return 'N/A'; try { return new Date(dateTimeString).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit' }); } catch (e) { return 'Invalid Date';}};
const formatDisplayDate = (dateString?: string | Date): string => { if (!dateString) return 'N/A'; try { return new Date(dateString).toLocaleDateString(); } catch (e) { return 'Invalid Date';}};
const formatFileSize = (bytes: number = 0) => { if (bytes === 0) return '0 Bytes'; const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];};

const ShipmentDetailsView: React.FC = () => {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const navigate = useNavigate();

  const { data: shipmentResponse, isLoading, isError, error } = 
    useQuery(['shipmentDetails', shipmentId], () => shipmentAPI.getById(shipmentId!), { enabled: !!shipmentId });
  const shipment: Shipment | null = shipmentResponse?.data?.data || null;

  const getDisplayName = (entity: ShipperStub | CarrierStub | UserStub | string | null | undefined): string => {
    if (!entity) return 'N/A';
    if (typeof entity === 'string') return `ID: ${entity.substring(0,8)}...`;
    if (entity && 'firstName' in entity && entity.firstName && 'lastName' in entity && entity.lastName) return `${entity.firstName} ${entity.lastName}`;
    if (entity && 'name' in entity && entity.name) return entity.name;
    return 'Unknown';
  };
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

  const renderLocation = (loc: Shipment['origin'] | Shipment['destination'] | undefined, type: 'Origin' | 'Destination') => {
    if (!loc) return <Typography>N/A</Typography>;
    return (
        <Box mb={1}>
        <Typography variant="subtitle1" gutterBottom sx={{display: 'flex', alignItems: 'center'}}><LocationOnIcon sx={{mr:0.5, fontSize:'1rem'}} color="action"/>{type}: {loc.name || `${loc.city}, ${loc.state}`}</Typography>
        <Typography variant="body2" color="textSecondary" pl={3}>{loc.address}, {loc.city}, {loc.state} {loc.zip} {loc.country || ''}</Typography>
        {loc.locationType && <Typography variant="caption" display="block" pl={3}>Type: {loc.locationType.replace(/_/g, ' ')}</Typography>}
        {loc.contactName && <Typography variant="caption" display="block" pl={3}>Contact: {loc.contactName} {loc.contactPhone ? `(${loc.contactPhone})` : ''}</Typography>}
        {loc.notes && <Typography variant="caption" color="text.secondary" display="block" pl={3}>Notes: {loc.notes}</Typography>}
        </Box>
    );
  };

  if (isLoading) return <Box sx={{p:3, display: 'flex', justifyContent: 'center'}}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error">Error fetching shipment: {(error as any)?.response?.data?.message || (error as any)?.message}</Alert>;
  if (!shipment) return <Alert severity="warning">Shipment (ID: {shipmentId}) not found.</Alert>;

  const modeDisplay = shipment.modeOfTransport?.replace(/-/g, ' ') || 'N/A';

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Back
      </Button>
      <Paper sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Box>
                <Typography variant="h4" component="h1" gutterBottom>{shipment.shipmentNumber}</Typography>
                <Chip label={shipment.status?.replace(/_/g,' ') || 'N/A'} color={getStatusColor(shipment.status)} sx={{textTransform:'capitalize', mt: 0.5, fontSize:'0.9rem'}} />
            </Box>
            <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => navigate(`/shipments/edit/${shipment._id}`)}>
                Edit Shipment
            </Button>
        </Box>
        <Typography variant="h6" sx={{textTransform:'capitalize', color: 'text.secondary', mb:2}}>{modeDisplay}</Typography>

        <Grid container spacing={3}>
            {/* Left Column */}
            <Grid item xs={12} md={7}>
                <Paper variant="outlined" sx={{p:2, mb:2}}>
                    <Typography variant="h6" gutterBottom>Parties</Typography>
                    <Grid container spacing={1}>
                        <Grid item xs={12} sm={6}><Typography><strong>Shipper:</strong> <Link component={RouterLink} to={`/shippers/${typeof shipment.shipper === 'object' ? shipment.shipper?._id : ''}`}>{getDisplayName(shipment.shipper)}</Link></Typography></Grid>
                        <Grid item xs={12} sm={6}><Typography><strong>Carrier:</strong> <Link component={RouterLink} to={`/carriers/${typeof shipment.carrier === 'object' ? shipment.carrier?._id : ''}`}>{getDisplayName(shipment.carrier)}</Link></Typography></Grid>
                        {shipment.consignee?.name && <Grid item xs={12}><Typography><strong>Consignee:</strong> {shipment.consignee.name}</Typography></Grid>}
                        {/* Assuming billTo might be populated like shipper/carrier */}
                        {shipment.billTo && <Grid item xs={12}><Typography><strong>Bill To:</strong> {getDisplayName(shipment.billTo as any)}</Typography></Grid>} 
                    </Grid>
                </Paper>

                <Paper variant="outlined" sx={{p:2, mb:2}}>
                    <Typography variant="h6" gutterBottom>Route & Timing</Typography>
                    {renderLocation(shipment.origin, 'Origin')}
                    <Divider sx={{my:1}}/>
                    {renderLocation(shipment.destination, 'Destination')}
                    <Divider sx={{my:1}}/>
                    <Grid container spacing={1}>
                        <Grid item xs={12} sm={6}><Typography><strong>Scheduled Pickup:</strong> {formatDisplayDate(shipment.scheduledPickupDate)} {shipment.scheduledPickupTime || ''} {shipment.pickupAppointmentNumber ? `(Appt#: ${shipment.pickupAppointmentNumber})`: ''}</Typography></Grid>
                        <Grid item xs={12} sm={6}><Typography><strong>Scheduled Delivery:</strong> {formatDisplayDate(shipment.scheduledDeliveryDate)} {shipment.scheduledDeliveryTime || ''} {shipment.deliveryAppointmentNumber ? `(Appt#: ${shipment.deliveryAppointmentNumber})`: ''}</Typography></Grid>
                        {shipment.actualPickupDateTime && <Grid item xs={12} sm={6}><Typography><strong>Actual Pickup:</strong> {formatDisplayDateTime(shipment.actualPickupDateTime)}</Typography></Grid>}
                        {shipment.actualDeliveryDateTime && <Grid item xs={12} sm={6}><Typography><strong>Actual Delivery:</strong> {formatDisplayDateTime(shipment.actualDeliveryDateTime)}</Typography></Grid>}
                    </Grid>
                </Paper>

                <Paper variant="outlined" sx={{p:2, mb:2}}>
                    <Typography variant="h6" gutterBottom>References</Typography>
                    <Grid container spacing={1}>
                        {shipment.billOfLadingNumber && <Grid item xs={6} sm={4}><Typography><strong>BOL:</strong> {shipment.billOfLadingNumber}</Typography></Grid>}
                        {shipment.proNumber && <Grid item xs={6} sm={4}><Typography><strong>PRO:</strong> {shipment.proNumber}</Typography></Grid>}
                        {shipment.deliveryOrderNumber && <Grid item xs={6} sm={4}><Typography><strong>DO:</strong> {shipment.deliveryOrderNumber}</Typography></Grid>}
                        {shipment.bookingNumber && <Grid item xs={6} sm={4}><Typography><strong>Booking:</strong> {shipment.bookingNumber}</Typography></Grid>}
                        {shipment.containerNumber && <Grid item xs={6} sm={4}><Typography><strong>Container:</strong> {shipment.containerNumber}</Typography></Grid>}
                        {shipment.sealNumber && <Grid item xs={6} sm={4}><Typography><strong>Seal:</strong> {shipment.sealNumber}</Typography></Grid>}
                        {shipment.pickupNumber && <Grid item xs={6} sm={4}><Typography><strong>Pickup#:</strong> {shipment.pickupNumber}</Typography></Grid>}
                        {shipment.proofOfDeliveryNumber && <Grid item xs={6} sm={4}><Typography><strong>POD Ref:</strong> {shipment.proofOfDeliveryNumber}</Typography></Grid>}
                    </Grid>
                    {shipment.purchaseOrderNumbers && shipment.purchaseOrderNumbers.length > 0 && <Typography mt={1}><strong>PO(s):</strong> {shipment.purchaseOrderNumbers.join(', ')}</Typography>}
                    {shipment.otherReferenceNumbers && shipment.otherReferenceNumbers.length > 0 && 
                        <Box mt={1}><Typography component="span"><strong>Other Refs: </strong></Typography>{shipment.otherReferenceNumbers.map((r,i) => <Chip key={r._id || i} size="small" label={`${r.type}: ${r.value}`} sx={{mr:0.5, mb:0.5}}/>)}</Box>
                    }
                </Paper>
                
                 {/* Conditional Sections */}
                {(modeDisplay.toLowerCase().includes('drayage') || modeDisplay.toLowerCase().includes('ocean') || modeDisplay.toLowerCase().includes('intermodal')) && (
                    <Paper variant="outlined" sx={{p:2, mb:2}}>
                        <Typography variant="h6" gutterBottom>Drayage / Ocean / Port</Typography>
                        <Grid container spacing={0.5}>
                            {shipment.steamshipLine && <Grid item xs={12} sm={6}><Typography><strong>SSL:</strong> {shipment.steamshipLine}</Typography></Grid>}
                            {shipment.vesselName && <Grid item xs={12} sm={6}><Typography><strong>Vessel:</strong> {shipment.vesselName} / {shipment.voyageNumber || 'N/A'}</Typography></Grid>}
                            {shipment.terminal && <Grid item xs={12} sm={6}><Typography><strong>Terminal:</strong> {shipment.terminal}</Typography></Grid>}
                            {shipment.lastFreeDayPort && <Grid item xs={12} sm={6}><Typography><strong>LFD Port:</strong> {formatDisplayDate(shipment.lastFreeDayPort)}</Typography></Grid>}
                            {shipment.emptyReturnDepot && <Grid item xs={12} sm={6}><Typography><strong>Empty Return:</strong> {shipment.emptyReturnDepot}</Typography></Grid>}
                            {shipment.emptyContainerReturnByDate && <Grid item xs={12} sm={6}><Typography><strong>Empty Return By:</strong> {formatDisplayDate(shipment.emptyContainerReturnByDate)}</Typography></Grid>}
                            {shipment.chassisNumber && <Grid item xs={12} sm={6}><Typography><strong>Chassis:</strong> {shipment.chassisNumber}</Typography></Grid>}
                            {shipment.chassisType && <Grid item xs={12} sm={6}><Typography><strong>Chassis Type:</strong> {shipment.chassisType}</Typography></Grid>}
                            {shipment.chassisProvider && <Grid item xs={12} sm={6}><Typography><strong>Chassis Provider:</strong> {shipment.chassisProvider}</Typography></Grid>}
                            {shipment.chassisReturnByDate && <Grid item xs={12} sm={6}><Typography><strong>Chassis Return By:</strong> {formatDisplayDate(shipment.chassisReturnByDate)}</Typography></Grid>}
                        </Grid>
                    </Paper>
                )}
                {modeDisplay.toLowerCase().includes('rail') && (
                    <Paper variant="outlined" sx={{p:2, mb:2}}>
                        <Typography variant="h6" gutterBottom>Rail Details</Typography>
                        <Grid container spacing={0.5}>
                            {shipment.railOriginRamp && <Grid item xs={12} sm={4}><Typography><strong>Origin Ramp:</strong> {shipment.railOriginRamp}</Typography></Grid>}
                            {shipment.railDestinationRamp && <Grid item xs={12} sm={4}><Typography><strong>Dest. Ramp:</strong> {shipment.railDestinationRamp}</Typography></Grid>}
                            {shipment.railCarrier && <Grid item xs={12} sm={4}><Typography><strong>Rail Carrier:</strong> {shipment.railCarrier}</Typography></Grid>}
                            {shipment.lastFreeDayRail && <Grid item xs={12} sm={4}><Typography><strong>LFD Rail:</strong> {formatDisplayDate(shipment.lastFreeDayRail)}</Typography></Grid>}
                        </Grid>
                    </Paper>
                )}
                {modeDisplay.toLowerCase().includes('air') && (
                    <Paper variant="outlined" sx={{p:2, mb:2}}>
                        <Typography variant="h6" gutterBottom>Air Freight Details</Typography>
                        <Grid container spacing={0.5}>
                            {shipment.airline && <Grid item xs={6} sm={3}><Typography><strong>Airline:</strong> {shipment.airline}</Typography></Grid>}
                            {shipment.flightNumber && <Grid item xs={6} sm={3}><Typography><strong>Flight #:</strong> {shipment.flightNumber}</Typography></Grid>}
                            {shipment.masterAirWaybill && <Grid item xs={6} sm={3}><Typography><strong>MAWB:</strong> {shipment.masterAirWaybill}</Typography></Grid>}
                            {shipment.houseAirWaybill && <Grid item xs={6} sm={3}><Typography><strong>HAWB:</strong> {shipment.houseAirWaybill}</Typography></Grid>}
                            {shipment.airportOfDeparture && <Grid item xs={6}><Typography><strong>Depart Airport:</strong> {shipment.airportOfDeparture}</Typography></Grid>}
                            {shipment.airportOfArrival && <Grid item xs={6}><Typography><strong>Arrival Airport:</strong> {shipment.airportOfArrival}</Typography></Grid>}
                        </Grid>
                    </Paper>
                )}
                {shipment.isTransload && shipment.transloadFacility && (
                    <Paper variant="outlined" sx={{p:2, mb:2}}>
                        <Typography variant="h6" gutterBottom>Transload Details</Typography>
                        <Typography><strong>Facility:</strong> {shipment.transloadFacility.name || 'N/A'} at {shipment.transloadFacility.address || 'N/A'}</Typography>
                        {shipment.transloadDate && <Typography><strong>Transload Date:</strong> {formatDisplayDate(shipment.transloadDate)}</Typography>}
                    </Paper>
                )}
            </Grid>

            {/* Right Column */}
            <Grid item xs={12} md={5}>
                <Paper variant="outlined" sx={{p:2, mb:2}}>
                    <Typography variant="h6" gutterBottom>Freight & Equipment</Typography>
                    <Typography><strong>Equipment:</strong> {shipment.equipmentType} {shipment.equipmentLength ? `${shipment.equipmentLength}${shipment.equipmentUnit || 'ft'}` : ''}</Typography>
                    <Typography><strong>Commodity:</strong> {shipment.commodityDescription}</Typography>
                    {shipment.totalWeight && <Typography><strong>Weight:</strong> {shipment.totalWeight.toLocaleString()} {shipment.weightUnit}</Typography>}
                    {shipment.pieceCount && <Typography><strong>Pieces:</strong> {shipment.pieceCount} {shipment.packageType || ''}</Typography>}
                    {shipment.isHazardous && <Typography color="error"><strong>Hazardous:</strong> Yes (UN: {shipment.unNumber || 'N/A'}, Class: {shipment.hazmatClass || 'N/A'})</Typography>}
                    {shipment.isTemperatureControlled && <Typography><strong>Temp Control:</strong> {shipment.temperatureMin}{shipment.tempUnit} - {shipment.temperatureMax}{shipment.tempUnit}</Typography>}
                </Paper>
                <Paper variant="outlined" sx={{p:2, mb:2}}>
                    <Typography variant="h6" gutterBottom>Financials</Typography>
                    <Typography><strong>Customer Rate:</strong> ${shipment.customerRate?.toLocaleString()}</Typography>
                    <Typography><strong>Carrier Cost:</strong> ${shipment.carrierCostTotal?.toLocaleString()}</Typography>
                    <Typography><strong>Gross Profit:</strong> ${shipment.grossProfit?.toLocaleString()}</Typography>
                    <Typography><strong>Margin:</strong> {shipment.margin?.toFixed(2)}%</Typography>
                </Paper>
                 <Paper variant="outlined" sx={{p:2, mb:2}}>
                    <Typography variant="h6" gutterBottom>Notes & Tags</Typography>
                    {shipment.internalNotes && <Box mb={1}><Typography variant="subtitle2">Internal Notes:</Typography><Typography variant="body2" sx={{whiteSpace: 'pre-wrap'}}>{shipment.internalNotes}</Typography></Box>}
                    {shipment.specialInstructions && <Box mb={1}><Typography variant="subtitle2">Special Instructions:</Typography><Typography variant="body2" sx={{whiteSpace: 'pre-wrap'}}>{shipment.specialInstructions}</Typography></Box>}
                    {shipment.customTags && shipment.customTags.length > 0 && <Box><Typography component="span"><strong>Tags: </strong></Typography>{shipment.customTags.map(t => <Chip key={t} label={t} size="small" sx={{mr:0.5, mb:0.5}}/>)}</Box>}
                </Paper>
            </Grid>
        </Grid>
        
        <Divider sx={{my:2}}><Chip label="Activity Log / Check-Ins"/></Divider>
        {shipment.checkIns && shipment.checkIns.length > 0 ? (
            <List dense sx={{width: '100%', bgcolor: 'background.paper', maxHeight: 300, overflow: 'auto' }}>
            {shipment.checkIns.slice().sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).map((ci, index) => (
                <ListItem key={ci._id || `ci-${index}`} divider alignItems="flex-start">
                    <ListItemIcon sx={{minWidth: 40, mt:0.5}}><CheckCircleIcon fontSize="small" color={ci.statusUpdate ? "primary" : "action"}/></ListItemIcon>
                    <ListItemText 
                        primaryTypographyProps={{variant: 'body2', fontWeight: 'medium'}}
                        primary={`${(ci.method || 'N/A').toUpperCase()} - ${formatDisplayDateTime(ci.dateTime)} by ${getDisplayName(ci.createdBy)}`}
                        secondary={
                            <React.Fragment>
                                {ci.currentLocation && <Typography component="span" variant="caption" display="block" color="text.secondary">Location: {ci.currentLocation}</Typography>}
                                {ci.contactPerson && <Typography component="span" variant="caption" display="block" color="text.secondary">Contacted: {ci.contactPerson}</Typography>}
                                <Typography component="span" variant="body2" sx={{display: 'block', whiteSpace: 'pre-wrap', mt:0.5}}>{ci.notes}</Typography>
                                {ci.statusUpdate && <Chip size="small" label={`Status → ${ci.statusUpdate.replace(/_/g,' ')}`} color={getStatusColor(ci.statusUpdate)} sx={{mt:0.5, textTransform:'capitalize'}}/>}
                            </React.Fragment>
                        }
                    />
                </ListItem>
            ))}
            </List>
        ) : <Typography sx={{mt:1, textAlign: 'center', color:'text.secondary'}}>No check-ins recorded.</Typography>}

        <Divider sx={{my:2}}><Chip label="Attached Documents"/></Divider>
        {shipment.documents && shipment.documents.length > 0 ? (
            <List dense>
                {shipment.documents.map(doc => (
                    <ListItem key={doc._id} secondaryAction={<Button size="small" href={documentAPI.download(doc._id)} target="_blank" rel="noopener noreferrer" variant="outlined">Download</Button>}>
                        <ListItemIcon><ArticleIcon /></ListItemIcon>
                        <ListItemText primary={doc.originalName} secondary={`${formatFileSize(doc.size)} - ${doc.mimetype} (Uploaded: ${formatDisplayDate(doc.createdAt)})`}/>
                    </ListItem>
                ))}
            </List>
        ) : <Typography sx={{mt:1, textAlign: 'center', color:'text.secondary'}}>No documents attached.</Typography>}
      </Paper>
    </Box>
  );
};

export default ShipmentDetailsView;