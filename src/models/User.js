import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin'], default: 'admin' },
  },
  { timestamps: true }
);

userSchema.methods.verifyPassword = function verifyPassword(plainText) {
  return bcrypt.compare(plainText, this.password);
};

userSchema.statics.hashPassword = function hashPassword(plainText) {
  return bcrypt.hash(plainText, 10);
};

export const User = mongoose.model('User', userSchema);
