"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shipmentRoutes = void 0;
// File: backend/src/routes/shipments.ts
const express_1 = require("express");
const shipmentController_1 = require("../controllers/shipmentController");
const logger_1 = require("../utils/logger"); // IMPORT logger
const router = (0, express_1.Router)();
exports.shipmentRoutes = router;
const shipmentController = new shipmentController_1.ShipmentController();
// --- Shipment CRUD Operations ---
router.post('/', shipmentController.createShipment);
router.get('/:id', shipmentController.getShipmentById);
router.get('/', shipmentController.getShipments);
router.put('/:id', shipmentController.updateShipment);
router.delete('/:id', shipmentController.deleteShipment);
// --- Additional Shipment-Specific Actions ---
router.post('/:id/checkins', shipmentController.addCheckIn);
router.post('/:id/generate-email', shipmentController.generateStatusEmail);
router.patch('/:id/tags', shipmentController.updateShipmentTags);
router.all('/:id', (req, res) => {
    logger_1.logger.warn(`Method Not Allowed for /api/shipments/:id : ${req.method} ${req.originalUrl}`);
    res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed on ${req.originalUrl}` });
});
router.all('/', (req, res) => {
    logger_1.logger.warn(`Method Not Allowed for /api/shipments/ : ${req.method} ${req.originalUrl}`);
    res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed on ${req.originalUrl}` });
});
//# sourceMappingURL=shipments.js.map