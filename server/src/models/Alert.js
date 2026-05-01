import mongoose from 'mongoose';

const routingManifestEntrySchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    hospitalName: String,
    allocatedPatients: Number,
    distanceKm: Number,
    availableBedsBefore: Number,
    availableBedsAfter: Number,
  },
  { _id: false }
);

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['mass_casualty', 'resource_critical', 'system'],
      required: true,
    },
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    affectedRadius: { type: Number, required: true }, // km
    message: { type: String, required: true },
    location: {
      lat: Number,
      lng: Number,
    },
    patientCount: { type: Number, default: 0 },
    routingManifest: { type: [routingManifestEntrySchema], default: [] },
    unallocatedPatients: { type: Number, default: 0 },
    respondedHospitals: [
      {
        hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
        availableCapacity: Number,
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Alert', alertSchema);
