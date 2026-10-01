import { Router } from 'express';
import {
  createDoctor,
  deleteDoctor,
  getDoctor,
  getDoctorFilters,
  listDoctors,
  updateDoctor,
} from '../controllers/doctorController.js';
import { listPatients, createPatient } from '../controllers/patientController.js';

const router = Router();

router.get('/', listDoctors);
router.get('/filters', getDoctorFilters);
router.post('/', createDoctor);
router.get('/:id', getDoctor);
router.put('/:id', updateDoctor);
router.delete('/:id', deleteDoctor);

// Patients that belong to this doctor - the list endpoint reuses the same
// search / filter / paginate logic, with the doctor fixed by the route.
router.get('/:id/patients', (req, res, next) => {
  req.query.doctor = req.params.id;
  listPatients(req, res, next);
});

router.post('/:id/patients', (req, res, next) => {
  req.body = { ...req.body, doctor: req.params.id };
  createPatient(req, res, next);
});

export default router;
