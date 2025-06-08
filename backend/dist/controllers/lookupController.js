"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LookupController = void 0;
const EquipmentType_1 = require("../models/EquipmentType");
const AccessorialType_1 = require("../models/AccessorialType"); // Ensure this is imported
const logger_1 = require("../utils/logger");
class LookupController {
    async getEquipmentTypes(req, res) {
        logger_1.logger.info('Fetching equipment types for lookup. Query params:', req.query);
        try {
            const { category } = req.query;
            const query = { isActive: true };
            if (category && typeof category === 'string') {
                query.category = category;
            }
            const equipmentTypes = await EquipmentType_1.EquipmentType.find(query).sort({ category: 1, name: 1 }).lean();
            res.status(200).json({
                success: true,
                message: "Equipment types fetched successfully",
                data: {
                    equipmentTypes
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching equipment types for lookup:', { message: error.message, stack: error.stack });
            res.status(500).json({ success: false, message: 'Error fetching equipment types', errorDetails: error.message });
        }
    }
    async getAccessorialTypes(req, res) {
        logger_1.logger.info('Fetching accessorial types for lookup. Query params:', req.query);
        try {
            const { mode, category } = req.query;
            const query = { isActive: true };
            if (mode && typeof mode === 'string') {
                query.appliesToModes = mode;
            }
            if (category && typeof category === 'string') {
                query.category = category;
            }
            const accessorialTypes = await AccessorialType_1.AccessorialType.find(query)
                .sort({ category: 1, name: 1 })
                .select('name code defaultCustomerRate defaultCarrierCost isPerUnit unitName category appliesToModes') // Ensure all needed fields are selected
                .lean();
            logger_1.logger.info(`Fetched ${accessorialTypes.length} accessorial types for lookup.`);
            res.status(200).json({
                success: true,
                message: "Accessorial types fetched successfully for lookup.",
                data: {
                    accessorialTypes
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching accessorial types for lookup:', { message: error.message, stack: error.stack });
            res.status(500).json({ success: false, message: 'Error fetching accessorial types for lookup', errorDetails: error.message });
        }
    }
    async getModeOfTransportOptions(req, res) {
        logger_1.logger.info('Fetching mode of transport options.');
        try {
            const modes = [
                'truckload-ftl', 'truckload-ltl', 'drayage-import', 'drayage-export',
                'intermodal-rail', 'ocean-fcl', 'ocean-lcl', 'air-freight',
                'expedited-ground', 'final-mile', 'other'
            ];
            const modeObjects = modes.map(m => ({ _id: m, name: m.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }));
            res.status(200).json({
                success: true,
                message: "Mode of transport options fetched successfully",
                data: { modesOfTransport: modeObjects }
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching mode of transport options:', { message: error.message });
            res.status(500).json({ success: false, message: 'Error fetching mode options' });
        }
    }
    async getStatusOptions(req, res) {
        logger_1.logger.info('Fetching status options.');
        try {
            const statuses = [
                'quote', 'booked', 'dispatched', 'at_pickup', 'picked_up',
                'in_transit_origin_drayage', 'at_origin_port_ramp', 'in_transit_main_leg',
                'at_destination_port_ramp', 'in_transit_destination_drayage', 'at_delivery',
                'delivered', 'pod_received', 'invoiced', 'paid', 'cancelled', 'on_hold', 'problem'
            ];
            const statusObjects = statuses.map(s => ({ _id: s, name: s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }));
            res.status(200).json({
                success: true,
                message: "Status options fetched successfully",
                data: { statusOptions: statusObjects }
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching status options:', { message: error.message });
            res.status(500).json({ success: false, message: 'Error fetching status options' });
        }
    }
}
exports.LookupController = LookupController;
//# sourceMappingURL=lookupController.js.map