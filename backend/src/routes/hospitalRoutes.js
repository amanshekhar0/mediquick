import express from 'express';
import { hospitalModel } from '../models/hospitalModel.js';

const router = express.Router();

// Create a new hospital
router.post('/hospitals', async (req, res) => {
    try {
        const hospital = new hospitalModel(req.body);
        await hospital.save();
        console.log("ok");
        res.status(201).json(hospital);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all hospitals
router.get('/hospitals', async (req, res) => {
    try {
        const hospitals = await hospitalModel.find();
        res.status(200).json(hospitals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a hospital by ID
router.get('/hospitals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const hospital = await hospitalModel.findOne({ username : id });
        console.log(id,hospital);
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }
        res.status(200).json(hospital);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



export default router;
