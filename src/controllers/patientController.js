import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { createPatientSchema, patientListQuerySchema, updatePatientSchema } from '../middleware/validators.js';
import { getDateRange, getPagination, parseBody } from '../utils/query.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const POPULATE_DOCTOR = { path: 'doctor', select: 'name specialization hospital' };

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Turns a search box value into a filter on the denormalized `searchText` field.
 * Every typed word has to be present, so "am knee" still finds "Amina Khan".
 */
function buildSearchFilter(search) {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  return { searchText: { $all: words.map((word) => new RegExp(escapeRegex(word), 'i')) } };
}

function buildPatientFilter(query) {
  const filter = {};

  if (query.search) Object.assign(filter, buildSearchFilter(query.search));
  if (query.doctor) filter.doctor = query.doctor;
  if (query.condition) filter.condition = new RegExp(`^${escapeRegex(query.condition)}$`, 'i');
  if (query.status) filter.status = query.status;
  if (query.gender) filter.gender = query.gender;

  if (query.minAge !== undefined || query.maxAge !== undefined) {
    filter.age = {};
    if (query.minAge !== undefined) filter.age.$gte = query.minAge;
    if (query.maxAge !== undefined) filter.age.$lte = query.maxAge;
  }

  // ?from / ?to filter on the visit date, which is what users mean by "date wise".
  const range = getDateRange(query);
  if (range) filter.visitDate = range;

  return filter;
}

export const listPatients = asyncHandler(async (req, res) => {
  const query = parseBody(patientListQuerySchema, req.query);
  const { skip, limit, sort, page } = getPagination(query);
  const filter = buildPatientFilter(query);

  const [patients, total] = await Promise.all([
    Patient.find(filter)
      .populate(POPULATE_DOCTOR)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Patient.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: patients,
    meta: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
});

export const getPatientFilters = asyncHandler(async (_req, res) => {
  const conditions = await Patient.distinct('condition');
  res.json({ success: true, data: { conditions: conditions.sort() } });
});

export const getPatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id).populate(POPULATE_DOCTOR).lean();
  if (!patient) throw ApiError.notFound('Patient not found');
  res.json({ success: true, data: patient });
});

export const createPatient = asyncHandler(async (req, res) => {
  const body = parseBody(createPatientSchema, req.body);

  if (!(await Doctor.exists({ _id: body.doctor }))) {
    throw ApiError.badRequest('The selected doctor does not exist');
  }

  const patient = await Patient.create(body);
  res.status(201).json({ success: true, message: 'Patient added', data: patient });
});

export const updatePatient = asyncHandler(async (req, res) => {
  const body = parseBody(updatePatientSchema, req.body);

  if (body.doctor && !(await Doctor.exists({ _id: body.doctor }))) {
    throw ApiError.badRequest('The selected doctor does not exist');
  }

  const patient = await Patient.findByIdAndUpdate(req.params.id, body, {
    returnDocument: 'after',
    runValidators: true,
  }).populate(POPULATE_DOCTOR);
  if (!patient) throw ApiError.notFound('Patient not found');

  await patient.save(); // refresh searchText
  res.json({ success: true, message: 'Patient updated', data: patient });
});

export const deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndDelete(req.params.id);
  if (!patient) throw ApiError.notFound('Patient not found');
  res.json({ success: true, message: 'Patient deleted', data: { id: patient._id } });
});
