import express from 'express';
import { hospitalModel } from '../models/hospitalModel.js';
import { pplModel } from '../models/pplModel.js';

const router = express.Router();

// Login for Hospital
router.post('/login/hospital', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log(username,password);
        
        const hospital = await hospitalModel.findOne({ username });
        if (!hospital) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (hospital.password !== password) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        console.log(hospital._id);
        res.status(200).json({ message: 'Login successful', hospital });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.post('/login/people', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log(username,password);
        const person = await pplModel.findOne({ username });
        if (!person) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        
        if (person.password !== password) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        console.log(person);
        res.status(200).json({ message: 'Login successful', person });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
