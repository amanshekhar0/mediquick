import express from 'express';
import Patient from '../models/Patient.js';
import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { emitVolunteerAlert } from '../socket/index.js';

const router = express.Router();

const TRIAGE_SYSTEM_PROMPT = `You are an emergency medical triage AI for MediEquip 2.0.

INPUT
  The patient's symptoms may be written in ANY language (English, Hindi, Tamil, Kannada, Telugu, Spanish, etc.).

INTERNAL REASONING
  Translate symptoms to English internally and reason about the medical situation in English to ensure clinical accuracy.

OUTPUT
  Return ONLY valid JSON — no markdown, no code fences, no extra prose. The schema is:
  {
    "urgency": "critical" | "moderate" | "minor",
    "suspectedCondition": "string",
    "recommendedFacilityType": "icu_specialist" | "trauma" | "general",
    "reasoning": "string",
    "immediateActions": ["string", "string"],
    "language": "ISO 639-1 code of the user's input language (e.g. 'en', 'hi', 'ta', 'kn')"
  }

LANGUAGE RULES (very important)
  - The "urgency" and "recommendedFacilityType" values MUST always be the literal English enum tokens above (these are system identifiers).
  - "suspectedCondition", "reasoning", and "immediateActions" MUST be returned in the SAME language the user wrote in.
  - "language" must contain the detected ISO 639-1 code.
  - If the user wrote in English, all values are in English.

CRITICAL CONDITION KEYWORDS (always include the English keyword in "suspectedCondition" when applicable, even if the rest is translated)
  - For cardiac emergencies, include the word "Cardiac" (e.g. "Cardiac Event - दिल का दौरा").
  - For choking emergencies, include the word "Choking".
  This dual-language label lets the system dispatch nearby volunteers correctly.`;

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isCriticalConditionForVolunteers = (triage) => {
  if (triage?.urgency !== 'critical') return false;
  const text = `${triage.suspectedCondition || ''} ${(triage.immediateActions || []).join(' ')}`.toLowerCase();
  return ['cardiac', 'cardiac arrest', 'heart attack', 'mi ', 'myocardial', 'choking', 'choke', 'asphyxia']
    .some((k) => text.includes(k));
};

// Find volunteers within `radiusMeters` of the patient's location.
const findNearbyVolunteers = async (lat, lng, radiusMeters = 500) => {
  try {
    return await User.find({
      role: 'volunteer',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusMeters,
        },
      },
    }).limit(20);
  } catch (err) {
    console.warn('[Triage] Volunteer geo-query failed:', err.message);
    return [];
  }
};

/** Works without Groq — deterministic routing + volunteer keywords still apply */
const offlineTriageFromSymptoms = (symptoms) => {
  const s = (symptoms || '').toLowerCase();
  const choke = /chok|choke|aspirat|cannot breathe|cant breathe/.test(s);
  const cardiac = /chest pain|heart attack|cardiac|palpitation|stroke|syncope/.test(s);
  if (choke) {
    return {
      urgency: 'critical',
      suspectedCondition: 'Choking — possible airway compromise',
      recommendedFacilityType: 'trauma',
      reasoning: 'Offline keyword triage. Set GROQ_API_KEY for full multilingual AI assessment.',
      immediateActions: ['Clear airway if trained', 'Activate emergency response'],
      language: 'en',
    };
  }
  if (cardiac) {
    return {
      urgency: 'critical',
      suspectedCondition: 'Cardiac — possible acute coronary syndrome',
      recommendedFacilityType: 'icu_specialist',
      reasoning: 'Offline keyword triage. Set GROQ_API_KEY for full multilingual AI assessment.',
      immediateActions: ['Call emergency services', 'Monitor vitals', 'Prepare AED if available'],
      language: 'en',
    };
  }
  return {
    urgency: 'moderate',
    suspectedCondition: 'General symptoms — offline triage preview',
    recommendedFacilityType: 'general',
    reasoning: 'No AI key configured; using staging defaults. Add GROQ_API_KEY for Groq-powered triage.',
    immediateActions: ['Monitor symptoms', 'Seek clinical evaluation if symptoms worsen'],
    language: 'en',
  };
};

