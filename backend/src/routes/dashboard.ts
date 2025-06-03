// File: backend/src/routes/dashboardRoutes.ts
import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
// import { authMiddleware } from '../middleware/authMiddleware'; // If dashboard data needs protection

const router = Router();
const dashboardController = new DashboardController();

// router.use(authMiddleware); // Apply auth if needed

router.get('/kpis', dashboardController.getKPIs);
router.get('/revenue-profit-trends', dashboardController.getRevenueProfitTrends);
router.get('/shipment-status-distribution', dashboardController.getShipmentStatusDistribution);
// Add more routes for other dashboard widgets here

export { router as dashboardRoutes };