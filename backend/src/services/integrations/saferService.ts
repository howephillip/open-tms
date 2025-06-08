import axios from 'axios';
import { config } from '../../config/database';
import { logger } from '../../utils/logger';

export class SaferService {
  private baseUrl = 'https://mobile.fmcsa.dot.gov/qc/services';

  async getCarrierSafetyData(dotNumber: string): Promise<any> {
    const webkey = config.saferApiKey;

    if (!webkey) {
      const errorMessage = 'SAFER API key (Webkey) is not configured in the .env file.';
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    const trimmedDotNumber = String(dotNumber || '').trim();
    if (!trimmedDotNumber) {
        throw new Error('A valid DOT number must be provided.');
    }

    const requestUrl = `${this.baseUrl}/carriers/${trimmedDotNumber}?webKey=${webkey}`;
    const safeLogUrl = requestUrl.replace(webkey, 'REDACTED'); // For logging safely

    logger.info(`Requesting SAFER data from: ${safeLogUrl}`);

    try {
      const response = await axios.get(requestUrl, {
        headers: { 'Accept': 'application/json' },
        timeout: 15000,
      });

      const carrierData = response.data?.content?.[0];

      if (!carrierData) {
        const notFoundMessage = `No data returned from SAFER for DOT# ${trimmedDotNumber}`;
        logger.warn(notFoundMessage);
        throw new Error(notFoundMessage);
      }

      logger.info(`Successfully received SAFER data for DOT# ${trimmedDotNumber}`);

      // Parse the response
      return {
        dotNumber: carrierData.dotNumber,
        mcNumber: carrierData.mcMxFFNumber, // Get MC# from the response
        legalName: carrierData.legalName,
        dbaName: carrierData.dbaName,
        address: {
            street: carrierData.phyStreet,
            city: carrierData.phyCity,
            state: carrierData.phyState,
            zip: carrierData.phyZipcode,
            country: carrierData.phyCountry,
        },
        saferRating: carrierData.safetyRating?.rating,
        reviewDate: carrierData.safetyRating?.reviewDate,
        outOfServiceDate: carrierData.oosDate,
        mcs150Date: carrierData.mcs150Date,
        totalDrivers: carrierData.totalDrivers,
        totalPowerUnits: carrierData.totalPowerUnits,
        carrierOperation: carrierData.carrierOperation?.carrierOperationDesc,
        hmFlag: carrierData.hmFlag,
        pcFlag: carrierData.pcFlag,
        lastUpdated: new Date(),
      };

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        // If it's the specific error from before, re-throw it.
        if (error.message.includes(`No data returned from SAFER for DOT#`)) {
          throw error;
        }
        logger.error('Axios error fetching SAFER data:', {
            message: error.message,
            status: error.response?.status,
            url: safeLogUrl,
            responseData: error.response?.data,
        });
        throw new Error(`Failed to fetch carrier safety data. API returned status: ${error.response?.status}`);
      }
      
      logger.error('Generic error in getCarrierSafetyData:', error);
      throw error; // Re-throw the original error
    }
  }

  // This method remains for consistency, calling the main logic.
  async updateCarrierSafetyData(carrierId: string, dotNumber: string): Promise<any> {
    return this.getCarrierSafetyData(dotNumber);
  }
}