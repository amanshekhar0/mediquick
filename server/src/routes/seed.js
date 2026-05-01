import express from 'express';
import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import Ambulance from '../models/Ambulance.js';
import Patient from '../models/Patient.js';
import Alert from '../models/Alert.js';

const router = express.Router();

/** Staging inventory profiles by facility type — representative SKUs for search and routing demos. */
const inventoryTemplates = {
  icu_specialist: [
    { itemName: 'O+ Blood', quantity: 25, category: 'blood' },
    { itemName: 'O- Blood', quantity: 18, category: 'blood' },
    { itemName: 'A+ Blood', quantity: 22, category: 'blood' },
    { itemName: 'B+ Blood', quantity: 20, category: 'blood' },
    { itemName: 'AB- Blood', quantity: 6, category: 'blood' },
    { itemName: 'Ventilator', quantity: 30, category: 'equipment' },
    { itemName: 'Defibrillator', quantity: 12, category: 'equipment' },
    { itemName: 'Oxygen Cylinder', quantity: 80, category: 'equipment' },
    { itemName: 'Adrenaline (Epinephrine)', quantity: 60, category: 'medication' },
    { itemName: 'Insulin', quantity: 100, category: 'medication' },
    { itemName: 'Naloxone', quantity: 25, category: 'medication' },
  ],
  trauma: [
    { itemName: 'O+ Blood', quantity: 35, category: 'blood' },
    { itemName: 'O- Blood', quantity: 22, category: 'blood' },
    { itemName: 'AB+ Blood', quantity: 14, category: 'blood' },
    { itemName: 'Snake Antivenom', quantity: 8, category: 'antivenom' },
    { itemName: 'Tetanus Vaccine', quantity: 60, category: 'vaccine' },
    { itemName: 'Rabies Vaccine', quantity: 35, category: 'vaccine' },
    { itemName: 'Defibrillator', quantity: 8, category: 'equipment' },
    { itemName: 'Oxygen Cylinder', quantity: 65, category: 'equipment' },
    { itemName: 'Adrenaline (Epinephrine)', quantity: 40, category: 'medication' },
  ],
  general: [
    { itemName: 'O+ Blood', quantity: 15, category: 'blood' },
    { itemName: 'A+ Blood', quantity: 12, category: 'blood' },
    { itemName: 'Tetanus Vaccine', quantity: 45, category: 'vaccine' },
    { itemName: 'Rabies Vaccine', quantity: 18, category: 'vaccine' },
    { itemName: 'Insulin', quantity: 80, category: 'medication' },
    { itemName: 'Oxygen Cylinder', quantity: 30, category: 'equipment' },
    { itemName: 'Ventilator', quantity: 8, category: 'equipment' },
  ],
};

/**
 * Fictitious facilities for non-production staging only.
 * Coordinates are spaced for map and routing demos; they do not represent real sites.
 */
