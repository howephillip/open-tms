"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardRoutes = void 0;
// File: backend/src/routes/dashboardRoutes.ts
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
// import { authMiddleware } from '../middleware/authMiddleware'; // If dashboard data needs protection
const router = (0, express_1.Router)();
exports.dashboardRoutes = router;
const dashboardController = new dashboardController_1.DashboardController();
// router.use(authMiddleware); // Apply auth if needed
router.get('/kpis', dashboardController.getKPIs);
router.get('/revenue-profit-trends', dashboardController.getRevenueProfitTrends);
router.get('/shipment-status-distribution', dashboardController.getShipmentStatusDistribution);
//# sourceMappingURL=dashboard.js.map