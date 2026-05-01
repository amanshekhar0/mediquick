import express from 'express';
import Hospital from '../models/Hospital.js';
import { authenticate, requireRole, requireOwnHospital } from '../middleware/auth.js';
import { emitHospitalUpdate } from '../socket/index.js';
import { cacheHospital, invalidateHospital } from '../socket/redis.js';

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

const hospitalHasResource = (hospital, resourceQuery) => {
  if (!resourceQuery) return false;
  const q = resourceQuery.toLowerCase();
  return (hospital.inventory || []).some(
    (item) => item.itemName?.toLowerCase().includes(q) && item.quantity > 0
  );
};

// ── GET /api/hospitals — All hospitals (omit history) ─────────────────
router.get('/', async (req, res) => {
  try {
    const hospitals = await Hospital.find({ isActive: true }).select('-occupancyHistory');
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/hospitals/search?resource=O- Blood ───────────────────────
// Case-insensitive substring match against inventory.itemName
router.get('/search', async (req, res) => {
  try {
    const { resource } = req.query;
    if (!resource || !resource.trim()) {
      return res.status(400).json({ message: 'resource query parameter is required' });
    }

    const safe = resource.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hospitals = await Hospital.find({
      isActive: true,
      inventory: {
        $elemMatch: {
          itemName: { $regex: safe, $options: 'i' },
          quantity: { $gt: 0 },
        },
      },
    }).select('-occupancyHistory');

    // Annotate matching item details for the UI
    const enriched = hospitals.map((h) => {
      const matchingItem = h.inventory.find(
        (i) => i.itemName.toLowerCase().includes(resource.toLowerCase()) && i.quantity > 0
      );
      return { ...h.toObject(), matchedItem: matchingItem };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/hospitals/recommend ──────────────────────────────────────
// Now supports an optional `resource` query — when set, hospitals stocking
// that resource get a massive priority boost (replaces facility-type score).
router.get('/recommend', async (req, res) => {
  try {
    const { lat, lng, facilityType, urgency, resource } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng are required' });

    const hospitals = await Hospital.find({ isActive: true });
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    const distances = hospitals.map((h) => haversineKm(userLat, userLng, h.location.lat, h.location.lng));
    const maxDist = Math.max(...distances, 1);

    const scored = hospitals.map((h, i) => {
      const distScore = (1 - distances[i] / maxDist) * 0.4;
      const bedScore = h.totalBeds > 0 ? (h.availableBeds / h.totalBeds) * 0.4 : 0;

      // If a specific resource was requested, give a *massive* multiplier
      // to hospitals that have it in stock — they jump to the top.
      let specScore;
      let resourceMatch = false;
      if (resource && resource.trim()) {
        resourceMatch = hospitalHasResource(h, resource);
        specScore = resourceMatch ? 5 : 0; // overrides everything else
      } else {
        const specMatch =
          facilityType && h.type === facilityType
            ? 1
            : urgency === 'critical' && h.type === 'icu_specialist'
            ? 0.8
            : 0;
        specScore = specMatch * 0.2;
      }

      return {
        hospital: h,
        distance: Math.round(distances[i] * 10) / 10,
        score: distScore + bedScore + specScore,
        resourceMatch,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const top3 = scored.slice(0, 3).map(({ hospital, distance, score, resourceMatch }) => ({
      ...hospital.toObject(),
      distance,
      score: Math.round(score * 100) / 100,
      resourceMatch,
    }));

    res.json(top3);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/hospitals/:id ────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/hospitals/:id/resources ──────────────────────────────────
router.put(
  '/:id/resources',
  authenticate,
  requireRole('hospital_admin', 'system_admin'),
  requireOwnHospital(),
  async (req, res) => {
  try {
    const { availableBeds, icuAvailable, resources } = req.body;
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    if (availableBeds !== undefined) hospital.availableBeds = availableBeds;
    if (icuAvailable !== undefined) hospital.icuAvailable = icuAvailable;
    if (resources) hospital.resources = { ...hospital.resources, ...resources };
    hospital.lastUpdated = new Date();

    const occupancy = ((hospital.totalBeds - hospital.availableBeds) / hospital.totalBeds) * 100;
    hospital.occupancyHistory.push({ timestamp: new Date(), occupancyPercent: Math.round(occupancy) });
    if (hospital.occupancyHistory.length > 288) hospital.occupancyHistory.shift();

    await hospital.save();
    await invalidateHospital(hospital._id.toString());
    await cacheHospital(hospital._id.toString(), hospital.toObject());

    emitHospitalUpdate(hospital);
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── INVENTORY CRUD ────────────────────────────────────────────────────

// POST /api/hospitals/:id/inventory — add a new inventory item
router.post(
  '/:id/inventory',
  authenticate,
  requireRole('hospital_admin', 'system_admin'),
  requireOwnHospital(),
  async (req, res) => {
  try {
    const { itemName, quantity, category } = req.body;
    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ message: 'itemName is required' });
    }

    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    hospital.inventory.push({
      itemName: itemName.trim(),
      quantity: Number(quantity) || 0,
      category: category || 'other',
      updatedAt: new Date(),
    });
    await hospital.save();

    res.status(201).json(hospital.inventory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/hospitals/:id/inventory/:itemId — update a single item
router.put(
  '/:id/inventory/:itemId',
  authenticate,
  requireRole('hospital_admin', 'system_admin'),
  requireOwnHospital(),
  async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const item = hospital.inventory.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Inventory item not found' });

    const { itemName, quantity, category } = req.body;
    if (itemName !== undefined) item.itemName = itemName.trim();
    if (quantity !== undefined) item.quantity = Number(quantity);
    if (category !== undefined) item.category = category;
    item.updatedAt = new Date();

    await hospital.save();
    res.json(hospital.inventory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/hospitals/:id/inventory/:itemId — remove a single item
router.delete(
  '/:id/inventory/:itemId',
  authenticate,
  requireRole('hospital_admin', 'system_admin'),
  requireOwnHospital(),
  async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const item = hospital.inventory.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Inventory item not found' });

    item.deleteOne();
    await hospital.save();
    res.json(hospital.inventory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