const STAGING_FACILITIES = [
  {
    name: 'Aurora Metropolitan Medical Center',
    location: { lat: 12.9698, lng: 77.75, address: '1200 Clinical Drive, Northeast Metro' },
    type: 'icu_specialist',
    totalBeds: 600, availableBeds: 120, icuTotal: 80, icuAvailable: 18,
    resources: { oxygen: true, bloodBank: true, ventilators: 40 },
    specializations: ['Cardiology', 'Neurology', 'Critical Care'],
  },
  {
    name: 'Northside Trauma & Emergency Center',
    location: { lat: 12.8739, lng: 77.5971, address: '88 Emergency Way, South Metro' },
    type: 'trauma',
    totalBeds: 400, availableBeds: 85, icuTotal: 50, icuAvailable: 12,
    resources: { oxygen: true, bloodBank: true, ventilators: 25 },
    specializations: ['Trauma', 'Orthopedics', 'Emergency Medicine'],
  },
  {
    name: 'Riverside Advanced Care Hospital',
    location: { lat: 12.8921, lng: 77.6412, address: '4500 Riverfront Boulevard, Southeast Metro' },
    type: 'icu_specialist',
    totalBeds: 1000, availableBeds: 200, icuTotal: 150, icuAvailable: 30,
    resources: { oxygen: true, bloodBank: true, ventilators: 80 },
    specializations: ['Cardiac Surgery', 'Pediatrics', 'Nephrology', 'ICU'],
  },
  {
    name: 'Lakewood Community Hospital',
    location: { lat: 12.8851, lng: 77.6012, address: '300 Wellness Lane, South Metro' },
    type: 'general',
    totalBeds: 350, availableBeds: 60, icuTotal: 40, icuAvailable: 8,
    resources: { oxygen: true, bloodBank: false, ventilators: 15 },
    specializations: ['General Medicine', 'ENT', 'Dermatology'],
  },
  {
    name: 'Central District Emergency Hospital',
    location: { lat: 12.9662, lng: 77.5729, address: '1 Civic Health Plaza, Central Metro' },
    type: 'trauma',
    totalBeds: 800, availableBeds: 180, icuTotal: 60, icuAvailable: 20,
    resources: { oxygen: true, bloodBank: true, ventilators: 35 },
    specializations: ['Emergency Trauma', 'Burns', 'General Surgery'],
  },
  {
    name: 'Harbor View Medical Pavilion',
    location: { lat: 12.9343, lng: 77.6196, address: '2200 Harbor Road, East Metro' },
    type: 'general',
    totalBeds: 1200, availableBeds: 240, icuTotal: 100, icuAvailable: 25,
    resources: { oxygen: true, bloodBank: true, ventilators: 50 },
    specializations: ['General Medicine', 'Obstetrics', 'Psychiatry', 'Neurology'],
  },
  {
    name: 'Summit Neurosciences Institute',
    location: { lat: 12.9576, lng: 77.6965, address: '900 Summit Court, East Metro' },
    type: 'icu_specialist',
    totalBeds: 300, availableBeds: 45, icuTotal: 60, icuAvailable: 10,
    resources: { oxygen: true, bloodBank: true, ventilators: 30 },
    specializations: ['Neurosurgery', 'Spine Surgery', 'ICU'],
  },
  {
    name: 'Meridian Multispecialty Hospital',
    location: { lat: 13.0475, lng: 77.5954, address: '6400 Meridian Avenue, North Metro' },
    type: 'trauma',
    totalBeds: 500, availableBeds: 90, icuTotal: 70, icuAvailable: 15,
    resources: { oxygen: true, bloodBank: true, ventilators: 35 },
    specializations: ['Trauma', 'Cardiology', 'Transplant Surgery'],
  },
  {
    name: 'Cedar Grove Orthopedic & Trauma',
    location: { lat: 12.9825, lng: 77.5918, address: '15 Cedar Grove Street Central Metro' },
    type: 'trauma',
    totalBeds: 200, availableBeds: 35, icuTotal: 30, icuAvailable: 6,
    resources: { oxygen: true, bloodBank: false, ventilators: 12 },
    specializations: ['Sports Medicine', 'Orthopedics', 'Trauma'],
  },
  {
    name: 'Lakeside Behavioral & Neurology Center',
    location: { lat: 12.9416, lng: 77.5958, address: '400 Lakeside Boulevard, South Central Metro' },
    type: 'icu_specialist',
    totalBeds: 700, availableBeds: 150, icuTotal: 80, icuAvailable: 22,
    resources: { oxygen: true, bloodBank: true, ventilators: 45 },
    specializations: ['Neurology', 'Psychiatry', 'Neurosurgery'],
  },
];

