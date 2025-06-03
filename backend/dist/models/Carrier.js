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
exports.Carrier = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const carrierSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    mcNumber: { type: String, required: true, unique: true },
    dotNumber: { type: String, required: true, unique: true },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true }
    },
    contact: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String, required: true }
    },
    saferData: {
        lastUpdated: Date,
        saferRating: String,
        status: String,
        insuranceInfo: mongoose_1.Schema.Types.Mixed
    },
    equipment: [String],
    preferredLanes: [String],
    rates: {
        average: { type: Number, default: 0 },
        lastUpdated: Date
    },
    performance: {
        onTimeDelivery: { type: Number, default: 0 },
        totalShipments: { type: Number, default: 0 },
        averageRating: { type: Number, default: 0 }
    },
    documents: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Document' }]
}, {
    timestamps: true
});
exports.Carrier = mongoose_1.default.model('Carrier', carrierSchema);
//# sourceMappingURL=Carrier.js.map