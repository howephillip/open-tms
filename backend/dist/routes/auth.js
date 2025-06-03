"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
// import { AuthController } from '../controllers/authController'; // You'll create this controller later
const router = (0, express_1.Router)();
exports.authRoutes = router;
// const authController = new AuthController();
// Placeholder routes - implement these later
router.post('/login', (req, res) => res.status(501).json({ message: 'Login not implemented' }));
router.post('/register', (req, res) => res.status(501).json({ message: 'Register not implemented' }));
router.get('/me', (req, res) => res.status(501).json({ message: 'Me not implemented' }));
//# sourceMappingURL=auth.js.map