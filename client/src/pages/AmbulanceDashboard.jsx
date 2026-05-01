import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';
import {
  HeartPulse, Activity, Wind, Hospital, Radio, User as UserIcon, Wifi, Check, AlertCircle,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import PageTransition from '../components/PageTransition';
import { getSocket } from '../lib/socket';
import api from '../lib/api';

const VitalSlider = ({ label, value, onChange, min, max, unit, accent = '#0F766E', danger }) => (
  <div className="card p-5">
    <div className="flex items-baseline justify-between mb-3">
      <div>
        <div className="label">{label}</div>
        <div className="font-display font-bold text-3xl text-ink-900 mt-1">
          {value}
          <span className="text-sm font-medium text-ink-400 ml-1">{unit}</span>
        </div>
      </div>
      {danger && (
        <span className="badge badge-critical">
          <AlertCircle size={11} /> Out of range
        </span>
      )}
    </div>
    <input
      type="range" min={min} max={max} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full"
    />
    <div className="flex justify-between text-xs text-ink-400 mt-1.5">
      <span>{min}</span>
      <span>{max}</span>
    </div>
    <div className="w-full h-1.5 bg-ink-100 rounded-full mt-2 overflow-hidden">
      <motion.div
        animate={{ width: `${((value - min) / (max - min)) * 100}%` }}
        transition={{ duration: 0.2 }}
        className="h-full rounded-full"
        style={{ background: danger ? '#E11D48' : accent }}
      />
    </div>
  </div>
);

const AmbulanceDashboard = () => {
  const [hospitals, setHospitals] = useState([]);
  const [hospitalId, setHospitalId] = useState('');
  const [patientId,  setPatientId]  = useState('');
  const [transmitting, setTransmitting] = useState(false);
  const [vitals, setVitals] = useState({ hr: 78, bpSys: 120, bpDia: 80, spo2: 98 });
  const [history, setHistory] = useState([]); // local preview chart
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError]     = useState('');
  const lastEmittedRef = useRef(0);

  useEffect(() => {
    api.get('/hospitals').then((r) => setHospitals(r.data)).catch(() => {});
  }, []);

  // Detect out-of-range
  const danger = useMemo(() => ({
    hr:    vitals.hr < 50  || vitals.hr > 130,
    bpSys: vitals.bpSys < 90 || vitals.bpSys > 180,
    bpDia: vitals.bpDia < 50 || vitals.bpDia > 110,
    spo2:  vitals.spo2 < 90,
  }), [vitals]);

  // Throttled emission of vitals while transmitting
  useEffect(() => {
    if (!transmitting || !hospitalId || !patientId) return;
    const now = Date.now();
    if (now - lastEmittedRef.current < 500) return;
    lastEmittedRef.current = now;

    const s = getSocket();
    s.emit('ambulance:vitals', {
      hospitalId,
      patientId,
      vitals: { ...vitals },
      timestamp: now,
    });

    setHistory((prev) => {
      const next = [...prev, { t: new Date(now).toLocaleTimeString(), ...vitals }];
      return next.slice(-30);
    });
    setSavedAt(now);
  }, [vitals, hospitalId, patientId, transmitting]);

  const startTransmission = () => {
    setError('');
    if (!hospitalId) { setError('Please select a destination hospital.'); return; }
    if (!patientId.trim()) { setError('Please enter a patient identifier.'); return; }
    setTransmitting(true);
    setHistory([]);
  };

  const stopTransmission = () => {
    setTransmitting(false);
  };

  const selectedHospital = hospitals.find((h) => h._id === hospitalId);

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <PageTransition className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl text-ink-900">Ambulance Console</h1>
            <p className="text-ink-500 mt-1.5">
              Stream patient vitals to the receiving hospital so the ICU is prepped before arrival.
            </p>
          </div>

          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${
              transmitting ? 'bg-safe-50 border-safe/20 text-safe' : 'bg-ink-100 border-ink-200 text-ink-600'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${transmitting ? 'bg-safe animate-pulse' : 'bg-ink-400'}`} />
            <span className="text-sm font-semibold">
              {transmitting ? 'Transmitting live' : 'Standby'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Trip details ── */}
          <div className="card p-6 lg:col-span-1 h-fit">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center">
                <Hospital size={18} className="text-brand" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-ink-900">Trip details</h2>
                <p className="text-xs text-ink-400">Destination + patient identifier</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label block mb-1.5">Destination hospital</label>
                <select
                  value={hospitalId}
                  onChange={(e) => setHospitalId(e.target.value)}
                  disabled={transmitting}
                  className="input"
                >
                  <option value="">Select a hospital…</option>
                  {hospitals.map((h) => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label block mb-1.5">Patient identifier</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="Encounter ID, MRN, or agreed reference"
                    disabled={transmitting}
                    className="input pl-10"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-critical-50 border border-critical/20 rounded-lg">
                  <AlertCircle size={16} className="text-critical flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-critical-700">{error}</span>
                </div>
              )}

              {!transmitting ? (
                <button onClick={startTransmission} className="btn-primary w-full py-3">
                  <Radio size={16} /> Start vital transmission
                </button>
              ) : (
                <button onClick={stopTransmission} className="btn-danger w-full py-3">
                  Stop transmission
                </button>
              )}

              {selectedHospital && (
                <div className="pt-4 border-t border-ink-200 space-y-1.5 text-xs text-ink-500">
                  <div className="font-semibold text-ink-700 text-sm">{selectedHospital.name}</div>
                  <div>{selectedHospital.location.address}</div>
                  <div className="flex items-center gap-1.5 text-safe">
                    <Wifi size={12} /> Hospital ICU receiving live feed
                  </div>
                </div>
              )}

              {transmitting && savedAt && (
                <div className="text-xs text-ink-400 flex items-center gap-1.5">
                  <Check size={12} className="text-safe" />
                  Last frame sent {Math.max(0, Math.round((Date.now() - savedAt) / 1000))}s ago
                </div>
              )}
            </div>
          </div>

          {/* ── Vitals input + preview ── */}
          <div className="lg:col-span-2 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <VitalSlider
                label="Heart rate"
                value={vitals.hr}
                onChange={(v) => setVitals((s) => ({ ...s, hr: v }))}
                min={30} max={200} unit="bpm"
                accent="#E11D48" danger={danger.hr}
              />
              <VitalSlider
                label="Oxygen (SpO₂)"
                value={vitals.spo2}
                onChange={(v) => setVitals((s) => ({ ...s, spo2: v }))}
                min={70} max={100} unit="%"
                accent="#0F766E" danger={danger.spo2}
              />
              <VitalSlider
                label="Blood pressure (Systolic)"
                value={vitals.bpSys}
                onChange={(v) => setVitals((s) => ({ ...s, bpSys: v }))}
                min={60} max={220} unit="mmHg"
                accent="#D97706" danger={danger.bpSys}
              />
              <VitalSlider
                label="Blood pressure (Diastolic)"
                value={vitals.bpDia}
                onChange={(v) => setVitals((s) => ({ ...s, bpDia: v }))}
                min={30} max={140} unit="mmHg"
                accent="#D97706" danger={danger.bpDia}
              />
            </div>

            {/* Mini EKG preview */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HeartPulse size={16} className="text-critical" />
                  <h3 className="font-display font-semibold text-ink-900">Live preview</h3>
                </div>
                <span className="label">{history.length} frames</span>
              </div>
              {history.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-ink-400 text-sm">
                  <Activity size={32} className="mb-2 opacity-40" />
                  Adjust sliders while transmitting to see vitals stream live.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={history}>
                    <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#94A3B8' }} hide />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} />
                    <Line type="monotone" dataKey="hr"    stroke="#E11D48" dot={false} strokeWidth={2.5} name="HR" />
                    <Line type="monotone" dataKey="spo2"  stroke="#0F766E" dot={false} strokeWidth={2.5} name="SpO₂" />
                    <Line type="monotone" dataKey="bpSys" stroke="#D97706" dot={false} strokeWidth={2}   name="BP Sys" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </PageTransition>
    </div>
  );
};

export default AmbulanceDashboard;
