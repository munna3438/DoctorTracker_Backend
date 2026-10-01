import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const MONTH_FORMAT = '%Y-%m';

/** First day of the month, N months back. */
function monthsAgo(count) {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCMonth(date.getUTCMonth() - count);
  return date;
}

/** Counts documents per month, newest buckets included, missing months skipped. */
function monthlyCount(model, from) {
  return model.aggregate([
    { $match: { createdAt: { $gte: from } } },
    {
      $group: {
        _id: { $dateToString: { format: MONTH_FORMAT, date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
  ]);
}

/** Merges two month series into one ordered array ready for a chart. */
function mergeMonths(from, doctorRows, patientRows) {
  const months = [];
  const cursor = new Date(from);
  while (cursor <= new Date()) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const doctorMap = new Map(doctorRows.map((r) => [r._id, r.count]));
  const patientMap = new Map(patientRows.map((r) => [r._id, r.count]));

  return months.map((month) => ({
    month,
    label: new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    }),
    doctors: doctorMap.get(month) || 0,
    patients: patientMap.get(month) || 0,
  }));
}

/**
 * All dashboard numbers in one endpoint.
 * The frontend makes a single request and one screen load = one round trip.
 */
export const getDashboard = asyncHandler(async (_req, res) => {
  const from = monthsAgo(11);
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [
    doctorCount,
    patientCount,
    newDoctorsThisMonth,
    newPatientsThisMonth,
    patientsPerDoctor,
    doctorRows,
    patientRows,
    byStatus,
    byGender,
    topConditions,
    recentPatients,
  ] = await Promise.all([
    Doctor.estimatedDocumentCount(),
    Patient.estimatedDocumentCount(),

    Doctor.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Patient.countDocuments({ createdAt: { $gte: startOfMonth } }),

    // Patients per doctor, highest first. $lookup fills in the doctor name.
    Patient.aggregate([
      { $group: { _id: '$doctor', patients: { $sum: 1 } } },
      { $sort: { patients: -1, _id: 1 } },
      { $limit: 8 },
      {
        $lookup: {
          from: 'doctors',
          localField: '_id',
          foreignField: '_id',
          as: 'doctor',
        },
      },
      { $unwind: '$doctor' },
      { $project: { _id: 0, doctorId: '$_id', name: '$doctor.name', specialization: '$doctor.specialization', patients: 1 } },
    ]),

    monthlyCount(Doctor, from),
    monthlyCount(Patient, from),

    Patient.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Patient.aggregate([{ $group: { _id: '$gender', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Patient.aggregate([
      { $group: { _id: '$condition', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]),

    Patient.find().sort('-createdAt').limit(5).populate('doctor', 'name specialization').lean(),
  ]);

  res.json({
    success: true,
    data: {
      totals: {
        doctors: doctorCount,
        patients: patientCount,
        newDoctorsThisMonth,
        newPatientsThisMonth,
        avgPatientsPerDoctor: doctorCount ? Math.round((patientCount / doctorCount) * 10) / 10 : 0,
      },
      patientsPerDoctor,
      monthly: mergeMonths(from, doctorRows, patientRows),
      byStatus: byStatus.map((r) => ({ name: r._id, value: r.count })),
      byGender: byGender.map((r) => ({ name: r._id, value: r.count })),
      topConditions: topConditions.map((r) => ({ name: r._id, value: r.count })),
      recentPatients,
    },
  });
});
