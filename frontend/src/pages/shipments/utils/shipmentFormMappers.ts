// File: frontend/src/pages/shipments/utils/shipmentFormMappers.ts
import { Shipment, QuoteFormData, ShipmentFormDataForDialog } from '../ShipmentsPage'; 
import mongoose from 'mongoose'; // Often useful for ObjectId types

// --- CENTRALIZED TYPE DEFINITIONS ---

export interface IStop {
  _id?: string;
  stopType: 'Pickup' | 'Dropoff' | 'Port' | 'Rail Ramp' | 'Other' | 'Load' | 'Consignee';
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  locationType?: 'Pickup' | 'Dropoff' | 'Port' | 'Rail Ramp' | 'Other' | 'Load' | 'Consignee';
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  scheduledDateTime?: string;
  actualDateTime?: string;
  appointmentNumber?: string;
  isLaneOrigin?: boolean;
  isLaneDestination?: boolean;
}

export interface IDocumentStubFE {
  _id: string;
  originalName: string;
  size?: number;
  mimetype?: string;
  s3Key?: string; // Changed from path for consistency
  createdAt?: string;
}

export interface QuoteAccessorialForm {
  _id?: string;
  accessorialTypeId: string;
  name?: string;
  quantity: number;
  customerRate: number;
  carrierCost: number;
  notes?: string;
}

export interface QuoteFormData {
  _id?: string;
  quoteNumber?: string;
  status: 'quote';
  shipper: string;
  carrier?: string;
  modeOfTransport: string;
  equipmentType: string;
  stops: IStop[];
  commodityDescription: string;
  totalWeight?: string;
  pieceCount?: string;
  customerRate: string;
  carrierCostTotal: string;
  accessorials: QuoteAccessorialForm[];
  quoteNotes?: string;
  quoteValidUntil?: string;
  purchaseOrderNumbers?: string;
  documentIds?: string[];
  attachedDocuments?: IDocumentStubFE[];
}

export interface ShipmentFormDataForDialog extends Omit<QuoteFormData, 'status' | 'quoteNotes' | 'quoteValidUntil'> {
  status: string; // Not just 'quote'
  billOfLadingNumber?: string;
  proNumber?: string;
  deliveryOrderNumber?: string;
  bookingNumber?: string;
  containerNumber?: string;
  sealNumber?: string;
  pickupNumber?: string;
  proofOfDeliveryNumber?: string;
  otherReferenceNumbersString?: string;
  equipmentLength?: string;
  equipmentUnit?: 'ft' | 'm';
  packageType?: string;
  weightUnit?: 'lbs' | 'kg';
  isHazardous?: boolean;
  unNumber?: string;
  hazmatClass?: string;
  isTemperatureControlled?: boolean;
  temperatureMin?: string;
  temperatureMax?: string;
  tempUnit?: 'C' | 'F';
  fscType?: 'fixed' | 'percentage' | '';
  fscCustomerAmount?: string;
  fscCarrierAmount?: string;
  chassisCustomerCost?: string;
  chassisCarrierCost?: string;
  internalNotes?: string;
  specialInstructions?: string;
  customTags?: string;
  scheduledPickupDate?: string;
  scheduledDeliveryDate?: string;
  // Deprecated flat fields are removed from the type definition
  eta?: string;
  pulledDate?: string;
  ingatedDate?: string;
  erdCutoffDate?: string;
}

// Helper functions
export const formatDateForInput = (dateString?: string | Date): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Check if the date is valid before trying to format it
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

export const formatDateTimeForInput = (dateTimeString?: string | Date): string => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().substring(0, 16);
};

// Initial States
export const initialShipmentFormData: ShipmentFormDataForDialog = {
  _id: undefined,
  shipmentNumber: '',
  shipper: '',
  carrier: '',
  modeOfTransport: 'truckload-ftl',
  status: 'booked',
  stops: [
    { stopType: 'Pickup', locationType: 'Pickup', isLaneOrigin: true, scheduledDateTime: '' },
    { stopType: 'Dropoff', locationType: 'Dropoff', isLaneDestination: true, scheduledDateTime: '' },
  ],
  // ... all other non-deprecated fields initialized to empty/default values
  billOfLadingNumber: '', proNumber: '', deliveryOrderNumber: '', bookingNumber: '',
  containerNumber: '', sealNumber: '', pickupNumber: '', proofOfDeliveryNumber: '',
  purchaseOrderNumbers: '', otherReferenceNumbersString: '',
  equipmentType: '', equipmentLength: '', equipmentUnit: 'ft',
  commodityDescription: '', pieceCount: '', packageType: '', totalWeight: '', weightUnit: 'lbs',
  isHazardous: false, unNumber: '', hazmatClass: '', isTemperatureControlled: false, 
  temperatureMin: '', temperatureMax: '', tempUnit: 'C',
  customerRate: '', carrierCostTotal: '',
  fscType: '', fscCustomerAmount: '', fscCarrierAmount: '',
  chassisCustomerCost: '', chassisCarrierCost: '',
  accessorials: [],
  internalNotes: '', specialInstructions: '', customTags: '',
  documentIds: [], attachedDocuments: [],
  eta: '', pulledDate: '', ingatedDate: '', erdCutoffDate: '',
};

