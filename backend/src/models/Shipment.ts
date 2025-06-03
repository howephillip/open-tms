// File: backend/src/models/Shipment.ts
import mongoose, { Schema, Document } from 'mongoose';
import { customAlphabet } from 'nanoid';
import { logger } from '../utils/logger';
import { ApplicationSettings, IQuoteFormSettings } from './ApplicationSettings';

const nanoidTms = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

export interface IReferenceNumber {
  type: string;
  value: string;
  _id?: mongoose.Types.ObjectId;
}
const referenceNumberSchema = new Schema<IReferenceNumber>({
  type: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true }
}, { _id: true });

type ShipmentStatusType =
    | 'quote' | 'booked' | 'dispatched' | 'at_pickup' | 'picked_up'
    | 'in_transit_origin_drayage' | 'at_origin_port_ramp' | 'in_transit_main_leg'
    | 'at_destination_port_ramp' | 'in_transit_destination_drayage' | 'at_delivery'
    | 'delivered' | 'pod_received' | 'invoiced' | 'paid' | 'cancelled' | 'on_hold' | 'problem';

export interface IQuoteAccessorial {
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

export interface IShipment extends Document {
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
  shipper: mongoose.Types.ObjectId; // Still fundamentally required
  carrier?: mongoose.Types.ObjectId; // Optional for quotes
  consignee?: { name?: string; address?: string; contactName?: string; contactPhone?: string; contactEmail?: string; };
  billTo?: mongoose.Types.ObjectId;
  modeOfTransport: ModeOfTransportType; // Fundamentally required
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
  origin: { name?: string; address?: string; city?: string; state?: string; zip?: string; country?: string; locationType?: string; contactName?: string; contactPhone?: string; contactEmail?: string; notes?: string; }; // Sub-fields become optional here
  destination: { name?: string; address?: string; city?: string; state?: string; zip?: string; country?: string; locationType?: string; contactName?: string; contactPhone?: string; contactEmail?: string; notes?: string; }; // Sub-fields become optional here
  scheduledPickupDate?: Date; // Made optional at schema level
  scheduledDeliveryDate?: Date; // Made optional at schema level
  scheduledPickupTime?: string;
  pickupAppointmentNumber?: string;
  actualPickupDateTime?: Date;
  scheduledDeliveryTime?: string;
  deliveryAppointmentNumber?: string;
  actualDeliveryDateTime?: Date;
  status: ShipmentStatusType; // Fundamentally required
  equipmentType?: string; // Made optional at schema level
  equipmentLength?: number;
  equipmentUnit?: 'ft' | 'm';
  commodityDescription?: string; // Made optional at schema level
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
  customerRate: number; // Required for financial calcs
  carrierCostTotal: number; // Required for financial calcs
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
  createdBy: mongoose.Types.ObjectId; // Fundamentally required
  updatedBy?: mongoose.Types.ObjectId;
}

const locationSchema = new Schema({
    name: { type: String, trim: true },
    address: { type: String, /* required: false, */ trim: true }, // Optional at schema level
    city: { type: String, /* required: false, */ trim: true },    // Optional at schema level
    state: { type: String, /* required: false, */ trim: true },   // Optional at schema level
    zip: { type: String, /* required: false, */ trim: true },     // Optional at schema level
    country: { type: String, trim: true, default: 'USA' },
    locationType: { type: String, enum: ['shipper_facility', 'port_terminal', 'rail_ramp', 'airport_cargo', 'warehouse', 'consignee_facility', 'other'], trim: true },
    contactName: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    notes: { type: String, trim: true },
}, { _id: false });

const statusEnumValues: ShipmentStatusType[] = [
    'quote', 'booked', 'dispatched', 'at_pickup', 'picked_up',
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
  shipper: { type: Schema.Types.ObjectId, ref: 'Shipper', required: true, index: true },
  carrier: { type: Schema.Types.ObjectId, ref: 'Carrier', required: false, index: true }, // Keep as false to allow null/undefined for quotes
  consignee: { name: String, address: String, contactName: String, contactPhone: String, contactEmail: String },
  billTo: { type: Schema.Types.ObjectId, ref: 'Customer' },
  modeOfTransport: { type: String, enum: ['truckload-ftl', 'truckload-ltl', 'drayage-import', 'drayage-export', 'intermodal-rail', 'ocean-fcl', 'ocean-lcl', 'air-freight', 'expedited-ground', 'final-mile', 'other'], required: true, index: true },
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
  origin: { type: locationSchema, required: true }, // Origin/Dest objects themselves are required
  destination: { type: locationSchema, required: true }, // Their subfields now controlled by controller
  scheduledPickupDate: { type: Date, /* required: false, */ index: true }, // Example: Now optional at schema level
  scheduledDeliveryDate: { type: Date, /* required: false, */ index: true }, // Example: Now optional at schema level
  scheduledPickupTime: { type: String, trim: true },
  pickupAppointmentNumber: { type: String, trim: true },
  actualPickupDateTime: { type: Date },
  scheduledDeliveryTime: { type: String, trim: true },
  deliveryAppointmentNumber: { type: String, trim: true },
  actualDeliveryDateTime: { type: Date },
  status: { type: String, enum: statusEnumValues, default: 'booked', required: true, index: true },
  equipmentType: { type: String, /* required: false, */ trim: true }, // Optional at schema
  equipmentLength: { type: Number },
  equipmentUnit: { type: String, enum: ['ft', 'm'] },
  commodityDescription: { type: String, /* required: false, */ trim: true }, // Optional at schema
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
  customerRate: { type: Number, required: true },
  carrierCostTotal: { type: Number, required: true },
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
  timestamps: true
});

