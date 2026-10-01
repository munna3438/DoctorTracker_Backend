import { Router } from 'express';
import { getDashboard } from '../controllers/statsController.js';

const router = Router();

router.get('/dashboard', getDashboard);

export default router;
