import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me, register } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Slows down password guessing without getting in the way of normal use.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again in 15 minutes' },
});

router.post('/register', loginLimiter, register);
router.post('/login', loginLimiter, login);
router.delete('/logout', logout);
router.get('/me', requireAuth, me);

export default router;
