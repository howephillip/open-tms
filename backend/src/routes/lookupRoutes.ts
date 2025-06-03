// File: backend/src/routes/lookupRoutes.ts
import { Router } from 'express';
import { LookupController } from '../controllers/lookupController';

const router = Router();
const lookupController = new LookupController();

router.get('/equipment-types', lookupController.getEquipmentTypes);
router.get('/accessorial-types', lookupController.getAccessorialTypes);
// Add other lookup routes here:
// router.get('/modes-of-transport', lookupController.getModeOfTransports);

export { router as lookupRoutes };