// GET /api/seed  (dev / staging only)
router.get('/', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Seeding not allowed in production' });
  }

  try {
    await Promise.all([
      Hospital.deleteMany({}),
      User.deleteMany({}),
      Ambulance.deleteMany({}),
      Patient.deleteMany({}),
      Alert.deleteMany({}),
    ]);

    try {
      await User.collection.dropIndexes();
    } catch {
      /* noop */
    }
    await User.syncIndexes();

    const now = Date.now();
    const baseOccupancy = (h) =>
      Math.round(((h.totalBeds - h.availableBeds) / h.totalBeds) * 100);

    const hospitalsWithExtras = STAGING_FACILITIES.map((h) => ({
      ...h,
      inventory: (inventoryTemplates[h.type] || []).map((item) => ({ ...item, updatedAt: new Date() })),
      occupancyHistory: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(now - (23 - i) * 3600000),
        occupancyPercent: Math.min(100, Math.max(0, baseOccupancy(h) + (i % 5) - 2)),
      })),
    }));

    const hospitals = await Hospital.insertMany(hospitalsWithExtras);

    await User.create({
      name: 'Platform Administrator',
      email: 'admin@mediequip.ai',
      password: 'Admin@1234',
      role: 'system_admin',
    });

    const hospitalAdmins = await Promise.all(
      hospitals.map((h, i) =>
        User.create({
          name: `Operations Lead — ${h.name}`,
          email:
            i === 0
              ? 'hospital.admin@mediequip.ai'
              : `facility.ops.${String(i + 1).padStart(2, '0')}@mediequip.staging`,
          password: 'Hospital@1234',
          role: 'hospital_admin',
          hospitalId: h._id,
        })
      )
    );

    await User.create({
      name: 'Authorized Patient',
      email: 'patient@mediequip.ai',
      password: 'Patient@1234',
      role: 'patient',
    });

    const volunteerSeed = [
      { name: 'First Responder — Field Unit 01', email: 'volunteer1@mediequip.ai', lat: 12.9716, lng: 77.5946 },
      { name: 'First Responder — Field Unit 02', email: 'volunteer2@mediequip.staging', lat: 12.9755, lng: 77.601 },
      { name: 'First Responder — Field Unit 03', email: 'volunteer3@mediequip.staging', lat: 12.97, lng: 77.599 },
      { name: 'First Responder — Field Unit 04', email: 'volunteer4@mediequip.staging', lat: 12.93, lng: 77.62 },
    ];

    await Promise.all(
      volunteerSeed.map((v) =>
        User.create({
          name: v.name,
          email: v.email,
          password: 'Volunteer@1234',
          role: 'volunteer',
          cprCertified: true,
          location: { type: 'Point', coordinates: [v.lng, v.lat] },
          lastSeenAt: new Date(),
        })
      )
    );

    await User.create({
      name: 'EMS Transport Operator',
      email: 'paramedic@mediequip.ai',
      password: 'Paramedic@1234',
      role: 'paramedic',
    });

    const ambulances = await Ambulance.insertMany([
      { vehicleNumber: 'EMS-1001', currentLocation: { lat: 12.9716, lng: 77.5946 }, status: 'available' },
      { vehicleNumber: 'EMS-1002', currentLocation: { lat: 12.9841, lng: 77.6023 }, status: 'available' },
      { vehicleNumber: 'EMS-1003', currentLocation: { lat: 12.9345, lng: 77.6145 }, status: 'available' },
      { vehicleNumber: 'EMS-1004', currentLocation: { lat: 13.0125, lng: 77.5712 }, status: 'available' },
      { vehicleNumber: 'EMS-1005', currentLocation: { lat: 12.8956, lng: 77.6234 }, status: 'available' },
    ]);

    const userCount =
      1 + // system admin
      hospitalAdmins.length +
      1 + // patient
      volunteerSeed.length +
      1; // paramedic

    res.json({
      message: 'Staging database initialized',
      counts: {
        hospitals: hospitals.length,
        users: userCount,
        ambulances: ambulances.length,
        inventoryItemsTotal: hospitals.reduce((acc, h) => acc + (h.inventory?.length || 0), 0),
      },
      credentials: {
        systemAdmin: { email: 'admin@mediequip.ai', password: 'Admin@1234' },
        patient: { email: 'patient@mediequip.ai', password: 'Patient@1234' },
        hospitalAdmin: { email: 'hospital.admin@mediequip.ai', password: 'Hospital@1234' },
        volunteer: { email: 'volunteer1@mediequip.ai', password: 'Volunteer@1234' },
        paramedic: { email: 'paramedic@mediequip.ai', password: 'Paramedic@1234' },
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
