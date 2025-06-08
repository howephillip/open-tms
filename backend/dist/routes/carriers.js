"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.carrierRoutes = void 0;
const express_1 = require("express");
const carrierController_1 = require("../controllers/carrierController"); // Import the actual controller
const router = (0, express_1.Router)();
exports.carrierRoutes = router;
const carrierController = new carrierController_1.CarrierController(); // Instantiate the controller
// Wire up controller methods to routes
router.get('/', carrierController.getCarriers);
router.post('/', carrierController.createCarrier);
router.get('/:id', carrierController.getCarrierById);
router.post('/:id/safer-update', carrierController.updateSaferDataForCarrier);
router.put('/:id', carrierController.updateCarrier); // Placeholder for update
router.delete('/:id', carrierController.deleteCarrier); // Placeholder for delete
// Fallback for any other methods on /:id or /
router.all('/:id', (req, res) => res.status(405).json({ message: 'Method Not Allowed on this carrier resource.' }));
router.all('/', (req, res) => res.status(405).json({ message: 'Method Not Allowed on /carriers.' }));
//# sourceMappingURL=carriers.js.map