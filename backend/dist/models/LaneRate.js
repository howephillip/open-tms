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
exports.LaneRate = void 0;
// File: backend/src/models/LaneRate.ts
const mongoose_1 = __importStar(require("mongoose"));
const manualAccessorialSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    cost: { type: Number, required: true, default: 0 },
    notes: { type: String, trim: true },
}, { _id: true });
const laneRateSchema = new mongoose_1.Schema({
    originCity: { type: String, required: true, trim: true, index: true },
    originState: { type: String, required: true, trim: true, index: true },
    originZip: { type: String, trim: true, sparse: true },
    destinationCity: { type: String, required: true, trim: true, index: true },
    destinationState: { type: String, required: true, trim: true, index: true },
    destinationZip: { type: String, trim: true, sparse: true },
    carrier: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Carrier', required: true, index: true },
    lineHaulRate: { type: Number }, // Optional if not explicitly required
    lineHaulCost: { type: Number, required: true },
    fscPercentage: { type: Number },
    carrierFscPercentage: { type: Number },
    chassisCostCustomer: { type: Number },
    chassisCostCarrier: { type: Number },
    totalAccessorialsCustomer: { type: Number, default: 0 },
    totalAccessorialsCarrier: { type: Number, default: 0 },
    manualAccessorials: [manualAccessorialSchema],
    sourceType: { type: String, enum: ['TMS_SHIPMENT', 'MANUAL_ENTRY', 'RATE_IMPORT'], required: true, default: 'MANUAL_ENTRY' },
    sourceShipmentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Shipment', sparse: true, index: true },
    sourceQuoteShipmentNumber: { type: String, trim: true, sparse: true },
    rateDate: { type: Date, default: Date.now, index: true },
    rateValidUntil: { type: Date },
    modeOfTransport: { type: String, required: true, trim: true, index: true },
    equipmentType: { type: String, trim: true, index: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }, // Added
    isActive: { type: Boolean, default: true, index: true },
}, {
    timestamps: true,
});
laneRateSchema.index({ originCity: 1, originState: 1, destinationCity: 1, destinationState: 1, carrier: 1, modeOfTransport: 1, equipmentType: 1, rateDate: -1 });
laneRateSchema.index({ carrier: 1, rateDate: -1 });
laneRateSchema.index({ sourceShipmentId: 1 });
exports.LaneRate = mongoose_1.default.model('LaneRate', laneRateSchema);
//# sourceMappingURL=LaneRate.js.map