export const initialQuoteFormData: QuoteFormData = {
  status: 'quote', shipper: '', carrier: '', modeOfTransport: 'truckload-ftl', equipmentType: '',
  stops: [
    { stopType: 'Pickup', locationType: 'Pickup', city: '', state: '', zip: '', isLaneOrigin: true },
    { stopType: 'Dropoff', locationType: 'Dropoff', city: '', state: '', zip: '', isLaneDestination: true },
  ],
  commodityDescription: '', totalWeight: '', pieceCount: '',
  customerRate: '0', carrierCostTotal: '0',
  accessorials: [],
  quoteNotes: '', quoteValidUntil: '', purchaseOrderNumbers: '',
  documentIds: [], attachedDocuments: [],
};

// Mapping Functions
export const mapShipmentToShipmentFormData = (shipment: Shipment): ShipmentFormDataForDialog => {
    console.log("[MAPPER] Raw shipment object received:", JSON.parse(JSON.stringify(shipment)));

    // Create a new object from our clean initial state
    const mappedData: ShipmentFormDataForDialog = { ...initialShipmentFormData };

    // Explicitly map ONLY the fields we trust from the incoming shipment object
    mappedData._id = shipment._id;
    mappedData.shipmentNumber = shipment.shipmentNumber;
    mappedData.status = shipment.status;
    mappedData.shipper = typeof shipment.shipper === 'object' ? shipment.shipper?._id ?? '' : shipment.shipper ?? '';
    mappedData.carrier = typeof shipment.carrier === 'object' ? shipment.carrier?._id ?? '' : shipment.carrier ?? '';
    mappedData.modeOfTransport = shipment.modeOfTransport;
    mappedData.equipmentType = shipment.equipmentType;
    
    // Map the stops array correctly
    if (Array.isArray(shipment.stops) && shipment.stops.length > 0) {
        mappedData.stops = shipment.stops.map((stop: any) => ({
            ...stop,
            scheduledDateTime: formatDateTimeForInput(stop.scheduledDateTime),
            actualDateTime: formatDateTimeForInput(stop.actualDateTime),
        }));
    }

    // Map other relevant fields
    mappedData.billOfLadingNumber = shipment.billOfLadingNumber;
    mappedData.proNumber = shipment.proNumber;
    // ... map all other fields you want to preserve from the DB object
    mappedData.commodityDescription = shipment.commodityDescription;
    mappedData.customerRate = String(shipment.customerRate || '');
    mappedData.carrierCostTotal = String(shipment.carrierCostTotal || '');
    mappedData.internalNotes = shipment.internalNotes;
    mappedData.specialInstructions = shipment.specialInstructions;
    mappedData.fscType = shipment.fscType;
    mappedData.fscCustomerAmount = String(shipment.fscCustomerAmount || '');
    mappedData.fscCarrierAmount = String(shipment.fscCarrierAmount || '');
    mappedData.accessorials = shipment.accessorials;
    
    // Map the key dates that exist on the top level
    mappedData.eta = formatDateForInput(shipment.eta);
    mappedData.pulledDate = formatDateForInput(shipment.pulledDate);
    mappedData.ingatedDate = formatDateForInput(shipment.ingatedDate);
    mappedData.erdCutoffDate = formatDateForInput(shipment.erdCutoffDate);
    
    // Map documents
    mappedData.documentIds = shipment.documents?.map(doc => typeof doc === 'string' ? doc : doc._id) ?? [];
    mappedData.attachedDocuments = shipment.documents?.filter(doc => typeof doc !== 'string') ?? [];

    console.log("[MAPPER] Cleaned & Mapped form data object returned:", JSON.parse(JSON.stringify(mappedData)));
    
    return mappedData;
};

export const mapShipmentToQuoteFormData = (shipment: Shipment): QuoteFormData => {
    const mappedData = mapShipmentToShipmentFormData(shipment);
    return {
        ...mappedData,
        status: 'quote',
        accessorials: shipment.accessorials?.map((acc: any) => ({
            _id: acc._id?.toString(),
            accessorialTypeId: typeof acc.accessorialTypeId === 'object' ? acc.accessorialTypeId._id : acc.accessorialTypeId,
            name: acc.name || (typeof acc.accessorialTypeId === 'object' ? acc.accessorialTypeId.name : ''),
            quantity: acc.quantity || 1,
            customerRate: acc.customerRate || 0,
            carrierCost: acc.carrierCost || 0,
            notes: acc.notes || ''
        })) ?? [],
    };
};