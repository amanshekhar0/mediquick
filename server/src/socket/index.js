import { Server } from 'socket.io';

let io;

export const initSocket = (httpServer, opts = {}) => {
  const { isDev = process.env.NODE_ENV !== 'production', clientOrigins } = opts;
  const list =
    clientOrigins?.length > 0
      ? clientOrigins
      : (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
  io = new Server(httpServer, {
    cors: {
      origin: isDev ? true : list.length === 1 ? list[0] : list,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Patient room — receives ambulance GPS updates
    socket.on('patient:join_room', (patientId) => {
      socket.join(`patient:${patientId}`);
      console.log(`[Socket] Patient joined room: patient:${patientId}`);
    });

    // Hospital admin room — receives ambulance:vitals + capacity warnings
    socket.on('hospital:join_room', (hospitalId) => {
      socket.join(`hospital:${hospitalId}`);
      console.log(`[Socket] Hospital admin joined room: hospital:${hospitalId}`);
    });

    // Volunteer room — receives volunteer:alert when nearby cardiac/choking emergency
    socket.on('volunteer:join_room', (volunteerId) => {
      socket.join(`volunteer:${volunteerId}`);
      console.log(`[Socket] Volunteer joined room: volunteer:${volunteerId}`);
    });

    // Paramedic streams patient vitals → forwarded to the destination hospital room
    socket.on('ambulance:vitals', (data) => {
      if (data?.hospitalId) {
        io.to(`hospital:${data.hospitalId}`).emit('ambulance:vitals', {
          ...data,
          timestamp: Date.now(),
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

export const emitHospitalUpdate = (hospitalData) => {
  if (!io) return;
  const occupancy = ((hospitalData.totalBeds - hospitalData.availableBeds) / hospitalData.totalBeds) * 100;
  io.emit('hospital:update', {
    hospitalId: hospitalData._id,
    availableBeds: hospitalData.availableBeds,
    icuAvailable: hospitalData.icuAvailable,
    resources: hospitalData.resources,
  });
  if (occupancy >= 90) {
    io.emit('hospital:capacity_warning', {
      hospitalId: hospitalData._id,
      occupancyPercent: Math.round(occupancy),
    });
  }
};

export const emitAmbulanceLocation = (patientId, ambulanceData) => {
  if (!io) return;
  io.to(`patient:${patientId}`).emit('ambulance:location', ambulanceData);
};

export const emitMassCasualtyAlert = (alertData) => {
  if (!io) return;
  io.emit('alert:mass_casualty', alertData);
};

// Notify a single volunteer near an emergency.
// payload: { alertId, patientId, location:{lat,lng}, condition, immediateActions, distance }
export const emitVolunteerAlert = (volunteerId, payload) => {
  if (!io) return;
  io.to(`volunteer:${volunteerId}`).emit('volunteer:alert', payload);
};
