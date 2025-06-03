import { Router } from 'express';
import { ShipperController } from '../controllers/shipperController'; // Import the actual controller

const router = Router();
const shipperController = new ShipperController(); // Instantiate the controller

// Wire up controller methods to routes
router.get('/', shipperController.getShippers);
router.post('/', shipperController.createShipper);
router.get('/:id', shipperController.getShipperById);
router.put('/:id', shipperController.updateShipper);
router.delete('/:id', shipperController.deleteShipper);

// Fallback for any other methods
router.all('/:id', (req, res) => res.status(405).json({ message: 'Method Not Allowed on this shipper resource.' }));
router.all('/', (req, res) => res.status(405).json({ message: 'Method Not Allowed on /shippers.' }));


export { router as shipperRoutes };