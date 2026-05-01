import mongoose from 'mongoose';

/**
 * Turns messy client input into a single Mongo ObjectId string or null.
 * Accepts: plain 24-char hex, JSON like {"hospitalId":"..."}, nested objects, extra text.
 */
export function parseHospitalIdInput(raw) {
  if (raw === undefined || raw === null) return null;

  if (typeof raw === 'object' && raw !== null && !Buffer.isBuffer(raw)) {
    if (raw.hospitalId != null) return parseHospitalIdInput(raw.hospitalId);
    if (raw._id != null) return parseHospitalIdInput(raw._id);
    return null;
  }

  let s = String(raw).trim();
  if (!s) return null;

  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
    try {
      return parseHospitalIdInput(JSON.parse(s));
    } catch {
      /* fall through */
    }
  }

  const hex24 = s.match(/[a-fA-F0-9]{24}/);
  if (hex24 && mongoose.Types.ObjectId.isValid(hex24[0])) return hex24[0];

  return null;
}
