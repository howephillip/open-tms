import { Router } from 'express';
// import { AuthController } from '../controllers/authController'; // You'll create this controller later

const router = Router();
// const authController = new AuthController();

// Placeholder routes - implement these later
router.post('/login', (req, res) => res.status(501).json({ message: 'Login not implemented' }));
router.post('/register', (req, res) => res.status(501).json({ message: 'Register not implemented' }));
router.get('/me', (req, res) => res.status(501).json({ message: 'Me not implemented' }));

export { router as authRoutes };