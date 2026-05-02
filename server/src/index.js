import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import { initSocket } from './socket/index.js';

import authRoutes from './routes/auth.js';
import hospitalRoutes from './routes/hospitals.js';
import triageRoutes from './routes/triage.js';
import ambulanceRoutes from './routes/ambulance.js';
import alertRoutes from './routes/alerts.js';
import seedRoutes from './routes/seed.js';

const app = express();
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
const server = http.createServer(app);

const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const isDev = process.env.NODE_ENV !== 'production';
const allowCorsOrigin = (origin) => {
  if (!origin) return true;
  if (clientOrigins.includes(origin)) return true;
  if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
};

// Initialize Socket.io
initSocket(server, { isDev, clientOrigins });

// Middleware — in dev, any localhost Vite port (e.g. 5174) is allowed; set CLIENT_ORIGIN in production
app.use(
  cors({
    origin: (origin, callback) => callback(null, allowCorsOrigin(origin)),
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/ambulance', ambulanceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/seed', seedRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
if (!process.env.MONGODB_URI?.trim()) {
  console.error('[DB] MONGODB_URI is missing. Add it in Render → Environment (or your .env locally).');
  process.exit(1);
}
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('[DB] Connected to MongoDB');
    server.listen(PORT, '0.0.0.0', () => console.log(`[Server] MediEquip 2.0 running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });
