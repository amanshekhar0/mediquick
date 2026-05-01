import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { parseHospitalIdInput } from '../util/objectId.js';

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const sanitize = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  hospitalId: user.hospitalId,
  cprCertified: user.cprCertified,
  location: user.location,
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, hospitalId, cprCertified } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, and password are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const normalizedHospitalId = parseHospitalIdInput(hospitalId);
    const hadHospitalRaw =
      hospitalId !== undefined &&
      hospitalId !== null &&
      String(hospitalId).trim() !== '';
    if (hadHospitalRaw && !normalizedHospitalId) {
      return res.status(400).json({
        message:
          'Invalid hospital ID. Choose a facility from the list, or paste only the 24-character ID (not JSON).',
      });
    }

    const user = await User.create({
      name, email, password, role,
      hospitalId: normalizedHospitalId || null,
      cprCertified: !!cprCertified,
    });
    const token = signToken(user);
    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = signToken(user);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/location — used by volunteers + paramedics to update GPS
router.put('/location', authenticate, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ message: 'lat and lng (numbers) are required' });
    }
    req.user.location = { type: 'Point', coordinates: [lng, lat] };
    req.user.lastSeenAt = new Date();
    await req.user.save();
    res.json({ message: 'Location updated', user: sanitize(req.user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
