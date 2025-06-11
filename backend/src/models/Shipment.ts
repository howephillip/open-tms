// File: backend/src/models/Shipment.ts
import mongoose, { Schema, Document } from 'mongoose';
import { nanoid as generateNanoid, customAlphabet } from 'nanoid'; // Correct import for nanoid v3
import { logger } from '../utils/logger';
import { ApplicationSettings, IQuoteFormSettings } from './ApplicationSettings'; // Ensure this exists and exports correctly

const nanoidTms = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

export interface IStop {
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
  appointmentRequired?: boolean;
  scheduledDateTime?: Date;
  actualDateTime?: Date;
  appointmentNumber?: string;
  isLaneOrigin?: boolean;
  isLaneDestination?: boolean;
}

const stopSchema = new Schema<IStop>({
  stopType: { type: String, enum: ['Pickup', 'Dropoff', 'Port', 'Rail Ramp', 'Other'], required: true },
  name: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  zip: { type: String, trim: true },
  country: { type: String, trim: true, default: 'USA' },
  locationType: { type: String, enum: ['shipper_facility', 'port_terminal', 'rail_ramp', 'airport_cargo', 'warehouse', 'consignee_facility', 'other'], trim: true },
  contactName: { type: String, trim: true },
  contactPhone: { type: String, trim: true },
  contactEmail: { type: String, trim: true, lowercase: true },
  notes: { type: String, trim: true },
  appointmentRequired: { type: Boolean, default: false },
  scheduledDateTime: { type: Date },
  actualDateTime: { type: Date },
  appointmentNumber: { type: String, trim: true },
  isLaneOrigin: { type: Boolean, default: false },
  isLaneDestination: { type: Boolean, default: false },
}, { _id: true }); // Use _id for array keying on the frontend


export type ModeOfTransportType = // EXPORTED
    | 'truckload-ftl' | 'truckload-ltl'
    | 'drayage-import' | 'drayage-export'
    | 'final-mile' | 'other';

export type ShipmentStatusType = // EXPORTED
    | 'quote' | 'booked' | 'dispatched' | 'at_pickup' | 'picked_up'
    | 'in_transit_origin_drayage' | 'at_origin_port_ramp' | 'in_transit_main_leg'
    | 'at_destination_port_ramp' | 'in_transit_destination_drayage' | 'at_delivery'
    | 'delivered' | 'pod_received' | 'invoiced' | 'paid' | 'cancelled' | 'on_hold' | 'problem';

export interface IReferenceNumber { // EXPORTED
  type: string;
  value: string;
  _id?: mongoose.Types.ObjectId;
}
const referenceNumberSchema = new Schema<IReferenceNumber>({
  type: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true }
}, { _id: true });

export interface IQuoteAccessorial { // EXPORTED
  accessorialTypeId: mongoose.Types.ObjectId;
  name?: string;
  quantity?: number;
  customerRate: number;
  carrierCost: number;
  notes?: string;
  _id?: mongoose.Types.ObjectId;
}
const quoteAccessorialSchema = new Schema<IQuoteAccessorial>({
  accessorialTypeId: { type: Schema.Types.ObjectId, ref: 'AccessorialType', required: true },
  name: { type: String, trim: true },
  quantity: { type: Number, default: 1 },
  customerRate: { type: Number, required: true, default: 0 },
  carrierCost: { type: Number, required: true, default: 0 },
  notes: { type: String, trim: true },
}, { _id: true });

