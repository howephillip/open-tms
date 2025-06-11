// File: frontend/src/pages/shipments/utils/shipmentFormMappers.ts
import { Shipment, QuoteFormData, ShipmentFormDataForDialog } from '../ShipmentsPage'; // Adjust path if types are moved

export interface IStop {
  _id?: string;
  stopType: 'Pickup' | 'Dropoff' | 'Port' | 'Rail Ramp' | 'Other';
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  locationType?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  scheduledDateTime?: string; // Stored as string for datetime-local input
  appointmentNumber?: string;
}

// Helper functions for date formatting
export const formatDateForInput = (dateString?: string | Date): string => { 
    if (!dateString) return ''; 
    try { const date = new Date(dateString); return date.toISOString().split('T')[0]; } catch (e) { return ''; }
};
export const formatDateTimeForInput = (dateTimeString?: string | Date): string => { 
    if (!dateTimeString) return ''; 
    try { const date = new Date(dateTimeString); return date.toISOString().substring(0, 16);} catch (e) {return '';}
};

// --- UPDATED: initialShipmentFormData now uses a 'stops' array ---
export const initialShipmentFormData: ShipmentFormDataForDialog = { 
  _id: undefined, shipmentNumber: '', shipper: '', carrier: '',
  modeOfTransport: 'truckload-ftl', 
  status: 'booked',
  stops: [ // Default to one pickup and one dropoff
    { stopType: 'Pickup', city: '', state: '', zip: '' },
    { stopType: 'Dropoff', city: '', state: '', zip: '' },
  ],
  // All other fields remain
  billOfLadingNumber: '', proNumber: '', deliveryOrderNumber: '', bookingNumber: '',
  containerNumber: '', sealNumber: '', pickupNumber: '', proofOfDeliveryNumber: '',
  purchaseOrderNumbers: '', otherReferenceNumbersString: '',
  equipmentType: '', equipmentLength: '', equipmentUnit: 'ft',
  commodityDescription: '', pieceCount: '', packageType: '', totalWeight: '', weightUnit: 'lbs',
  isHazardous: false, unNumber: '', hazmatClass: '', isTemperatureControlled: false, 
  temperatureMin: '', temperatureMax: '', tempUnit: 'C',
  customerRate: '', carrierCostTotal: '', internalNotes: '', specialInstructions: '', customTags: '',
  documentIds: [], attachedDocuments: [],
  // Deprecated flat fields are gone
};

// --- UPDATED: initialQuoteFormData now uses a 'stops' array ---
export const initialQuoteFormData: QuoteFormData = {
  status: 'quote', shipper: '', carrier: '', modeOfTransport: 'truckload-ftl', equipmentType: '',
  stops: [
    { stopType: 'Pickup', city: '', state: '', zip: '' },
    { stopType: 'Dropoff', city: '', state: '', zip: '' },
  ],
  commodityDescription: '', totalWeight: '', pieceCount: '',
  customerRate: '0', carrierCostTotal: '0',
  accessorials: [],
  quoteNotes: '', quoteValidUntil: '', purchaseOrderNumbers: '',
  documentIds: [], attachedDocuments: [],
};


// --- UPDATED: mapShipmentToShipmentFormData now maps to 'stops' array ---
export const mapShipmentToShipmentFormData = (shipment: Shipment): ShipmentFormDataForDialog => {
    return {
        _id: shipment._id,
        // Map all top-level fields from shipment to the form data
        ...shipment,
        shipper: typeof shipment.shipper === 'object' ? shipment.shipper?._id || '' : shipment.shipper || '',
        carrier: typeof shipment.carrier === 'object' ? shipment.carrier?._id || '' : shipment.carrier || '',
        
        // Map the stops array, formatting dates correctly
        stops: shipment.stops && shipment.stops.length > 0 
            ? shipment.stops.map((stop: any) => ({
                ...stop,
                scheduledDateTime: formatDateTimeForInput(stop.scheduledDateTime),
                actualDateTime: formatDateTimeForInput(stop.actualDateTime),
            })) 
            : initialShipmentFormData.stops,

        // Handle arrays of strings and objects
        purchaseOrderNumbers: shipment.purchaseOrderNumbers?.join(', ') || '',
        otherReferenceNumbersString: shipment.otherReferenceNumbers?.map(ref => `${ref.type}:${ref.value}`).join(', ') || '',
        customTags: shipment.customTags?.join(', ') || '',

        // Handle dates
        quoteValidUntil: formatDateForInput(shipment.quoteValidUntil),
        
        // Handle documents
        documentIds: shipment.documents?.map(doc => typeof doc === 'string' ? doc : doc._id) || [],
        attachedDocuments: shipment.documents?.filter(doc => typeof doc !== 'string') || []
    };
};

// --- UPDATED: mapShipmentToQuoteFormData now maps to 'stops' array ---
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
        })) || [],
    };
};