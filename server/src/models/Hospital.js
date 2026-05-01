import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 0, min: 0 },
    category: {
      type: String,
      enum: ['blood', 'vaccine', 'medication', 'equipment', 'antivenom', 'other'],
      default: 'other',
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, required: true },
    },
    type: {
      type: String,
      enum: ['general', 'trauma', 'icu_specialist'],
      required: true,
    },
    totalBeds: { type: Number, required: true },
    availableBeds: { type: Number, required: true },
    icuTotal: { type: Number, required: true },
    icuAvailable: { type: Number, required: true },
    resources: {
      oxygen: { type: Boolean, default: true },
      bloodBank: { type: Boolean, default: true },
      ventilators: { type: Number, default: 0 },
    },
    inventory: { type: [inventoryItemSchema], default: [] },
    specializations: [{ type: String }],
    isActive: { type: Boolean, default: true },
    lastUpdated: { type: Date, default: Date.now },
    occupancyHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        occupancyPercent: { type: Number },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Hospital', hospitalSchema);
