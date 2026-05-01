import mongoose from 'mongoose';

const ambulanceSchema = new mongoose.Schema(
  {
    vehicleNumber: { type: String, required: true, unique: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    currentLocation: {
      lat: { type: Number, default: 12.9716 },
      lng: { type: Number, default: 77.5946 },
    },
    status: {
      type: String,
      enum: ['available', 'dispatched', 'returning'],
      default: 'available',
    },
    assignedPatient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    assignedHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    eta: { type: Number }, // minutes
  },
  { timestamps: true }
);

export default mongoose.model('Ambulance', ambulanceSchema);
