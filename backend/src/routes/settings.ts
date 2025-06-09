// File: backend/src/routes/settings.ts
import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController';

const router = Router();
const settingsController = new SettingsController();

router.get('/quoteform', settingsController.getQuoteFormSettings);
router.put('/quoteform', settingsController.updateQuoteFormSettings);

router.get('/shipmentform', settingsController.getShipmentFormSettings);
router.put('/shipmentform', settingsController.updateShipmentFormSettings);

export { router as settingsRoutes };