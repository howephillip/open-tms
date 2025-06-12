import React from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useQuery } from 'react-query';
import { shipmentAPI, documentAPI } from '../../services/api';
import { 
    Box, Typography, CircularProgress, Alert, Paper, Grid, Button, 
    Divider, Chip, Link, List, ListItem, ListItemText, ListItemIcon 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ArticleIcon from '@mui/icons-material/Article';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// --- Interfaces ---
// These interfaces describe the shape of the data returned by the API
interface ContactStub { name?: string; phone?: string; email?: string; }
interface UserStub { _id: string; firstName?: string; lastName?: string; email?: string; }
interface ShipperStub { _id: string; name: string; contact?: ContactStub; }
interface CarrierStub { _id: string; name: string; mcNumber?: string; dotNumber?: string; contact?: ContactStub; }
interface IReferenceNumberFE { type: string; value: string; _id?: string; }
type ModeOfTransportType = string; type StatusType = string; type LocationType = string;
interface CheckIn { dateTime: string | Date; method: string; notes: string; contactPerson?: string; currentLocation?: string; statusUpdate?: StatusType; createdBy?: UserStub | string; _id?: string;}
interface IDocumentStub { _id: string; originalName: string; mimetype: string; size: number; createdAt: string; path: string;}
interface IQuoteAccessorialFE {
    accessorialTypeId: { _id: string; name?: string; };
    name?: string;
    customerRate: number;
    carrierCost: number;
    quantity?: number;
    notes?: string;
}

interface Shipment {
  _id: string;
  shipmentNumber: string;
  shipper: ShipperStub | string | null;
  carrier: CarrierStub | string | null;
  modeOfTransport: ModeOfTransportType;
  billOfLadingNumber?: string;
  proNumber?: string;
  deliveryOrderNumber?: string;
  bookingNumber?: string;
  containerNumber?: string;
  sealNumber?: string;
  pickupNumber?: string;
  proofOfDeliveryNumber?: string;
  purchaseOrderNumbers?: string[];
  otherReferenceNumbers?: IReferenceNumberFE[];
  steamshipLine?: string;
  vesselName?: string;
  voyageNumber?: string;
  terminal?: string;
  lastFreeDayPort?: string;
  lastFreeDayRail?: string;
  emptyReturnDepot?: string;
  emptyContainerReturnByDate?: string;
  chassisNumber?: string;
  chassisType?: string;
  chassisProvider?: string;
  chassisReturnByDate?: string;
  railOriginRamp?: string;
  railDestinationRamp?: string;
  railCarrier?: string;
  airline?: string;
  flightNumber?: string;
  masterAirWaybill?: string;
  houseAirWaybill?: string;
  airportOfDeparture?: string;
  airportOfArrival?: string;
  isTransload?: boolean;
  transloadFacility?: { name?: string; address?: string; city?: string; state?: string; zip?: string; };
  transloadDate?: string;
  origin: { name?: string; address: string; city: string; state: string; zip: string; country?: string; locationType?: LocationType; contactName?: string; contactPhone?: string; contactEmail?: string; notes?: string; };
  destination: { name?: string; address: string; city: string; state: string; zip: string; country?: string; locationType?: LocationType; contactName?: string; contactPhone?: string; contactEmail?: string; notes?: string; };
  scheduledPickupDate: string;
  scheduledPickupTime?: string;
  pickupAppointmentNumber?: string;
  actualPickupDateTime?: string;
  scheduledDeliveryDate: string;
  scheduledDeliveryTime?: string;
  deliveryAppointmentNumber?: string;
  actualDeliveryDateTime?: string;
  status: StatusType;
  equipmentType: string;
  equipmentLength?: number;
  equipmentUnit?: 'ft' | 'm';
  commodityDescription: string;
  pieceCount?: number;
  packageType?: string;
  totalWeight?: number;
  weightUnit?: 'lbs' | 'kg';
  isHazardous?: boolean;
  unNumber?: string;
  hazmatClass?: string;
  isTemperatureControlled?: boolean;
  temperatureMin?: number;
  temperatureMax?: number;
  tempUnit?: 'C' | 'F';
  customerRate: number;
  carrierCostTotal: number;
  fscType?: 'fixed' | 'percentage';
  fscCustomerAmount?: number;
  fscCarrierAmount?: number;
  chassisCustomerCost?: number;
  chassisCarrierCost?: number;
  grossProfit?: number;
  margin?: number;
  totalCustomerRate?: number;
  totalCarrierCost?: number;
  internalNotes?: string;
  specialInstructions?: string;
  customTags?: string[];
  checkIns?: CheckIn[];
  documents?: IDocumentStub[];
  createdBy?: UserStub | string;
  updatedAt?: string;
  createdAt?: string;
  accessorials?: IQuoteAccessorialFE[];
  consignee?: { name?: string; };
  billTo?: ShipperStub | CarrierStub | string | null;
  quoteNotes?: string;
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

  const getDisplayName = (entity: any): string => {
    if (!entity) return 'N/A';
    if (typeof entity === 'string') return `ID: ${entity.substring(0,8)}...`;
    if (entity.firstName && entity.lastName) return `${entity.firstName} ${entity.lastName}`;
    if (entity.name) return entity.name;
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

  const renderLocation = (loc: any, type: 'Origin' | 'Destination') => {
    if (!loc || (!loc.city && !loc.address)) return null;
    return (
        <Box mb={1}>
          <Typography variant="subtitle1" gutterBottom sx={{display: 'flex', alignItems: 'center'}}><LocationOnIcon sx={{mr:0.5, fontSize:'1rem'}} color="action"/>{type}: {loc.name || `${loc.city}, ${loc.state}`}</Typography>
          <Typography variant="body2" color="textSecondary" pl={3}>{loc.address}, {loc.city}, {loc.state} {loc.zip}</Typography>
        </Box>
    );
  };

  // --- Render Stops helper ---
  const renderStops = () => {
    if (shipment.stops && shipment.stops.length > 0) {
      return shipment.stops.map((stop: any, idx: number) => {
        const label =
          idx === 0 ? 'Origin' :
          idx === shipment.stops.length - 1 ? 'Destination' :
          `Stop ${idx + 1}`;
        return (
          <Box key={stop._id || idx} mb={1}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <LocationOnIcon sx={{ mr: 0.5, fontSize: '1rem' }} color="action" />
              {label}: {stop.city}, {stop.state}
            </Typography>
          </Box>
        );
      });
    }
    return (
      <>
        {renderLocation(shipment.origin, 'Origin')}
        <Divider sx={{ my: 1 }} />
        {renderLocation(shipment.destination, 'Destination')}
      </>
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
                Edit
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
                    </Grid>
                </Paper>
                <Paper variant="outlined" sx={{p:2, mb:2}}>
                    <Typography variant="h6" gutterBottom>Route & Timing</Typography>
                    {renderStops()}
                </Paper>
            </Grid>

            {/* Right Column */}
            <Grid item xs={12} md={5}>
                <Paper variant="outlined" sx={{p:2, mb:2}}>
                    <Typography variant="h6" gutterBottom>Freight & Equipment</Typography>
                    <Typography><strong>Equipment:</strong> {shipment.equipmentType}</Typography>
                    <Typography><strong>Commodity:</strong> {shipment.commodityDescription}</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Financials</Typography>
                    <Grid container spacing={0.5}>
                        <Grid item xs={6}><Typography><strong>Total Quoted Rate:</strong></Typography></Grid>
                        <Grid item xs={6} sx={{ textAlign: 'right' }}><Typography><strong>${(shipment.totalCustomerRate ?? shipment.customerRate)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography></Grid>
                        <Grid item xs={6}><Typography color="text.secondary" pl={2}>↳ Line Haul:</Typography></Grid>
                        <Grid item xs={6} sx={{ textAlign: 'right' }}><Typography color="text.secondary">${shipment.customerRate?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Grid>
                        {shipment.chassisCustomerCost > 0 && (<><Grid item xs={6}><Typography color="text.secondary" pl={2}>↳ Chassis:</Typography></Grid><Grid item xs={6} sx={{ textAlign: 'right' }}><Typography color="text.secondary">${shipment.chassisCustomerCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Grid></>)}
                        {shipment.fscCustomerAmount > 0 && (<><Grid item xs={6}><Typography color="text.secondary" pl={2}>↳ FSC ({shipment.fscType === 'percentage' ? `${shipment.fscCustomerAmount}%` : 'Fixed'}):</Typography></Grid><Grid item xs={6} sx={{ textAlign: 'right' }}><Typography color="text.secondary">${((shipment.fscType === 'percentage' ? shipment.customerRate * (shipment.fscCustomerAmount/100) : shipment.fscCustomerAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Grid></>)}
                        {shipment.accessorials?.filter((a: any) => a.customerRate > 0).map((acc: any, index: number) => (<React.Fragment key={`cust-acc-${index}`}><Grid item xs={6}><Typography color="text.secondary" pl={2}>↳ {(acc.accessorialTypeId as any)?.name || acc.name || 'Accessorial'}:</Typography></Grid><Grid item xs={6} sx={{ textAlign: 'right' }}><Typography color="text.secondary">${(acc.customerRate * (acc.quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Grid></React.Fragment>))}
                        <Grid item xs={12}><Divider sx={{ my: 1 }} light/></Grid>
                        <Grid item xs={6}><Typography><strong>Total Carrier Cost:</strong></Typography></Grid>
                        <Grid item xs={6} sx={{ textAlign: 'right' }}><Typography><strong>${(shipment.totalCarrierCost ?? shipment.carrierCostTotal)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography></Grid>
                        <Grid item xs={12}><Divider sx={{ my: 1 }} light/></Grid>
                        <Grid item xs={6}><Typography><strong>Gross Profit:</strong></Typography></Grid>
                        <Grid item xs={6} sx={{ textAlign: 'right' }}><Typography color={shipment.grossProfit < 0 ? 'error' : 'success.main'}><strong>${shipment.grossProfit?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></Typography></Grid>
                        <Grid item xs={6}><Typography><strong>Margin:</strong></Typography></Grid>
                        <Grid item xs={6} sx={{ textAlign: 'right' }}><Typography color={shipment.margin < 0 ? 'error' : 'success.main'}><strong>{shipment.margin?.toFixed(2)}%</strong></Typography></Grid>
                    </Grid>
                </Paper>
                <Paper variant="outlined" sx={{p:2, mb:2}}>
                    <Typography variant="h6" gutterBottom>Notes & Tags</Typography>
                    {shipment.quoteNotes &&
                        <Box mb={1}>
                            <Typography variant="subtitle2">Quote Notes:</Typography>
                            <Typography variant="body2" sx={{whiteSpace: 'pre-wrap'}}>{shipment.quoteNotes}</Typography>
                        </Box>
                    }
                    {shipment.internalNotes && 
                        <Box mb={1}><Typography variant="subtitle2">Internal Notes:</Typography><Typography variant="body2" sx={{whiteSpace: 'pre-wrap'}}>{shipment.internalNotes}</Typography></Box>
                    }
                    {shipment.customTags?.length > 0 && <Box><Typography component="span"><strong>Tags: </strong></Typography>{shipment.customTags.map((t: string) => <Chip key={t} label={t} size="small" sx={{mr:0.5, mb:0.5}}/>)}</Box>}
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
                {shipment.documents.map((doc: IDocumentStub) => (
                    <ListItem 
                        key={doc._id} 
                        secondaryAction={
                            <Button size="small" href={documentAPI.download(doc._id)} target="_blank" rel="noopener noreferrer" variant="outlined">
                                Download
                            </Button>
                        }
                    >
                        <ListItemIcon><ArticleIcon /></ListItemIcon>
                        <ListItemText 
                            primary={doc.originalName} 
                            secondary={`${formatFileSize(doc.size)} - ${doc.mimetype} (Uploaded: ${formatDisplayDate(doc.createdAt)})`}
                        />
                    </ListItem>
                ))}
            </List>
        ) : (
            <Typography sx={{mt:1, textAlign: 'center', color:'text.secondary'}}>
                No documents attached.
            </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default ShipmentDetailsView;