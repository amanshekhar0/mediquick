import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['patient', 'hospital_admin', 'system_admin', 'volunteer', 'paramedic'],
      default: 'patient',
    },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', default: null },

    // GeoJSON location for $near queries (used by volunteer dispatch + paramedic GPS)
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
    },

    // Volunteer-specific
    cprCertified: { type: Boolean, default: false },

    // Last GPS update timestamp
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// 2dsphere index enables $near geospatial queries on the `location` field.
// It will silently ignore documents that don't have a location set.
userSchema.index({ location: '2dsphere' });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model('User', userSchema);
