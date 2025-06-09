import { Router } from 'express';
import { EquipmentTypeController } from '../controllers/equipmentTypeController';

const router = Router();
const controller = new EquipmentTypeController();

// Basic CRUD for managing equipment types
router.post('/', controller.createEquipmentType);
router.get('/', controller.getEquipmentTypes); // This will handle the management table
router.get('/:id', controller.getEquipmentTypeById);
router.put('/:id', controller.updateEquipmentType);
router.delete('/:id', controller.deleteEquipmentType);

export { router as equipmentTypeRoutes };