import express from 'express';
import Ambulance from '../models/Ambulance.js';
import Patient from '../models/Patient.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { emitAmbulanceLocation } from '../socket/index.js';

const router = express.Router();

// GET /api/ambulance
router.get('/', authenticate, async (req, res) => {
  try {
    // Plain docs avoid populate failures from orphaned refs (dashboards only need counts/status).
    const ambulances = await Ambulance.find().lean();
    res.json(ambulances);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/ambulance/dispatch  (hospital_admin or system_admin)
router.post('/dispatch', authenticate, requireRole('hospital_admin', 'system_admin'), async (req, res) => {
  try {
    const { ambulanceId, patientId, hospitalId } = req.body;
    const ambulance = await Ambulance.findById(ambulanceId);
    if (!ambulance) return res.status(404).json({ message: 'Ambulance not found' });
    if (ambulance.status !== 'available') {
      return res.status(400).json({ message: 'Ambulance is not available' });
    }

    ambulance.status = 'dispatched';
    ambulance.assignedPatient = patientId;
    ambulance.assignedHospital = hospitalId;
    ambulance.eta = Math.floor(Math.random() * 20) + 5; // simulate 5-25 min ETA
    await ambulance.save();

    await Patient.findByIdAndUpdate(patientId, {
      ambulanceId,
      assignedHospital: hospitalId,
      status: 'dispatched',
    });

    res.json(ambulance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/ambulance/:id/location  (any authenticated user — driver updates GPS)
router.put('/:id/location', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const ambulance = await Ambulance.findByIdAndUpdate(
      req.params.id,
      { currentLocation: { lat, lng } },
      { new: true }
    );
    if (!ambulance) return res.status(404).json({ message: 'Ambulance not found' });

    if (ambulance.assignedPatient) {
      emitAmbulanceLocation(ambulance.assignedPatient.toString(), {
        ambulanceId: ambulance._id,
        lat,
        lng,
        eta: ambulance.eta,
        vehicleNumber: ambulance.vehicleNumber,
      });
    }

    res.json({ message: 'Location updated', location: { lat, lng } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
