"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIEmailService = void 0;
// File: backend/src/services/ai/emailService.ts
const openai_1 = __importDefault(require("openai"));
const database_1 = require("../../config/database"); // Aliased to avoid conflict if 'config' is used locally
const logger_1 = require("../../utils/logger"); // Using your logger
class AIEmailService {
    constructor() {
        if (!database_1.config.openaiApiKey) {
            logger_1.logger.warn('OpenAI API Key is not configured. AIEmailService may not function.');
            // Decide if you want to throw an error here or let it fail when a method is called
            // For now, we'll let it proceed and log, methods will fail if key is missing
        }
        this.openai = new openai_1.default({
            apiKey: database_1.config.openaiApiKey, // Use the apiKey from your application config
        });
    }
    async createChatCompletion(prompt, max_tokens, model = "gpt-3.5-turbo") {
        if (!database_1.config.openaiApiKey) {
            logger_1.logger.error('OpenAI API Key is missing. Cannot make API call.');
            throw new Error('AIEmailService: OpenAI API Key is not configured.');
        }
        try {
            const completion = await this.openai.chat.completions.create({
                model: model,
                messages: [{ role: "user", content: prompt }],
                max_tokens: max_tokens,
                temperature: 0.7,
            });
            if (completion.choices && completion.choices.length > 0 && completion.choices[0].message) {
                return completion.choices[0].message.content || '';
            }
            logger_1.logger.warn('OpenAI completion did not return expected content structure.');
            return ''; // Fallback
        }
        catch (error) {
            logger_1.logger.error('Error calling OpenAI for chat completion:', {
                message: error.message,
                name: error.name,
                // stack: error.stack, // Stack can be very verbose for API errors
                // responseData: error.response?.data // If Axios-like error
            });
            throw new Error(`Failed to generate content from AI: ${error.message}`);
        }
    }
    async generateStatusUpdate(shipmentData) {
        // Ensure required data is present
        if (!shipmentData || !shipmentData.shipmentNumber || !shipmentData.origin || !shipmentData.destination) {
            logger_1.logger.warn('Insufficient shipment data for generating status update email.');
            return "Error: Insufficient shipment data provided.";
        }
        const prompt = `
    Generate a professional status update email for a freight shipment with the following details:
    - Shipment Number: ${shipmentData.shipmentNumber}
    - Origin: ${shipmentData.origin.city || 'N/A'}, ${shipmentData.origin.state || 'N/A'}
    - Destination: ${shipmentData.destination.city || 'N/A'}, ${shipmentData.destination.state || 'N/A'}
    - Status: ${shipmentData.status || 'N/A'}
    - Pickup Date: ${shipmentData.pickupDate ? new Date(shipmentData.pickupDate).toLocaleDateString() : 'N/A'}
    - Delivery Date: ${shipmentData.deliveryDate ? new Date(shipmentData.deliveryDate).toLocaleDateString() : 'N/A'}
    - Carrier Name (if available): ${typeof shipmentData.carrier === 'object' ? shipmentData.carrier?.name : (shipmentData.carrier || 'N/A')}
    
    Please make the email professional, concise, and suitable for sending to a customer or stakeholder.
    If status is "in-transit", mention that tracking is active.
    If status is "delivered", express satisfaction.
    If status is "pending", confirm booking details.
    Start with a suitable greeting (e.g., "Dear Valued Customer," or "Hello,") and end with a professional closing.
    `;
        logger_1.logger.info('Generating status update email for shipment:', shipmentData.shipmentNumber);
        return this.createChatCompletion(prompt, 500);
    }
    async generateCarrierCheckIn(shipmentData, checkInType) {
        if (!shipmentData || !shipmentData.shipmentNumber) {
            logger_1.logger.warn('Insufficient shipment data for generating carrier check-in.');
            return "Error: Insufficient shipment data provided.";
        }
        const prompt = `
    Generate a professional check-in message for a carrier regarding shipment ${shipmentData.shipmentNumber}.
    This check-in is intended to be sent via: ${checkInType}.
    Current known status of the shipment: ${shipmentData.status || 'N/A'}.
    Origin: ${shipmentData.origin?.city}, ${shipmentData.origin?.state}.
    Destination: ${shipmentData.destination?.city}, ${shipmentData.destination?.state}.
    
    Make the message brief but professional. 
    If the shipment is 'pending' or just picked up, ask for confirmation of pickup and current location/ETA to first major checkpoint.
    If the shipment is 'in-transit', ask for current location (city, state) and updated ETA for delivery.
    If the check-in type is 'text', make it very concise.
    If 'email', it can be slightly more formal.
    If 'phone', provide key points to cover in a verbal check-in.
    `;
        logger_1.logger.info(`Generating ${checkInType} carrier check-in for shipment:`, shipmentData.shipmentNumber);
        return this.createChatCompletion(prompt, 300);
    }
}
exports.AIEmailService = AIEmailService;
//# sourceMappingURL=emailService.js.map