// File: backend/src/routes/accessorialTypes.ts
import { Router } from 'express';
import { AccessorialTypeController } from '../controllers/accessorialTypeController';
// import { authMiddleware, adminOnlyMiddleware } from '../middleware/authMiddleware'; // For future security

const router = Router();
const controller = new AccessorialTypeController();

// Apply auth middleware if needed for all routes, or selectively
// router.use(authMiddleware);

// For CRUD operations, typically admin/privileged access is required
// router.post('/', adminOnlyMiddleware, controller.createAccessorialType);
// router.put('/:id', adminOnlyMiddleware, controller.updateAccessorialType);
// router.delete('/:id', adminOnlyMiddleware, controller.deleteAccessorialType);

router.post('/', controller.createAccessorialType);
router.get('/', controller.getAccessorialTypes);       // For management table in settings
router.get('/:id', controller.getAccessorialTypeById);
router.put('/:id', controller.updateAccessorialType);
router.delete('/:id', controller.deleteAccessorialType);

// Note: The route GET /api/lookups/accessorial-types handled by lookupController
// is for populating dropdowns and might have different filtering (e.g., only active).
// This /api/accessorial-types route is for full CRUD management within the settings panel.

export { router as accessorialTypeRoutes };