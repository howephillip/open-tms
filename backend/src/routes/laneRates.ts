// File: backend/src/routes/laneRates.ts
import { Router } from 'express';
import { LaneRateController } from '../controllers/laneRateController';
// import { authMiddleware } from '../middleware/authMiddleware'; // Add auth if needed

const router = Router();
const laneRateController = new LaneRateController();

// router.use(authMiddleware); // Protect all lane rate routes

router.get('/summary', laneRateController.getLaneRateSummary);
router.get('/detail', laneRateController.getLaneRateDetail); // Query params: originCity, originState, destCity, destState, [originZip, destZip, carrierId, etc.]
router.get('/carrier/:carrierId', laneRateController.getLaneRatesByCarrier);
router.post('/manual', laneRateController.createManualLaneRate);
router.put('/manual/:laneRateId', laneRateController.updateManualLaneRate);
router.delete('/:laneRateId', laneRateController.deleteLaneRate);

export { router as laneRateRoutes };