"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaferService = void 0;
const axios_1 = __importDefault(require("axios"));
class SaferService {
    constructor() {
        this.baseUrl = 'https://mobile.fmcsa.dot.gov/qc/services/carriers';
    }
    async getCarrierSafetyData(dotNumber) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/${dotNumber}`, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });
            return {
                dotNumber: response.data.dotNumber,
                legalName: response.data.legalName,
                dbaName: response.data.dbaName,
                address: response.data.phyAddress,
                saferRating: response.data.saferRating,
                reviewDate: response.data.reviewDate,
                outOfServiceDate: response.data.outOfServiceDate,
                mcs150Date: response.data.mcs150Date,
                totalDrivers: response.data.totalDrivers,
                totalPowerUnits: response.data.totalPowerUnits,
                carrierOperation: response.data.carrierOperation,
                hmFlag: response.data.hmFlag,
                pcFlag: response.data.pcFlag,
                censusType: response.data.censusType,
                lastUpdated: new Date(),
            };
        }
        catch (error) {
            console.error('Error fetching SAFER data:', error);
            throw new Error('Failed to fetch carrier safety data');
        }
    }
    async updateCarrierSafetyData(carrierId, dotNumber) {
        try {
            const safetyData = await this.getCarrierSafetyData(dotNumber);
            // Update carrier record with safety data
            // This would typically update the database
            return safetyData;
        }
        catch (error) {
            console.error('Error updating carrier safety data:', error);
            throw error;
        }
    }
}
exports.SaferService = SaferService;
//# sourceMappingURL=saferService.js.map