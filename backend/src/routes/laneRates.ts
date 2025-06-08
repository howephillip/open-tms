// File: backend/src/routes/laneRates.ts
import { Router } from 'express';
import { LaneRateController } from '../controllers/laneRateController';

const router = Router();
const laneRateController = new LaneRateController();

router.get('/summary', laneRateController.getLaneRateSummary);
router.get('/detail', laneRateController.getLaneRateDetail);
router.get('/carrier/:carrierId', laneRateController.getLaneRatesByCarrier); // This should now be found
router.post('/manual', laneRateController.createManualLaneRate);
router.put('/manual/:id', laneRateController.updateManualLaneRate);
router.delete('/:id', laneRateController.deleteLaneRate);

export { router as laneRateRoutes };