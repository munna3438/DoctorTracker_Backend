import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { createDoctorSchema, doctorListQuerySchema, updateDoctorSchema } from '../middleware/validators.js';
import { getDateRange, getPagination, parseBody } from '../utils/query.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Escapes a user string so it can be safely used inside a RegExp. */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Turns a search box value into a filter on the denormalized `searchText` field.
 * Every typed word has to be present, so "dr sai" finds "Dr. Aisha Rahman"
 * while only one case-insensitive regex runs per word.
 */
function buildSearchFilter(search) {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  return { searchText: { $all: words.map((word) => new RegExp(escapeRegex(word), 'i')) } };
}

/**
 * Turns the list query into a Mongo filter.
 * Search runs against the denormalized `searchText` field, the filters use
 * indexed fields, and the date range uses createdAt.
 */
function buildDoctorFilter(query) {
  const filter = {};

  if (query.search) Object.assign(filter, buildSearchFilter(query.search));
  if (query.specialization) filter.specialization = new RegExp(`^${escapeRegex(query.specialization)}$`, 'i');
  if (query.hospital) filter.hospital = new RegExp(`^${escapeRegex(query.hospital)}$`, 'i');

  const range = getDateRange(query);
  if (range) filter.createdAt = range;

  return filter;
}

export const listDoctors = asyncHandler(async (req, res) => {
  const query = parseBody(doctorListQuerySchema, req.query);
  const { skip, limit, sort, page } = getPagination(query);
  const filter = buildDoctorFilter(query);

  // Two queries in parallel: the page of rows and the total count.
  const [doctors, total] = await Promise.all([
    Doctor.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Doctor.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: doctors,
    meta: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
});

/** Distinct values used to build the filter dropdowns. */
export const getDoctorFilters = asyncHandler(async (_req, res) => {
  const [specializations, hospitals] = await Promise.all([
    Doctor.distinct('specialization'),
    Doctor.distinct('hospital'),
  ]);
  res.json({ success: true, data: { specializations: specializations.sort(), hospitals: hospitals.sort() } });
});

/** One doctor with their patient count - used by the list page and the dashboard. */
export const getDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).lean();
  if (!doctor) throw ApiError.notFound('Doctor not found');

  const patientCount = await Patient.countDocuments({ doctor: doctor._id });
  res.json({ success: true, data: { ...doctor, patientCount } });
});

export const createDoctor = asyncHandler(async (req, res) => {
  const body = parseBody(createDoctorSchema, req.body);
  const doctor = await Doctor.create(body);
  res.status(201).json({ success: true, message: 'Doctor created', data: doctor });
});

export const updateDoctor = asyncHandler(async (req, res) => {
  const body = parseBody(updateDoctorSchema, req.body);

  const doctor = await Doctor.findByIdAndUpdate(req.params.id, body, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!doctor) throw ApiError.notFound('Doctor not found');

  // save() hooks do not run on findByIdAndUpdate, so refresh the search field here.
  await doctor.save();
  res.json({ success: true, message: 'Doctor updated', data: doctor });
});

export const deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndDelete(req.params.id);
  if (!doctor) throw ApiError.notFound('Doctor not found');

  // Remove the patients that belonged to this doctor so no orphans are left behind.
  const { deletedCount } = await Patient.deleteMany({ doctor: doctor._id });
  res.json({
    success: true,
    message: `Doctor deleted along with ${deletedCount} patient(s)`,
    data: { deletedPatients: deletedCount },
  });
});
