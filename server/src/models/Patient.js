import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    symptoms: { type: String, required: true },
    triageResult: {
      urgency: { type: String, enum: ['critical', 'moderate', 'minor'] },
      suspectedCondition: String,
      recommendedFacilityType: {
        type: String,
        enum: ['icu_specialist', 'trauma', 'general'],
      },
      reasoning: String,
      immediateActions: [String],
    },
    assignedHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    ambulanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance' },
    status: {
      type: String,
      enum: ['triaged', 'dispatched', 'admitted', 'discharged'],
      default: 'triaged',
    },
    patientLocation: {
      lat: Number,
      lng: Number,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Patient', patientSchema);
