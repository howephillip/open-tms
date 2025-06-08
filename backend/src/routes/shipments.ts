// File: backend/src/routes/shipments.ts
import { Router } from 'express';
import { ShipmentController } from '../controllers/shipmentController';
import { logger } from '../utils/logger'; // IMPORT logger

const router = Router();
const shipmentController = new ShipmentController();

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
    logger.warn(`Method Not Allowed for /api/shipments/:id : ${req.method} ${req.originalUrl}`);
    res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed on ${req.originalUrl}` });
});

router.all('/', (req, res) => {
    logger.warn(`Method Not Allowed for /api/shipments/ : ${req.method} ${req.originalUrl}`);
    res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed on ${req.originalUrl}` });
});

export { router as shipmentRoutes };