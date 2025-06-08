"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRoutes = void 0;
// File: backend/src/routes/settings.ts
const express_1 = require("express");
const settingsController_1 = require("../controllers/settingsController");
// import { authMiddleware, adminOnlyMiddleware } from '../middleware/authMiddleware'; // Assuming you'll add auth
const router = (0, express_1.Router)();
exports.settingsRoutes = router;
const settingsController = new settingsController_1.SettingsController();
// For now, these routes are open. Add authMiddleware and adminOnlyMiddleware as needed.
// Example: router.use(authMiddleware);
// Example: router.put('/quoteform', adminOnlyMiddleware, settingsController.updateQuoteFormSettings);
router.get('/quoteform', settingsController.getQuoteFormSettings);
router.put('/quoteform', settingsController.updateQuoteFormSettings); // Consider making this PATCH if partial updates are allowed
//# sourceMappingURL=settings.js.map