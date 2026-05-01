import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient role' });
  }
  next();
};

/** Hospital admins may only modify their own facility (param name on route, default `id`). */
export const requireOwnHospital = (param = 'id') => (req, res, next) => {
  if (req.user?.role !== 'hospital_admin') return next();
  if (!req.user.hospitalId) {
    return res.status(403).json({ message: 'No facility linked to this account' });
  }
  if (String(req.user.hospitalId) !== String(req.params[param])) {
    return res.status(403).json({ message: 'You can only manage your assigned facility' });
  }
  next();
};