async function finalizeTriageRound(req, res, send, symptoms, lat, lng, triageResult) {
  send('triage_complete', { triageResult });

  const patient = await Patient.create({
    userId: req.user._id,
    symptoms,
    triageResult,
    patientLocation: { lat, lng },
    status: 'triaged',
  });

  const hospitals = await Hospital.find({ isActive: true });
  const distances = hospitals.map((h) => haversineKm(lat, lng, h.location.lat, h.location.lng));
  const maxDist = Math.max(...distances, 1);

  const scored = hospitals.map((h, i) => {
    const distScore = (1 - distances[i] / maxDist) * 0.4;
    const bedScore = h.totalBeds > 0 ? (h.availableBeds / h.totalBeds) * 0.4 : 0;
    const specMatch = h.type === triageResult.recommendedFacilityType ? 1 : 0;
    const specScore = specMatch * 0.2;
    return {
      hospital: h,
      distance: Math.round(distances[i] * 10) / 10,
      score: distScore + bedScore + specScore,
    };
  });
  scored.sort((a, b) => b.score - a.score);
  const recommendations = scored.slice(0, 3).map(({ hospital, distance, score }) => ({
    ...hospital.toObject(),
    distance,
    score: Math.round(score * 100) / 100,
  }));

  send('recommendations', { patientId: patient._id, recommendations });

  if (isCriticalConditionForVolunteers(triageResult)) {
    const volunteers = await findNearbyVolunteers(lat, lng, 500);
    const alerted = [];

    for (const v of volunteers) {
      const vCoords = v.location?.coordinates || [];
      const vDistance =
        vCoords.length === 2 ? Math.round(haversineKm(lat, lng, vCoords[1], vCoords[0]) * 1000) : null;

      emitVolunteerAlert(v._id.toString(), {
        alertId: patient._id.toString(),
        patientId: patient._id.toString(),
        location: { lat, lng },
        condition: triageResult.suspectedCondition,
        immediateActions: triageResult.immediateActions || [],
        distanceMeters: vDistance,
        createdAt: new Date().toISOString(),
      });

      alerted.push({ volunteerId: v._id, name: v.name, distanceMeters: vDistance });
    }

    send('volunteer_dispatch', {
      dispatched: alerted.length,
      volunteers: alerted,
    });
  }

  send('done', {});
  res.end();
}

// POST /api/triage  — streams SSE: tokens → triage_complete → recommendations → volunteer_dispatch → done
router.post('/', authenticate, requireRole('patient'), async (req, res) => {
  const { symptoms, patientLocation } = req.body;
  if (!symptoms) return res.status(400).json({ message: 'symptoms is required' });

  const lat = patientLocation?.lat || 12.9716;
  const lng = patientLocation?.lng || 77.5946;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const groqKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;

  try {
    if (!groqKey) {
      const triageResult = offlineTriageFromSymptoms(symptoms);
      send('info', { message: 'Running offline triage (no GROQ_API_KEY). Hospital routing is live.' });
      await finalizeTriageRound(req, res, send, symptoms, lat, lng, triageResult);
      return;
    }

    const grokRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: TRIAGE_SYSTEM_PROMPT },
          { role: 'user', content: `Patient symptoms: ${symptoms}` },
        ],
        stream: true,
      }),
    });

    if (!grokRes.ok) {
      send('error', { message: `AI service error: ${grokRes.status}` });
      res.end();
      return;
    }

    const reader = grokRes.body.getReader();
    const decoder = new TextDecoder();
    let rawJson = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            rawJson += delta;
            send('token', { token: delta });
          }
        } catch {
          /* skip malformed SSE chunk */
        }
      }
    }

    // Extract JSON from the streamed body (in case the model wrapped it)
    let triageResult = null;
    try {
      const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
      triageResult = JSON.parse(jsonMatch ? jsonMatch[0] : rawJson);
    } catch {
      send('error', { message: 'Failed to parse AI response as JSON', raw: rawJson });
      res.end();
      return;
    }

    await finalizeTriageRound(req, res, send, symptoms, lat, lng, triageResult);
  } catch (err) {
    send('error', { message: err.message });
    res.end();
  }
});

export default router;
