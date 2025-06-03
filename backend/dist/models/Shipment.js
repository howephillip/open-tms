"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Shipment = void 0;
// File: backend/src/models/Shipment.ts
const mongoose_1 = __importStar(require("mongoose"));
const nanoid_1 = require("nanoid");
const logger_1 = require("../utils/logger"); // Assuming logger is in utils
const nanoidTms = (0, nanoid_1.customAlphabet)('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
const referenceNumberSchema = new mongoose_1.Schema({
    type: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true }
}, { _id: true });
const quoteAccessorialSchema = new mongoose_1.Schema({
    accessorialTypeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AccessorialType', required: true },
    name: { type: String, trim: true }, // Can be populated or entered if custom
    quantity: { type: Number, default: 1 },
    customerRate: { type: Number, required: true, default: 0 },
    carrierCost: { type: Number, required: true, default: 0 },
    notes: { type: String, trim: true },
}, { _id: true });
const locationSchema = new mongoose_1.Schema({
    name: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zip: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: 'USA' },
    locationType: { type: String, enum: ['shipper_facility', 'port_terminal', 'rail_ramp', 'airport_cargo', 'warehouse', 'consignee_facility', 'other'], trim: true },
    contactName: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    notes: { type: String, trim: true },
}, { _id: false });
const statusEnumValues = [
    'quote', 'booked', 'dispatched', 'at_pickup', 'picked_up',
    'in_transit_origin_drayage', 'at_origin_port_ramp', 'in_transit_main_leg',
    'at_destination_port_ramp', 'in_transit_destination_drayage', 'at_delivery',
    'delivered', 'pod_received', 'invoiced', 'paid', 'cancelled', 'on_hold', 'problem'
];
const shipmentSchema = new mongoose_1.Schema({
    shipmentNumber: {
        type: String,
        // required: true, // Rely on pre-save hook to generate if new and not provided
        unique: true,
        trim: true,
        index: true
    },
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
    shipper: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Shipper', required: true, index: true },
    carrier: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Carrier', required: true, index: true }, // Can be null for quotes initially
    consignee: { name: String, address: String, contactName: String, contactPhone: String, contactEmail: String },
    billTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer' },
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
    origin: { type: locationSchema, required: true },
    destination: { type: locationSchema, required: true },
    scheduledPickupDate: { type: Date, required: true, index: true },
    scheduledPickupTime: { type: String, trim: true },
    pickupAppointmentNumber: { type: String, trim: true },
    actualPickupDateTime: { type: Date },
    scheduledDeliveryDate: { type: Date, required: true, index: true },
    scheduledDeliveryTime: { type: String, trim: true },
    deliveryAppointmentNumber: { type: String, trim: true },
    actualDeliveryDateTime: { type: Date },
    status: {
        type: String,
        enum: statusEnumValues,
        default: 'booked', required: true, index: true
    },
    equipmentType: { type: String, required: true, trim: true },
    equipmentLength: { type: Number },
    equipmentUnit: { type: String, enum: ['ft', 'm'] },
    commodityDescription: { type: String, required: true, trim: true },
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
    // --- FSC Fields ---
    fscType: { type: String, enum: ['fixed', 'percentage', ''], trim: true }, // Allow empty string for 'none'
    fscCustomerAmount: { type: Number },
    fscCarrierAmount: { type: Number },
    // --- End FSC Fields ---
    customerRate: { type: Number, required: true }, // Line Haul Rate
    carrierCostTotal: { type: Number, required: true }, // Line Haul Cost (renamed for clarity)
    accessorials: [quoteAccessorialSchema],
    quoteNotes: { type: String, trim: true },
    quoteValidUntil: { type: Date },
    quotedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    totalCustomerRate: { type: Number }, // Will be calculated (Line Haul + FSC + Accessorials)
    totalCarrierCost: { type: Number }, // Will be calculated (Line Haul + FSC + Accessorials)
    grossProfit: { type: Number },
    margin: { type: Number },
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
            createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
        }],
    documents: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Document' }],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true
});
shipmentSchema.pre('save', async function (next) {
    let lineHaulCustomer = this.customerRate || 0;
    let lineHaulCarrier = this.carrierCostTotal || 0; // Assuming this is already the base carrier line haul cost
    let fscCustomerValue = 0;
    let fscCarrierValue = 0;
    // Calculate FSC based on line haul
    if (this.fscType && this.fscCustomerAmount != null) { // Check for null/undefined explicitly
        const fscAmount = this.fscCustomerAmount;
        if (this.fscType === 'percentage') {
            fscCustomerValue = lineHaulCustomer * (fscAmount / 100);
        }
        else { // fixed
            fscCustomerValue = fscAmount;
        }
    }
    if (this.fscType && this.fscCarrierAmount != null) { // Check for null/undefined explicitly
        const fscAmount = this.fscCarrierAmount;
        if (this.fscType === 'percentage') {
            fscCarrierValue = lineHaulCarrier * (fscAmount / 100);
        }
        else { // fixed
            fscCarrierValue = fscAmount;
        }
    }
    let calculatedTotalCustomerRate = lineHaulCustomer + fscCustomerValue;
    let calculatedTotalCarrierCost = lineHaulCarrier + fscCarrierValue;
    if (this.accessorials && this.accessorials.length > 0) {
        this.accessorials.forEach(acc => {
            calculatedTotalCustomerRate += (acc.customerRate || 0) * (acc.quantity || 1);
            calculatedTotalCarrierCost += (acc.carrierCost || 0) * (acc.quantity || 1);
        });
    }
    this.totalCustomerRate = calculatedTotalCustomerRate;
    this.totalCarrierCost = calculatedTotalCarrierCost;
    // Recalculate grossProfit and margin if relevant fields were modified
    // Ensure this happens *after* totalCustomerRate and totalCarrierCost are set.
    if (this.isModified('customerRate') || this.isModified('carrierCostTotal') ||
        this.isModified('fscType') || this.isModified('fscCustomerAmount') || this.isModified('fscCarrierAmount') ||
        this.isModified('accessorials') || this.isNew) { // Also calculate for new documents
        this.grossProfit = (this.totalCustomerRate || 0) - (this.totalCarrierCost || 0);
        this.margin = (this.totalCustomerRate && this.totalCustomerRate !== 0) ? (this.grossProfit / this.totalCustomerRate) * 100 : 0;
    }
    // Auto-generate shipmentNumber if not provided and it's a new document
    if (this.isNew && (!this.shipmentNumber || this.shipmentNumber.trim() === '')) {
        let attempts = 0;
        let unique = false;
        let generatedNumber = '';
        const ShipmentModel = mongoose_1.default.model('Shipment'); // Get model instance correctly
        while (!unique && attempts < 5) {
            const prefix = this.modeOfTransport ? this.modeOfTransport.substring(0, 2).toUpperCase().replace('-', '') : "GN";
            generatedNumber = `${prefix}-${nanoidTms()}`;
            try {
                const existing = await ShipmentModel.findOne({ shipmentNumber: generatedNumber }).select('_id').lean();
                if (!existing) {
                    unique = true;
                }
            }
            catch (err) {
                logger_1.logger.error("Error checking for existing shipment number during generation:", err);
                attempts = 5; // Force fallback if DB check fails
            }
            attempts++;
        }
        if (unique) {
            this.shipmentNumber = generatedNumber;
        }
        else {
            this.shipmentNumber = `TMS-ERR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            logger_1.logger.error(`Failed to generate a unique shipment number after ${attempts} attempts for mode ${this.modeOfTransport}. Using fallback: ${this.shipmentNumber}`);
        }
    }
    next();
});
// Indexes
shipmentSchema.index({ shipmentNumber: 1 }, { unique: true });
shipmentSchema.index({ status: 1, scheduledPickupDate: -1 });
shipmentSchema.index({ 'origin.city': 1, 'destination.city': 1 });
shipmentSchema.index({ containerNumber: 1 }, { sparse: true });
shipmentSchema.index({ proNumber: 1 }, { sparse: true });
shipmentSchema.index({ billOfLadingNumber: 1 }, { sparse: true });
shipmentSchema.index({ 'shipper': 1, 'customerRate': -1 });
shipmentSchema.index({ 'carrier': 1, 'carrierCostTotal': -1 });
shipmentSchema.index({ modeOfTransport: 1, status: 1 });
shipmentSchema.index({ purchaseOrderNumbers: 1 }, { sparse: true });
shipmentSchema.index({ createdBy: 1, createdAt: -1 });
exports.Shipment = mongoose_1.default.model('Shipment', shipmentSchema);
//# sourceMappingURL=Shipment.js.map