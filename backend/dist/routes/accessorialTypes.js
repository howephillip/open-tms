"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accessorialTypeRoutes = void 0;
// File: backend/src/routes/accessorialTypes.ts
const express_1 = require("express");
const accessorialTypeController_1 = require("../controllers/accessorialTypeController");
// import { authMiddleware, adminOnlyMiddleware } from '../middleware/authMiddleware'; // For future security
const router = (0, express_1.Router)();
exports.accessorialTypeRoutes = router;
const controller = new accessorialTypeController_1.AccessorialTypeController();
// Apply auth middleware if needed for all routes, or selectively
// router.use(authMiddleware);
// For CRUD operations, typically admin/privileged access is required
// router.post('/', adminOnlyMiddleware, controller.createAccessorialType);
// router.put('/:id', adminOnlyMiddleware, controller.updateAccessorialType);
// router.delete('/:id', adminOnlyMiddleware, controller.deleteAccessorialType);
router.post('/', controller.createAccessorialType);
router.get('/', controller.getAccessorialTypes); // For management table in settings
router.get('/:id', controller.getAccessorialTypeById);
router.put('/:id', controller.updateAccessorialType);
router.delete('/:id', controller.deleteAccessorialType);
//# sourceMappingURL=accessorialTypes.js.map