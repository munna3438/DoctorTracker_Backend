import { Router } from 'express';
import {
  createPatient,
  deletePatient,
  getPatient,
  getPatientFilters,
  listPatients,
  updatePatient,
} from '../controllers/patientController.js';

const router = Router();

router.get('/', listPatients);
router.get('/filters', getPatientFilters);
router.post('/', createPatient);
router.get('/:id', getPatient);
router.put('/:id', updatePatient);
router.delete('/:id', deletePatient);

export default router;
