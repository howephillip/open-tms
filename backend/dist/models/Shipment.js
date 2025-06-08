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
const nanoid_1 = require("nanoid"); // Correct import for nanoid v3
const logger_1 = require("../utils/logger");
const ApplicationSettings_1 = require("./ApplicationSettings"); // Ensure this exists and exports correctly
const nanoidTms = (0, nanoid_1.customAlphabet)('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
const referenceNumberSchema = new mongoose_1.Schema({
    type: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true }
}, { _id: true });
const quoteAccessorialSchema = new mongoose_1.Schema({
    accessorialTypeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'AccessorialType', required: true },
    name: { type: String, trim: true },
    quantity: { type: Number, default: 1 },
    customerRate: { type: Number, required: true, default: 0 },
    carrierCost: { type: Number, required: true, default: 0 },
    notes: { type: String, trim: true },
}, { _id: true });
const locationSchema = new mongoose_1.Schema({
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
const modeOfTransportEnumValues = [
    'truckload-ftl', 'truckload-ltl', 'drayage-import', 'drayage-export',
    'intermodal-rail', 'ocean-fcl', 'ocean-lcl', 'air-freight',
    'expedited-ground', 'final-mile', 'other'
];
const statusEnumValues = [
    'quote', 'booked', 'dispatched', 'at_pickup', 'picked_up',
    'in_transit_origin_drayage', 'at_origin_port_ramp', 'in_transit_main_leg',
    'at_destination_port_ramp', 'in_transit_destination_drayage', 'at_delivery',
    'delivered', 'pod_received', 'invoiced', 'paid', 'cancelled', 'on_hold', 'problem'
];
const shipmentSchema = new mongoose_1.Schema({
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
    quotedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    shipper: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Shipper', required: true, index: true },
    carrier: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Carrier', required: false, index: true },
    consignee: { name: String, address: String, contactName: String, contactPhone: String, contactEmail: String },
    billTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Customer' },
    modeOfTransport: { type: String, enum: modeOfTransportEnumValues, required: true, index: true },
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
    scheduledPickupDate: { type: Date, index: true },
    scheduledDeliveryDate: { type: Date, index: true },
    scheduledPickupTime: { type: String, trim: true },
    pickupAppointmentNumber: { type: String, trim: true },
    actualPickupDateTime: { type: Date },
    scheduledDeliveryTime: { type: String, trim: true },
    deliveryAppointmentNumber: { type: String, trim: true },
    actualDeliveryDateTime: { type: Date },
    status: { type: String, enum: statusEnumValues, default: 'booked', required: true, index: true },
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
            createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
        }],
    documents: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Document' }],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true
});
// Define defaultControllerQuoteFormSettings here as well if model pre-save hook needs it
// For now, the shipment number generation logic is simplified to not depend on it directly.
const modelDefaultQuoteFormSettings = {
    requiredFields: [], // Not used by model directly for validation, controller handles it.
    quoteNumberPrefix: 'QT-',
    quoteNumberNextSequence: 1000, // Placeholder
};
shipmentSchema.pre('save', async function (next) {
    let lineHaulCustomer = this.customerRate || 0;
    let lineHaulCarrier = this.carrierCostTotal || 0;
    let fscCustomerValue = 0;
    let fscCarrierValue = 0;
    if (this.fscType && this.fscCustomerAmount != null) {
        const fscAmount = this.fscCustomerAmount;
        if (this.fscType === 'percentage') {
            fscCustomerValue = lineHaulCustomer * (fscAmount / 100);
        }
        else {
            fscCustomerValue = fscAmount;
        }
    }
    if (this.fscType && this.fscCarrierAmount != null) {
        const fscAmount = this.fscCarrierAmount;
        if (this.fscType === 'percentage') {
            fscCarrierValue = lineHaulCarrier * (fscAmount / 100);
        }
        else {
            fscCarrierValue = fscAmount;
        }
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
        const ShipmentModelInstance = mongoose_1.default.model('Shipment'); // Use different name from export
        let prefixToUse = this.modeOfTransport ? this.modeOfTransport.substring(0, 2).toUpperCase().replace('-', '') : "GN";
        if (this.status === 'quote') {
            try {
                const settingsDoc = await ApplicationSettings_1.ApplicationSettings.findOne({ key: 'quoteForm' }).lean();
                if (settingsDoc && settingsDoc.settings) {
                    prefixToUse = settingsDoc.settings.quoteNumberPrefix || modelDefaultQuoteFormSettings.quoteNumberPrefix || prefixToUse;
                }
                else {
                    prefixToUse = modelDefaultQuoteFormSettings.quoteNumberPrefix || prefixToUse;
                }
            }
            catch (settingsError) {
                logger_1.logger.error("Could not fetch quote settings for shipment number prefix, using mode-based/default.", settingsError);
                prefixToUse = modelDefaultQuoteFormSettings.quoteNumberPrefix || prefixToUse;
            }
        }
        while (!unique && attempts < 5) {
            generatedNumber = `${prefixToUse}${nanoidTms()}`;
            try {
                const existing = await ShipmentModelInstance.findOne({ shipmentNumber: generatedNumber }).select('_id').lean();
                if (!existing) {
                    unique = true;
                }
            }
            catch (err) {
                logger_1.logger.error("Error checking for existing shipment number during generation:", err);
                attempts = 5;
            }
            attempts++;
        }
        if (unique) {
            this.shipmentNumber = generatedNumber;
        }
        else {
            this.shipmentNumber = `TMS-ERR-${Date.now()}-${(0, nanoid_1.nanoid)(5)}`;
            logger_1.logger.error(`Failed to generate a unique shipment number. Using fallback: ${this.shipmentNumber}`);
        }
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
shipmentSchema.index({ purchaseOrderNumbers: 1 }, { sparse: true });
shipmentSchema.index({ createdBy: 1, createdAt: -1 });
// Export the model as a named export
exports.Shipment = mongoose_1.default.model('Shipment', shipmentSchema);
//# sourceMappingURL=Shipment.js.map