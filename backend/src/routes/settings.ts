// File: backend/src/routes/settings.ts
import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController';
// import { authMiddleware, adminOnlyMiddleware } from '../middleware/authMiddleware'; // Assuming you'll add auth

const router = Router();
const settingsController = new SettingsController();

// For now, these routes are open. Add authMiddleware and adminOnlyMiddleware as needed.
// Example: router.use(authMiddleware);
// Example: router.put('/quoteform', adminOnlyMiddleware, settingsController.updateQuoteFormSettings);

router.get('/quoteform', settingsController.getQuoteFormSettings);
router.put('/quoteform', settingsController.updateQuoteFormSettings); // Consider making this PATCH if partial updates are allowed

// Add routes for other settings keys here
// router.get('/global', settingsController.getGlobalSettings);
// router.put('/global', settingsController.updateGlobalSettings);

export { router as settingsRoutes };