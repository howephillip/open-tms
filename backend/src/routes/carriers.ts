import { Router } from 'express';
import { CarrierController } from '../controllers/carrierController'; // Import the actual controller

const router = Router();
const carrierController = new CarrierController(); // Instantiate the controller

// Wire up controller methods to routes
router.get('/', carrierController.getCarriers);
router.post('/', carrierController.createCarrier);
router.get('/:id', carrierController.getCarrierById);
router.post('/:id/safer-update', carrierController.updateSaferDataForCarrier);
router.put('/:id', carrierController.updateCarrier);       // Placeholder for update
router.delete('/:id', carrierController.deleteCarrier);   // Placeholder for delete

// Fallback for any other methods on /:id or /
router.all('/:id', (req, res) => res.status(405).json({ message: 'Method Not Allowed on this carrier resource.' }));
router.all('/', (req, res) => res.status(405).json({ message: 'Method Not Allowed on /carriers.' }));


export { router as carrierRoutes };