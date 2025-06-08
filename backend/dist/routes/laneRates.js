"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.laneRateRoutes = void 0;
// File: backend/src/routes/laneRates.ts
const express_1 = require("express");
const laneRateController_1 = require("../controllers/laneRateController");
const router = (0, express_1.Router)();
exports.laneRateRoutes = router;
const laneRateController = new laneRateController_1.LaneRateController();
router.get('/summary', laneRateController.getLaneRateSummary);
router.get('/detail', laneRateController.getLaneRateDetail);
router.get('/carrier/:carrierId', laneRateController.getLaneRatesByCarrier); // This should now be found
router.post('/manual', laneRateController.createManualLaneRate);
router.put('/manual/:id', laneRateController.updateManualLaneRate);
router.delete('/:id', laneRateController.deleteLaneRate);
//# sourceMappingURL=laneRates.js.map