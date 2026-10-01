import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import authRoutes from './authRoutes.js';
import doctorRoutes from './doctorRoutes.js';
import patientRoutes from './patientRoutes.js';
import statsRoutes from './statsRoutes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Doctor Tracker API is running' });
});

router.use('/auth', authRoutes);

// Everything below this line needs a signed in admin.
router.use('/doctors', requireAuth, doctorRoutes);
router.use('/patients', requireAuth, patientRoutes);
router.use('/stats', requireAuth, statsRoutes);

export default router;
