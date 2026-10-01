/**
 * Fills the database with a demo admin, doctors and patients spread over the
 * last 12 months so the dashboard charts have something to show.
 *
 * Run with:  npm run seed
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { config } from '../config/index.js';
import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { User } from '../models/User.js';

const DOCTORS = [
  ['Dr. Aisha Rahman', 'Cardiology', 'City General Hospital'],
  ['Dr. Rohan Mehta', 'Neurology', 'Sunrise Medical Centre'],
  ['Dr. Fatima Noor', 'Pediatrics', "St. Mary's Hospital"],
  ['Dr. Arjun Patel', 'Orthopedics', 'Apollo Clinic'],
  ['Dr. Sara Iqbal', 'Dermatology', 'City General Hospital'],
  ['Dr. Imran Khan', 'ENT', 'Sunrise Medical Centre'],
  ['Dr. Leena Gupta', 'Gynecology', 'Apollo Clinic'],
  ['Dr. Vikram Singh', 'Cardiology', 'Fortis Medical Centre'],
  ['Dr. Priya Desai', 'Ophthalmology', 'Sunrise Medical Centre'],
  ['Dr. Rahul Bose', 'Pulmonology', 'City General Hospital'],
  ['Dr. Nadia Farooq', 'Neurology', 'Fortis Medical Centre'],
  ['Dr. Tom Wilson', 'General Medicine', 'Apollo Clinic'],
];

const FIRST_NAMES = ['Amina', 'Ravi', 'Sana', 'Imran', 'Kavya', 'Daniel', 'Mariam', 'Arun', 'Zoya', 'Peter', 'Hina', 'Omar', 'Nisha', 'Lucas', 'Farah', 'Rohit'];
const LAST_NAMES = ['Khan', 'Sharma', 'Ali', 'Ibrahim', 'Nair', 'Smith', 'Yusuf', 'Verma', 'Hussain', 'Brown', 'Siddiqui', 'Das'];
const CONDITIONS = ['Hypertension', 'Migraine', 'Asthma', 'Diabetes', 'Arthritis', 'Anaemia', 'Fever', 'Allergy', 'Acne', 'Bronchitis'];
const HOSPITALS = [...new Set(DOCTORS.map((d) => d[2]))];
const GENDERS = ['male', 'female', 'other'];
const STATUSES = ['active', 'recovered', 'critical'];

/** Random integer between min and max (inclusive). */
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[rand(0, list.length - 1)];

/** A date at a random point inside the last `days` days. */
function randomPastDate(days) {
  const date = new Date();
  date.setDate(date.getDate() - rand(0, days));
  date.setHours(rand(9, 18), rand(0, 59), 0, 0);
  return date;
}

/** About a third of the records land in the last 45 days so "this month" cards are not always zero. */
function realisticDate(days) {
  return Math.random() < 0.35 ? randomPastDate(45) : randomPastDate(days);
}

async function seed() {
  await connectDB(config.mongoUri);
  console.log('Clearing old data...');
  await Promise.all([User.deleteMany({}), Doctor.deleteMany({}), Patient.deleteMany({})]);

  const admin = await User.create({
    name: 'Admin',
    email: 'admin@doctortracker.dev',
    password: await User.hashPassword('Admin@123'),
    role: 'admin',
  });
  console.log(`Admin created -> ${admin.email} / Admin@123`);

  const doctors = await Doctor.create(
    DOCTORS.map(([name, specialization, hospital], index) => ({
      name,
      specialization,
      hospital,
      phone: `+91 9${rand(100000000, 999999999)}`,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@cityhospital.org`,
      // Stagger creation dates so the "new doctors per month" chart is realistic.
      createdAt: realisticDate(360 - index * 12),
      updatedAt: new Date(),
    }))
  );
  console.log(`Doctors created -> ${doctors.length}`);

  const patients = [];
  for (let i = 0; i < 120; i += 1) {
    const doctor = pick(doctors);
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const visitDate = realisticDate(360);
    patients.push({
      doctor: doctor._id,
      name: `${first} ${last}`,
      age: rand(1, 85),
      gender: pick(GENDERS),
      phone: `+91 8${rand(100000000, 999999999)}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${rand(1, 99)}@mail.com`,
      condition: pick(CONDITIONS),
      status: pick(STATUSES),
      visitDate,
      notes: '',
      createdAt: visitDate,
      updatedAt: visitDate,
    });
  }
  await Patient.insertMany(patients);
  console.log(`Patients created -> ${patients.length}`);

  console.log('\nHospitals in data:', HOSPITALS.join(', '));
  console.log('Seed finished.');
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
