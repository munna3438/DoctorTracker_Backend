import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    specialization: { type: String, required: [true, 'Specialization is required'], trim: true, maxlength: 60 },
    hospital: { type: String, required: [true, 'Hospital is required'], trim: true, maxlength: 80 },
    phone: { type: String, required: [true, 'Phone is required'], trim: true, maxlength: 20 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: 80,
    },
    // Lowercase copy of every searchable value, so search runs one regex on one indexed field.
    searchText: { type: String, default: '', select: false },
  },
  { timestamps: true }
);

// Every value the user can search by, in one lowercase string.
function searchValues(doctor) {
  return [doctor.name, doctor.specialization, doctor.hospital, doctor.email, doctor.phone]
    .join(' ')
    .toLowerCase();
}

doctorSchema.pre('save', function () {
  this.searchText = searchValues(this);
});
// Bulk inserts skip save hooks, so the same field is filled here.
doctorSchema.pre('insertMany', (docs) => {
  for (const doc of docs) doc.searchText = searchValues(doc);
});

// Supports the list screen: filter by specialization/hospital while sorting by date,
// plus sorting the whole list by name.
doctorSchema.index({ name: 1 });
doctorSchema.index({ specialization: 1, createdAt: -1 });
doctorSchema.index({ hospital: 1 });
doctorSchema.index({ searchText: 1 });
doctorSchema.index({ createdAt: -1 });

export const Doctor = mongoose.model('Doctor', doctorSchema);