// Pre-save hook (financial calculations and shipment number generation)
// This remains largely the same, but it now respects that some base values might be optional.
shipmentSchema.pre<IShipment>('save', async function(next) {
  let lineHaulCustomer = this.customerRate || 0;
  let lineHaulCarrier = this.carrierCostTotal || 0;

  let fscCustomerValue = 0;
  let fscCarrierValue = 0;

  if (this.fscType && this.fscCustomerAmount != null) {
    const fscAmount = this.fscCustomerAmount;
    if (this.fscType === 'percentage') { fscCustomerValue = lineHaulCustomer * (fscAmount / 100); }
    else { fscCustomerValue = fscAmount; }
  }
  if (this.fscType && this.fscCarrierAmount != null) {
    const fscAmount = this.fscCarrierAmount;
    if (this.fscType === 'percentage') { fscCarrierValue = lineHaulCarrier * (fscAmount / 100); }
    else { fscCarrierValue = fscAmount; }
  }

  const chassisCustomerValue = this.chassisCustomerCost || 0;
  const chassisCarrierValue = this.chassisCarrierCost || 0;

  let calculatedTotalCustomerRate = lineHaulCustomer + fscCustomerValue + chassisCustomerValue;
  let calculatedTotalCarrierCost = lineHaulCarrier + fscCarrierValue + chassisCarrierValue;

  if (this.accessorials && this.accessorials.length > 0) {
    this.accessorials.forEach(acc => {
      calculatedTotalCustomerRate += (acc.customerRate || 0) * (acc.quantity || 1);
      calculatedTotalCarrierCost += (acc.carrierCost || 0) * (acc.quantity || 1);
    });
  }

  this.totalCustomerRate = calculatedTotalCustomerRate;
  this.totalCarrierCost = calculatedTotalCarrierCost;

  const financialFieldsModified = this.isModified('customerRate') ||
                                  this.isModified('carrierCostTotal') ||
                                  this.isModified('fscType') ||
                                  this.isModified('fscCustomerAmount') ||
                                  this.isModified('fscCarrierAmount') ||
                                  this.isModified('chassisCustomerCost') ||
                                  this.isModified('chassisCarrierCost') ||
                                  this.isModified('accessorials');

  if (financialFieldsModified || this.isNew) {
    this.grossProfit = (this.totalCustomerRate || 0) - (this.totalCarrierCost || 0);
    this.margin = (this.totalCustomerRate && this.totalCustomerRate !== 0) ? (this.grossProfit / this.totalCustomerRate) * 100 : 0;
  }

  if (this.isNew && (!this.shipmentNumber || this.shipmentNumber.trim() === '')) {
    let attempts = 0;
    let unique = false;
    let generatedNumber = '';
    const ShipmentModel = mongoose.model<IShipment>('Shipment');
    const settingsDoc = await ApplicationSettings.findOne({ key: 'quoteForm' }).lean();
    const prefixFromSettings = (settingsDoc?.settings as IQuoteFormSettings)?.quoteNumberPrefix || defaultControllerQuoteFormSettings.quoteNumberPrefix;


    while(!unique && attempts < 5) {
        // Use prefix from settings if status is 'quote', otherwise use mode-based prefix
        const prefix = this.status === 'quote' 
            ? prefixFromSettings 
            : (this.modeOfTransport ? this.modeOfTransport.substring(0,2).toUpperCase().replace('-', '') : "GN");
        
        generatedNumber = `${prefix}${nanoidTms()}`; // Using nanoid for the random part

        // If using sequence from settings (more complex, requires updating the setting document atomically)
        // For now, simple prefix + nanoid is safer without transactional updates to settings sequence.
        // If you want to use and increment quoteNumberNextSequence from settings, that needs careful handling.
        // Example if you wanted to try (NEEDS ATOMIC UPDATE on ApplicationSettings):
        // if (this.status === 'quote' && settingsDoc && (settingsDoc.settings as IQuoteFormSettings).quoteNumberNextSequence) {
        //    generatedNumber = `${prefixFromSettings}${(settingsDoc.settings as IQuoteFormSettings).quoteNumberNextSequence}`;
        // } else {
        //    generatedNumber = `${prefix}-${nanoidTms()}`;
        // }


        try {
            const existing = await ShipmentModel.findOne({ shipmentNumber: generatedNumber }).select('_id').lean();
            if (!existing) {
                unique = true;
            } 
            // else if (this.status === 'quote' && settingsDoc && (settingsDoc.settings as IQuoteFormSettings).quoteNumberNextSequence) {
            //   (settingsDoc.settings as IQuoteFormSettings).quoteNumberNextSequence++; // This is NOT atomic and BAD for concurrency
            // }
        } catch (err) {
            logger.error("Error checking for existing shipment number during generation:", err);
            attempts = 5;
        }
        attempts++;
    }
    if (unique) {
        this.shipmentNumber = generatedNumber;
        // If using sequence, here you would attempt to atomically increment ApplicationSettings.quoteNumberNextSequence
    } else {
        this.shipmentNumber = `TMS-ERR-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
        logger.error(`Failed to generate a unique shipment number after ${attempts} attempts. Using fallback: ${this.shipmentNumber}`);
    }
  }
  next();
});

// Indexes (keep as is)
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

export const Shipment = mongoose.model<IShipment>('Shipment', shipmentSchema);