export interface IShipment extends Document { // EXPORTED
  shipmentNumber: string;
  billOfLadingNumber?: string;
  proNumber?: string;
  deliveryOrderNumber?: string;
  bookingNumber?: string;
  containerNumber?: string;
  sealNumber?: string;
  pickupNumber?: string;
  proofOfDeliveryNumber?: string;
  purchaseOrderNumbers?: string[];
  otherReferenceNumbers?: IReferenceNumber[];
  fscType?: 'fixed' | 'percentage' | '';
  fscCustomerAmount?: number;
  fscCarrierAmount?: number;
  chassisCustomerCost?: number;
  chassisCarrierCost?: number;
  accessorials?: IQuoteAccessorial[];
  quoteNotes?: string;
  quoteValidUntil?: Date;
  quotedBy?: mongoose.Types.ObjectId;
  shipper: mongoose.Types.ObjectId;
  carrier?: mongoose.Types.ObjectId;
  consignee?: { name?: string; address?: string; contactName?: string; contactPhone?: string; contactEmail?: string; };
  billTo?: mongoose.Types.ObjectId;
  modeOfTransport: ModeOfTransportType;
  steamshipLine?: string;
  vesselName?: string;
  voyageNumber?: string;
  terminal?: string;
  lastFreeDayPort?: Date;
  lastFreeDayRail?: Date;
  emptyReturnDepot?: string;
  emptyContainerReturnByDate?: Date;
  chassisNumber?: string;
  chassisType?: string;
  chassisProvider?: string;
  chassisReturnByDate?: Date;
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
  transloadDate?: Date;
  stops: IStop[];
  //origin: { name?: string; address?: string; city?: string; state?: string; zip?: string; country?: string; locationType?: string; contactName?: string; contactPhone?: string; contactEmail?: string; notes?: string; };
  //destination: { name?: string; address?: string; city?: string; state?: string; zip?: string; country?: string; locationType?: string; contactName?: string; contactPhone?: string; contactEmail?: string; notes?: string; };
  scheduledPickupDate?: Date;
  scheduledDeliveryDate?: Date;
  scheduledPickupTime?: string;
  pickupAppointmentNumber?: string;
  actualPickupDateTime?: Date;
  scheduledDeliveryTime?: string;
  deliveryAppointmentNumber?: string;
  actualDeliveryDateTime?: Date;
  status: ShipmentStatusType;
  equipmentType?: string;
  equipmentLength?: number;
  equipmentUnit?: 'ft' | 'm';
  commodityDescription?: string;
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
  grossProfit?: number;
  margin?: number;
  totalCustomerRate?: number;
  totalCarrierCost?: number;
  internalNotes?: string;
  specialInstructions?: string;
  customTags?: string[];
  checkIns?: [{
    dateTime: Date; method: string; contactPerson?: string; currentLocation?: string;
    notes: string; statusUpdate?: IShipment['status']; createdBy: mongoose.Types.ObjectId;
    _id?: mongoose.Types.ObjectId;
  }];
  documents?: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const locationSchema = new Schema({
    name: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
    country: { type: String, trim: true, default: 'USA' },
    locationType: { type: String, enum: ['shipper_facility', 'port_terminal', 'rail_ramp', 'airport_cargo', 'warehouse', 'consignee_facility', 'other'], trim: true },
    contactName: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    notes: { type: String, trim: true },
}, { _id: false });

const modeOfTransportEnumValues: ModeOfTransportType[] = [
    'truckload-ftl', 'truckload-ltl', 'drayage-import', 'drayage-export',
    'final-mile', 'other'
];

const statusEnumValues: ShipmentStatusType[] = [
    'quote', 'quote_sent', 'negotiating', 'awaiting_approval', 'approved', 'rejected', 'expired',
    'booked', 'dispatched', 'at_pickup', 'picked_up',
    'in_transit_origin_drayage', 'at_origin_port_ramp', 'in_transit_main_leg',
    'at_destination_port_ramp', 'in_transit_destination_drayage', 'at_delivery',
    'delivered', 'pod_received', 'invoiced', 'paid', 'cancelled', 'on_hold', 'problem'
];

const shipmentSchema = new Schema<IShipment>({
  shipmentNumber: { type: String, unique: true, trim: true, index: true },
  billOfLadingNumber: { type: String, trim: true, sparse: true, index: true },
  proNumber: { type: String, trim: true, sparse: true, index: true },
  deliveryOrderNumber: { type: String, trim: true, sparse: true, index: true },
  bookingNumber: { type: String, trim: true, sparse: true, index: true },
  containerNumber: { type: String, trim: true, sparse: true, index: true },
  sealNumber: { type: String, trim: true },
  pickupNumber: { type: String, trim: true },
  proofOfDeliveryNumber: { type: String, trim: true },
  purchaseOrderNumbers: [{ type: String, trim: true }],
  otherReferenceNumbers: [referenceNumberSchema],
  fscType: { type: String, enum: ['fixed', 'percentage', ''], trim: true },
  fscCustomerAmount: { type: Number },
  fscCarrierAmount: { type: Number },
  chassisCustomerCost: { type: Number },
  chassisCarrierCost: { type: Number },
  accessorials: [quoteAccessorialSchema],
  quoteNotes: { type: String, trim: true },
  quoteValidUntil: { type: Date },
  quotedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  shipper: { type: Schema.Types.ObjectId, ref: 'Shipper', required: false, index: true },
  carrier: { type: Schema.Types.ObjectId, ref: 'Carrier', required: false, index: true },
  consignee: { name: String, address: String, contactName: String, contactPhone: String, contactEmail: String },
  billTo: { type: Schema.Types.ObjectId, ref: 'Customer' },
  modeOfTransport: { type: String, enum: modeOfTransportEnumValues, required: false, index: true },
  steamshipLine: { type: String, trim: true },
  vesselName: { type: String, trim: true },
  voyageNumber: { type: String, trim: true },
  terminal: { type: String, trim: true },
  lastFreeDayPort: { type: Date },
  lastFreeDayRail: { type: Date },
  emptyReturnDepot: { type: String, trim: true },
  emptyContainerReturnByDate: { type: Date },
  chassisNumber: { type: String, trim: true },
  chassisType: { type: String, trim: true },
  chassisProvider: { type: String, trim: true },
  chassisReturnByDate: { type: Date },
  railOriginRamp: { type: String, trim: true },
  railDestinationRamp: { type: String, trim: true },
  railCarrier: { type: String, trim: true },
  airline: { type: String, trim: true },
  flightNumber: { type: String, trim: true },
  masterAirWaybill: { type: String, trim: true },
  houseAirWaybill: { type: String, trim: true },
  airportOfDeparture: { type: String, trim: true },
  airportOfArrival: { type: String, trim: true },
  isTransload: { type: Boolean, default: false },
  transloadFacility: { name: String, address: String, city: String, state: String, zip: String },
  transloadDate: Date,
  stops: { type: [stopSchema], default: [] },
  //origin: { type: locationSchema, required: false },
  //destination: { type: locationSchema, required: false },
  scheduledPickupDate: { type: Date, index: true },
  scheduledDeliveryDate: { type: Date, index: true },
  scheduledPickupTime: { type: String, trim: true },
  pickupAppointmentNumber: { type: String, trim: true },
  actualPickupDateTime: { type: Date },
  scheduledDeliveryTime: { type: String, trim: true },
  deliveryAppointmentNumber: { type: String, trim: true },
  actualDeliveryDateTime: { type: Date },
  status: { type: String, enum: statusEnumValues, default: 'booked', required: false, index: true },
  equipmentType: { type: String, trim: true },
  equipmentLength: { type: Number },
  equipmentUnit: { type: String, enum: ['ft', 'm'] },
  commodityDescription: { type: String, trim: true },
  pieceCount: { type: Number },
  packageType: { type: String, trim: true },
  totalWeight: { type: Number },
  weightUnit: { type: String, enum: ['lbs', 'kg'], default: 'lbs' },
  isHazardous: { type: Boolean, default: false },
  unNumber: { type: String, trim: true },
  hazmatClass: { type: String, trim: true },
  isTemperatureControlled: { type: Boolean, default: false },
  temperatureMin: { type: Number },
  temperatureMax: { type: Number },
  tempUnit: { type: String, enum: ['C', 'F'] },
  customerRate: { type: Number, required: false },
  carrierCostTotal: { type: Number, required: false },
  grossProfit: { type: Number },
  margin: { type: Number },
  totalCustomerRate: { type: Number },
  totalCarrierCost: { type: Number },
  internalNotes: { type: String, trim: true },
  specialInstructions: { type: String, trim: true },
  customTags: [{ type: String, trim: true }],
  checkIns: [{
    dateTime: { type: Date, default: Date.now },
    method: { type: String, enum: ['phone', 'email', 'text', 'api', 'portal', 'edi'], required: true },
    contactPerson: { type: String, trim: true },
    currentLocation: { type: String, trim: true },
    notes: { type: String, required: true, trim: true },
    statusUpdate: { type: String, enum: statusEnumValues },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  }],
  documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

shipmentSchema.virtual('origin').get(function() {
  if (!this.stops || this.stops.length === 0) return undefined;
  return this.stops.find(s => s.isLaneOrigin) || this.stops.find(s => s.stopType === 'Pickup' || s.stopType === 'Port');
});

// This finds the last dropoff-type stop and treats it as the "destination"
shipmentSchema.virtual('destination').get(function() {
  if (!this.stops || this.stops.length === 0) return undefined;
  return [...this.stops].reverse().find(s => s.isLaneDestination) || [...this.stops].reverse().find(s => s.stopType === 'Dropoff');
});

const modelDefaultQuoteFormSettings: IQuoteFormSettings = {
    requiredFields: [],
    quoteNumberPrefix: 'QT-',
    quoteNumberNextSequence: 1000, // Placeholder
};

shipmentSchema.pre<IShipment>('save', async function(next) {
  if (this.isNew && (!this.shipmentNumber || this.shipmentNumber.trim() === '')) {
    let attempts = 0;
    let unique = false;
    let generatedNumber = '';
    const ShipmentModelInstance = mongoose.model<IShipment>('Shipment');
    
    let prefixToUse = this.modeOfTransport ? this.modeOfTransport.substring(0,2).toUpperCase().replace('-', '') : "GN";

    if (this.status === 'quote') {
        try {
            const settingsDoc = await ApplicationSettings.findOne({ key: 'quoteForm' }).lean();
            if (settingsDoc && settingsDoc.settings) {
                prefixToUse = (settingsDoc.settings as IQuoteFormSettings).quoteNumberPrefix || prefixToUse;
            }
        } catch (settingsError) {
            logger.error("Could not fetch quote settings for prefix.", settingsError);
        }
    }
    
    while(!unique && attempts < 5) {
        generatedNumber = `${prefixToUse}${nanoidTms()}`;
        const existing = await ShipmentModelInstance.findOne({ shipmentNumber: generatedNumber }).select('_id').lean();
        if (!existing) unique = true;
        attempts++;
    }
    this.shipmentNumber = unique ? generatedNumber : `TMS-ERR-${Date.now()}-${generateNanoid(5)}`;
  }
  next();
});

shipmentSchema.index({ shipmentNumber: 1 }, { unique: true });
shipmentSchema.index({ status: 1, scheduledPickupDate: -1 });
shipmentSchema.index({ 'origin.city': 1, 'destination.city': 1 });
shipmentSchema.index({ containerNumber: 1 }, { sparse: true });
shipmentSchema.index({ proNumber: 1 }, { sparse: true });
shipmentSchema.index({ billOfLadingNumber: 1 }, { sparse: true });
shipmentSchema.index({ 'shipper': 1, 'customerRate': -1 });
shipmentSchema.index({ 'carrier': 1, 'carrierCostTotal': -1 });
shipmentSchema.index({ modeOfTransport: 1, status: 1 });
shipmentSchema.index({ purchaseOrderNumbers: 1 }, {sparse: true});
shipmentSchema.index({ createdBy: 1, createdAt: -1 });

// Export the model as a named export
export const Shipment = mongoose.model<IShipment>('Shipment', shipmentSchema);