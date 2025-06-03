import axios from 'axios';
import { config } from '../../config/database';

export class SaferService {
  private baseUrl = 'https://mobile.fmcsa.dot.gov/qc/services/carriers';

  async getCarrierSafetyData(dotNumber: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/${dotNumber}`, {
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
    } catch (error) {
      console.error('Error fetching SAFER data:', error);
      throw new Error('Failed to fetch carrier safety data');
    }
  }

  async updateCarrierSafetyData(carrierId: string, dotNumber: string): Promise<any> {
    try {
      const safetyData = await this.getCarrierSafetyData(dotNumber);
      
      // Update carrier record with safety data
      // This would typically update the database
      return safetyData;
    } catch (error) {
      console.error('Error updating carrier safety data:', error);
      throw error;
    }
  }
}
