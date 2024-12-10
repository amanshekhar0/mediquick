import express from 'express';
import { servicesModel } from '../models/servicesModel.js';
import mongoose from 'mongoose';

const router = express.Router();

// Create
router.post('/services', async (req, res) => {
    try {
        const { username, name, quantity, price, picture, category } = req.body;
        console.log("Request body:", req.body);  

        
        if (!mongoose.Types.ObjectId.isValid(username)) {
            return res.status(400).json({ message: "Invalid username ID" });
        }

        
        const service = new servicesModel({
            name,
            quantity,
            price,
            picture,
            category,
            username: new mongoose.Types.ObjectId(username), 
        });

        
        await service.save();

        res.status(201).json(service);
    } catch (error) {
        console.error("Error:", error);
        res.status(400).json({ message: error.message });
    }
});


// Get all services
router.get('/services', async (req, res) => {
    try {
        
        const services = await servicesModel
            .find()
            .populate({
                path: 'username',
                model: 'hospitalModel',
                select: 'username email address contact name pincode' 
            })
            

        res.status(200).json(services);
        console.log("Services fetched successfully:", services.length);
        // console.log(services);
    } catch (error) {
        console.error("Error fetching services:", error.message);
        res.status(500).json({ message: error.message });
    }
});


// Get a service by ID
router.get('/services/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const Id=new mongoose.Types.ObjectId(id);
        console.log(id,Id);
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid username ID" });
        }
        const service = await servicesModel.find({ username: Id }).populate({
            path: 'username', 
            model: 'hospitalModel', 
            select: 'username email address contact name pincode' 
        });
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }
        console.log(service);
        res.status(200).json(service);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a service
router.put('/services/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;
        console.log(id, quantity);
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid service ID" });
        }

        if (quantity === undefined || typeof quantity !== 'number' || quantity < 0) {
            return res.status(400).json({ message: "Invalid or missing 'quantity' field. It must be a non-negative number." });
        }

        const updatedService = await servicesModel.findByIdAndUpdate(
            id,
            { $set: { quantity } },
            { new: true } 
        );

        if (!updatedService) {
            return res.status(404).json({ message: 'Service not found' });
        }
        console.log("ok");
        res.status(200).json(updatedService);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.put('/services/booking/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error("Invalid service ID:", id);
            return res.status(400).json({ message: "Invalid service ID" });
        }

        const service = await servicesModel.findById(id);

        if (!service) {
            console.error("Service not found for ID:", id);
            return res.status(404).json({ message: "Service not found" });
        }

        if (service.quantity <= 0) {
            console.error("Insufficient quantity for service ID:", id);
            return res.status(400).json({ message: "Insufficient quantity available." });
        }

        service.quantity -= 1;

        const updatedService = await service.save();

        console.log("Service booked successfully:", updatedService);
        res.status(200).json(updatedService);
    } catch (error) {
        console.error("Error booking service:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


export default router;
