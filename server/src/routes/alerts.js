import express from 'express';
import Alert from '../models/Alert.js';
import Hospital from '../models/Hospital.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { emitMassCasualtyAlert } from '../socket/index.js';

const router = express.Router();

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Generate a mass-casualty routing manifest.
 *  - Filters hospitals within `radiusKm` of the incident
 *  - Ranks them by composite score (closer + more beds = higher priority)
 *  - Iterates through ranked hospitals, subtracting available beds in memory
 *    until all simulated patients are distributed.
 * Returns { manifest, unallocated }.
 */
const generateRoutingManifest = (hospitals, location, radiusKm, patientCount) => {
  const candidates = hospitals
    .filter((h) => h.isActive && h.totalBeds > 0)
    .map((h) => ({
      hospital: h,
      distance: haversineKm(location.lat, location.lng, h.location.lat, h.location.lng),
      remainingBeds: h.availableBeds,
    }))
    .filter((c) => c.distance <= radiusKm);

  const maxDist = Math.max(...candidates.map((c) => c.distance), 1);

  candidates.sort((a, b) => {
    const scoreA = (1 - a.distance / maxDist) * 0.5 + (a.remainingBeds / Math.max(a.hospital.totalBeds, 1)) * 0.5;
    const scoreB = (1 - b.distance / maxDist) * 0.5 + (b.remainingBeds / Math.max(b.hospital.totalBeds, 1)) * 0.5;
    return scoreB - scoreA;
  });

  let remaining = patientCount;
  const manifest = [];
  for (const c of candidates) {
    if (remaining <= 0) break;
    const allocate = Math.min(c.remainingBeds, remaining);
    if (allocate <= 0) continue;
    manifest.push({
      hospitalId: c.hospital._id,
      hospitalName: c.hospital.name,
      allocatedPatients: allocate,
      distanceKm: Math.round(c.distance * 10) / 10,
      availableBedsBefore: c.remainingBeds,
      availableBedsAfter: c.remainingBeds - allocate,
    });
    remaining -= allocate;
  }

  return { manifest, unallocated: remaining };
};

// POST /api/alerts  (system_admin only)
router.post('/', authenticate, requireRole('system_admin'), async (req, res) => {
  try {
    const { type, affectedRadius, message, location, patientCount } = req.body;
    if (!type || !affectedRadius || !message) {
      return res.status(400).json({ message: 'type, affectedRadius, and message are required' });
    }

    const hospitals = await Hospital.find({ isActive: true });

    let routingManifest = [];
    let unallocated = 0;
    if (type === 'mass_casualty' && location?.lat && location?.lng && patientCount > 0) {
      const result = generateRoutingManifest(hospitals, location, Number(affectedRadius), Number(patientCount));
      routingManifest = result.manifest;
      unallocated = result.unallocated;
    }

    const respondedHospitals = hospitals.map((h) => ({
      hospitalId: h._id,
      availableCapacity: h.availableBeds,
    }));

    const alert = await Alert.create({
      type,
      triggeredBy: req.user._id,
      affectedRadius,
      message,
      location: location || undefined,
      patientCount: patientCount || 0,
      routingManifest,
      unallocatedPatients: unallocated,
      respondedHospitals,
    });

    emitMassCasualtyAlert({
      alertId: alert._id,
      message,
      type,
      location: alert.location,
      patientCount: alert.patientCount,
      routingManifest,
      unallocatedPatients: unallocated,
      affectedHospitals: respondedHospitals,
      createdAt: alert.createdAt,
    });

    res.status(201).json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/alerts/active
router.get('/active', authenticate, async (req, res) => {
  try {
    const alerts = await Alert.find({ isActive: true })
      .populate('triggeredBy', 'name email')
      .populate('routingManifest.hospitalId', 'name location')
      .sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/alerts/:id  (system_admin — deactivate)
router.delete('/:id', authenticate, requireRole('system_admin'), async (req, res) => {
  try {
    await Alert.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Alert deactivated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
