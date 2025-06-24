// File: frontend/src/pages/shipments/constants/shipmentOptions.ts

// Re-using type definitions, ideally import from a central types file
type ModeOfTransportType = | 'truckload-ftl' | 'truckload-ltl' | 'drayage-import' | 'drayage-export' | 'intermodal-rail' | 'ocean-fcl' | 'ocean-lcl' | 'air-freight' | 'expedited-ground' | 'final-mile' | 'other';
type StatusType = | 'quote' | 'booked' | 'dispatched' | 'at_pickup' | 'picked_up' | 'in_transit_origin_drayage' | 'at_origin_port_ramp' | 'in_transit_main_leg' | 'at_destination_port_ramp' | 'in_transit_destination_drayage' | 'at_delivery' | 'delivered' | 'pod_received' | 'invoiced' | 'paid' | 'cancelled' | 'on_hold' | 'problem' | string;
type LocationType = 'shipper_facility' | 'consignee_facility' | 'port_terminal' | 'rail_ramp' | 'airport_cargo' | 'warehouse' | 'other' | string;
type WeightUnitType = 'lbs' | 'kg' | string;
type EquipmentUnitType = 'ft' | 'm' | string;
type TempUnitType = 'C' | 'F' | string;
interface CheckInFormDataForOptions { // Slightly different from full CheckInFormData if it only needs method
    method: 'phone' | 'email' | 'text' | 'api' | 'portal' | 'edi' | string;
}


export const modeOfTransportOptions: ModeOfTransportType[] = [ 
    'truckload-ftl', 'truckload-ltl', 'drayage-import', 'drayage-export', 'intermodal-rail',
    'ocean-fcl', 'ocean-lcl', 'air-freight', 'expedited-ground', 'final-mile', 'other' 
];

//export const statusOptions: StatusType[] = [ 
//    'quote', 'booked', 'dispatched', 'at_pickup', 'picked_up', 'in_transit_origin_drayage', 
//    'at_origin_port_ramp', 'in_transit_main_leg', 'at_destination_port_ramp', 
//    'in_transit_destination_drayage', 'at_delivery', 'delivered', 'pod_received', 
//    'invoiced', 'paid', 'cancelled', 'on_hold', 'problem' 
//];

export const locationTypeOptions = [
  'Pickup',
  'Load',
  'Port',
  'Rail Ramp',
  'Dropoff', // Ensure 'Dropoff' is here
  'Consignee',
];

export const weightUnitOptions: WeightUnitType[] = ['lbs', 'kg'];
export const equipmentUnitOptions: EquipmentUnitType[] = ['ft', 'm'];
export const tempUnitOptions: TempUnitType[] = ['C', 'F'];
export const checkinMethodOptions: CheckInFormDataForOptions['method'][] = ['email', 'phone', 'text', 'api', 'portal', 'edi'];

export const quoteStatusOptions: readonly string[] = [
    'quote', // The initial state
    'quote_sent',
    'waiting',
    'approved', // The final state before becoming a shipment
    'rejected',
    'expired',
];

export const shipmentStatusOptions: readonly string[] = [
    'booked', 'dispatched', 'at_pickup', 'picked_up',
    'in_transit', 'at_delivery',
    'delivered', 'pod_received', 'invoiced', 'paid', 'cancelled', 'on_hold', 'problem'
];