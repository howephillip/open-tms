"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupRoutes = void 0;
// File: backend/src/routes/lookupRoutes.ts
const express_1 = require("express");
const lookupController_1 = require("../controllers/lookupController");
const router = (0, express_1.Router)();
exports.lookupRoutes = router;
const lookupController = new lookupController_1.LookupController();
router.get('/equipment-types', lookupController.getEquipmentTypes);
router.get('/accessorial-types', lookupController.getAccessorialTypes);
//# sourceMappingURL=lookupRoutes.js.map