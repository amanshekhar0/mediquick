import express from 'express';
import { pplModel } from '../models/pplModel.js';

const router = express.Router();

//create
router.post('/people', async (req, res) => {
    try {
        const person = new pplModel(req.body);
        await person.save();
        console.log("ok");
        res.status(201).json(person);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get all people
router.get('/people', async (req, res) => {
    try {
        const people = await pplModel.find();
        res.status(200).json(people);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a person by ID
router.get('/people/:id', async (req, res) => {
    try {
        const { id } =rew.params;
        const person = await pplModel.findOne({username : id});
        if (!person) {
            return res.status(404).json({ message: 'Person not found' });
        }
        res.status(200).json(person);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


export default router;
