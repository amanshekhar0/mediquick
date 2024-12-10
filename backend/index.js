import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import hospitalRoutes from './src/routes/hospitalRoutes.js';
import pplRoutes from './src/routes/pplRoutes.js';
import servicesRoutes from './src/routes/servicesRoutes.js';
import authRoutes from './src/routes/authRoutes.js'
import dbconnect from './src/models/db.js';
import cors from 'cors';

import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Database
dbconnect();

app.use('/api', hospitalRoutes);
app.use('/api', pplRoutes);
app.use('/api', servicesRoutes);
app.use('/api', authRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to the Hospital Management API');
});

const PORT = 8080;
app.listen(process.env.PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});
