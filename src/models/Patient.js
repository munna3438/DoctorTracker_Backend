import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor is required'],
      index: true,
    },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    age: { type: Number, required: [true, 'Age is required'], min: 0, max: 120 },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    phone: { type: String, required: [true, 'Phone is required'], trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 80, default: '' },
    condition: { type: String, required: [true, 'Condition is required'], trim: true, maxlength: 80 },
    status: { type: String, enum: ['active', 'recovered', 'critical'], default: 'active' },
    visitDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
    searchText: { type: String, default: '', select: false },
  },
  { timestamps: true }
);

// Every value the user can search by, in one lowercase string.
function searchValues(patient) {
  return [patient.name, patient.condition, patient.phone, patient.email, patient.status]
    .join(' ')
    .toLowerCase();
}

patientSchema.pre('save', function () {
  this.searchText = searchValues(this);
});
// Bulk inserts skip save hooks, so the same field is filled here.
patientSchema.pre('insertMany', (docs) => {
  for (const doc of docs) doc.searchText = searchValues(doc);
});

// "patients of one doctor, newest first" is the most frequent query in the app.
patientSchema.index({ doctor: 1, createdAt: -1 });
patientSchema.index({ doctor: 1, visitDate: -1 });
// One compound index per filterable field, each ending in the sort field so
// filtering and ordering are served by the same index.
patientSchema.index({ condition: 1, visitDate: -1 });
patientSchema.index({ status: 1, visitDate: -1 });
patientSchema.index({ gender: 1, visitDate: -1 });
patientSchema.index({ age: 1, visitDate: -1 });
patientSchema.index({ searchText: 1 });
patientSchema.index({ createdAt: -1 });

export const Patient = mongoose.model('Patient', patientSchema);
