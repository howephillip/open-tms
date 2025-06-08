"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shipperRoutes = void 0;
const express_1 = require("express");
const shipperController_1 = require("../controllers/shipperController"); // Import the actual controller
const router = (0, express_1.Router)();
exports.shipperRoutes = router;
const shipperController = new shipperController_1.ShipperController(); // Instantiate the controller
// Wire up controller methods to routes
router.get('/', shipperController.getShippers);
router.post('/', shipperController.createShipper);
router.get('/:id', shipperController.getShipperById);
router.put('/:id', shipperController.updateShipper);
router.delete('/:id', shipperController.deleteShipper);
// Fallback for any other methods
router.all('/:id', (req, res) => res.status(405).json({ message: 'Method Not Allowed on this shipper resource.' }));
router.all('/', (req, res) => res.status(405).json({ message: 'Method Not Allowed on /shippers.' }));
//# sourceMappingURL=shippers.js.map