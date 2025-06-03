// File: backend/src/routes/shipments.ts
import { Router } from 'express';
import { ShipmentController } from '../controllers/shipmentController';
// import { authMiddleware } from '../middleware/authMiddleware'; // Example: if you add authentication

const router = Router();
const shipmentController = new ShipmentController();

// ---- DEBUGGING ----
console.log('--- Debugging shipmentController in shipments.ts ---');
console.log('Type of shipmentController:', typeof shipmentController);
console.log('shipmentController instance:', shipmentController);
console.log('shipmentController.createShipment:', shipmentController.createShipment);
console.log('shipmentController.getShipmentById:', shipmentController.getShipmentById);
console.log('shipmentController.getShipments:', shipmentController.getShipments); // <<< Pay close attention to this one
console.log('shipmentController.updateShipment:', shipmentController.updateShipment);
console.log('shipmentController.addCheckIn:', shipmentController.addCheckIn);
console.log('shipmentController.generateStatusEmail:', shipmentController.generateStatusEmail);
console.log('shipmentController.updateShipmentTags:', shipmentController.updateShipmentTags);
console.log('--- End Debugging ---');
// ---- END DEBUGGING ----

// --- Apply middleware if needed, e.g., for authentication ---
// router.use(authMiddleware); // Protects all shipment routes below

// --- Shipment CRUD Operations ---
router.post('/', shipmentController.createShipment);        // CREATE a new shipment
router.get('/:id', shipmentController.getShipmentById);
router.get('/', shipmentController.getShipments);          // GET all shipments (with pagination/filtering)
// router.get('/:id', shipmentController.getShipmentById); // GET a single shipment by ID (TODO: Implement controller method if needed)
router.put('/:id', shipmentController.updateShipment);       // UPDATE an existing shipment <<<<------ ENSURE THIS LINE IS PRESENT AND UNCOMMENTED
router.delete('/:id', shipmentController.deleteShipment);   // DELETE a shipment (TODO: Implement controller method if needed)

// --- Additional Shipment-Specific Actions ---
router.post('/:id/checkins', shipmentController.addCheckIn);                // Add a check-in to a shipment
router.post('/:id/generate-email', shipmentController.generateStatusEmail); // Generate AI email content
router.patch('/:id/tags', shipmentController.updateShipmentTags);           // Update custom tags for a shipment

// Fallback for unhandled methods on specific shipment routes
// This needs to be AFTER specific method handlers for the same path pattern.
// For example, if you define GET /:id, PUT /:id, DELETE /:id, then this router.all('/:id',...)
// should come after all of them to catch other methods like PATCH /:id if not defined.
router.all('/:id', (req, res) => {
    // Check if a more specific handler for this method exists above for this path pattern.
    // This is a simple catch-all; more sophisticated routing might be needed for complex scenarios.
    logger.warn(`Method Not Allowed for /api/shipments/:id : ${req.method} ${req.originalUrl}`);
    res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed on ${req.originalUrl}` });
});

// Fallback for unhandled methods on the base /shipments route
router.all('/', (req, res) => {
    logger.warn(`Method Not Allowed for /api/shipments/ : ${req.method} ${req.originalUrl}`);
    res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed on ${req.originalUrl}` });
});


export { router as shipmentRoutes };