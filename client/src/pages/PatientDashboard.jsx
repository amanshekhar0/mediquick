import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope, Sparkles, Hospital, MapPin, Truck, AlertTriangle,
  X, Check, Activity, Mic, MicOff, Search, Package, Languages,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import BreathingIndicator from '../components/BreathingIndicator';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../lib/socket';
import api from '../lib/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const URGENCY = {
  critical: { label: 'Critical', badge: 'badge-critical', breath: 'critical' },
  moderate: { label: 'Moderate', badge: 'badge-warning',  breath: 'moderate' },
  minor:    { label: 'Stable',   badge: 'badge-safe',     breath: 'minor'    },
};

const occupancyHex = (h) => {
  const pct = ((h.totalBeds - h.availableBeds) / h.totalBeds) * 100;
  if (pct >= 90) return '#E11D48';
  if (pct >= 70) return '#D97706';
  return '#059669';
};

const hospitalIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 4px 8px rgba(15,23,42,0.18)"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7],
});

const ambulanceIcon = L.divIcon({
  className: '',
  html: `<div style="background:#0F766E;width:24px;height:24px;border-radius:6px;border:3px solid white;box-shadow:0 6px 12px rgba(15,118,110,0.4);display:flex;align-items:center;justify-content:center;font-size:13px">🚑</div>`,
  iconSize: [24, 24], iconAnchor: [12, 12],
});

const MapFlyTo = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 13, { duration: 1.2 }); }, [center, map]);
  return null;
};

const LANGS = [
  { code: 'en-US',  label: 'English' },
  { code: 'hi-IN',  label: 'हिन्दी' },
  { code: 'kn-IN',  label: 'ಕನ್ನಡ' },
  { code: 'ta-IN',  label: 'தமிழ்' },
  { code: 'te-IN',  label: 'తెలుగు' },
  { code: 'es-ES',  label: 'Español' },
];

export default function PatientDashboard() {
  const { user } = useAuth();
  const [symptoms, setSymptoms]     = useState('');
  const [streaming, setStreaming]   = useState(false);
  const [tokens, setTokens]         = useState('');
  const [triageResult, setTriageResult]     = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [patientId, setPatientId]   = useState(null);
  const [hospitals, setHospitals]   = useState([]);
  const [ambulance, setAmbulance]   = useState(null);
  const [userLocation, setUserLocation] = useState({ lat: 12.9716, lng: 77.5946 });
  const [mapCenter, setMapCenter]   = useState(null);
  const [alertBanner, setAlertBanner] = useState(null);
  const [reqAmb, setReqAmb] = useState(false);
  const [toast, setToast]   = useState(null);

  // Voice-to-text
  const [listening, setListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState('en-US');
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef(null);

  // Resource search
  const [resourceQ, setResourceQ] = useState('');
  const [resourceResults, setResourceResults] = useState(null);   // null = no search yet, [] = empty
  const [searching, setSearching] = useState(false);

  const tokenBoxRef = useRef(null);

  useEffect(() => {
    api.get('/hospitals').then(r => setHospitals(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    const s = getSocket();
    s.on('hospital:update', d => {
      setHospitals(p => p.map(h => h._id === d.hospitalId ? { ...h, ...d } : h));
      setRecommendations(p => p.map(h => h._id === d.hospitalId ? { ...h, ...d } : h));
    });
    s.on('alert:mass_casualty', d => setAlertBanner(d));
    return () => { s.off('hospital:update'); s.off('alert:mass_casualty'); };
  }, []);

  useEffect(() => {
    if (!patientId) return;
    const s = getSocket();
    s.emit('patient:join_room', patientId);
    s.on('ambulance:location', d => setAmbulance(d));
    return () => s.off('ambulance:location');
  }, [patientId]);

  const handleAnalyze = useCallback(async () => {
    if (!symptoms.trim()) return;
    setStreaming(true); setTokens(''); setTriageResult(null); setRecommendations([]); setPatientId(null); setAmbulance(null);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        body: JSON.stringify({ symptoms, patientLocation: userLocation }),
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const p = JSON.parse(line.slice(6));
            if (p.token) {
              setTokens(t => t + p.token);
              if (tokenBoxRef.current) tokenBoxRef.current.scrollTop = tokenBoxRef.current.scrollHeight;
            } else if (p.triageResult) setTriageResult(p.triageResult);
            else if (p.recommendations) {
              setRecommendations(p.recommendations);
              setPatientId(p.patientId);
              if (p.recommendations[0]) setMapCenter([p.recommendations[0].location.lat, p.recommendations[0].location.lng]);
            }
          } catch {}
        }
      }
    } catch (err) { console.error(err); }
    finally { setStreaming(false); }
  }, [symptoms, userLocation]);

  const handleRequestAmbulance = async (hospitalId) => {
    if (!patientId) return;
    setReqAmb(true);
    try {
      const ambs = await api.get('/ambulance');
      const avail = ambs.data.find(a => a.status === 'available');
      if (!avail) {
        setToast({ type: 'error', text: 'No ambulances are available right now.' });
        return;
      }
      await api.post('/ambulance/dispatch', { ambulanceId: avail._id, patientId, hospitalId });
      setToast({ type: 'success', text: 'Ambulance dispatched. Track progress on the map.' });
    } catch (err) {
      setToast({ type: 'error', text: err.response?.data?.message || 'Dispatch failed' });
    } finally {
      setReqAmb(false);
      setTimeout(() => setToast(null), 4500);
    }
  };

  // ── Voice-to-text via Web Speech API ────────────────────────────────
  const SpeechRecognition = typeof window !== 'undefined'
    && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const voiceSupported = !!SpeechRecognition;

  const toggleListening = useCallback(() => {
    setVoiceError('');
    if (!voiceSupported) {
      setVoiceError('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (listening) {
      try { recognitionRef.current?.stop(); } catch {}
      setListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous     = false;
    rec.interimResults = true;
    rec.lang           = voiceLang;

    let finalTranscript = '';
    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const tr = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += tr + ' ';
        else interim += tr;
      }
      setSymptoms((prev) => {
        const trimmed = (prev || '').replace(/\s+\[…[^\]]*\]\s*$/, '');
        const live = interim ? ` [… ${interim.trim()}]` : '';
        return (trimmed + (finalTranscript ? ` ${finalTranscript.trim()}` : '') + live).trimStart();
      });
    };
    rec.onerror = (e) => {
      setVoiceError(e.error === 'not-allowed'
        ? 'Microphone access was denied. Please allow it in your browser settings.'
        : `Voice input error: ${e.error}`);
      setListening(false);
    };
    rec.onend = () => {
      setSymptoms((prev) => prev.replace(/\s+\[…[^\]]*\]\s*$/, '').trim());
      setListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [SpeechRecognition, listening, voiceLang, voiceSupported]);

  // Cleanup recognition on unmount
  useEffect(() => () => {
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  // ── Resource search ─────────────────────────────────────────────────
  const handleResourceSearch = useCallback(async () => {
    const q = resourceQ.trim();
    if (!q) { setResourceResults(null); return; }
    setSearching(true);
    try {
      const { data } = await api.get('/hospitals/search', { params: { resource: q } });
      setResourceResults(data);
      if (data.length > 0) {
        setMapCenter([data[0].location.lat, data[0].location.lng]);
      }
    } catch (err) {
      setToast({ type: 'error', text: err.response?.data?.message || 'Resource search failed' });
      setTimeout(() => setToast(null), 4500);
    } finally {
      setSearching(false);
    }
  }, [resourceQ]);

  const clearResourceSearch = () => {
    setResourceQ('');
    setResourceResults(null);
  };

  // Markers shown on the map: filtered by resource search if active
  const visibleHospitals = resourceResults ?? hospitals;

  const urgency = triageResult?.urgency;
  const urgCfg  = URGENCY[urgency];

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      {/* Mass casualty banner */}
      <AnimatePresence>
        {alertBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-critical-50 border-b border-critical-100"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-critical-700 text-sm font-semibold">
                <AlertTriangle size={16} className="flex-shrink-0" />
                <span>Mass casualty alert: {alertBanner.message}</span>
              </div>
              <button onClick={() => setAlertBanner(null)} className="text-critical-700 hover:bg-critical-100 p-1 rounded">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className={`fixed top-20 right-6 z-50 card shadow-soft-xl flex items-center gap-3 px-4 py-3 ${toast.type === 'error' ? 'border border-critical-100' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === 'error' ? 'bg-critical-50 text-critical' : 'bg-safe-50 text-safe'}`}>
              {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
            </div>
            <span className="text-sm text-ink-700">{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <PageTransition className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl text-ink-900">Emergency Triage</h1>
          <p className="text-ink-500 mt-1.5">AI-assisted symptom analysis and hospital recommendation.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left column ── */}
          <div className="space-y-5">
            {/* Symptom input */}
            <div className="card p-6">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                    <Stethoscope size={18} className="text-brand" />
                  </div>
                  <div>
                    <h2 className="font-display font-semibold text-ink-900">Describe symptoms</h2>
                    <p className="text-xs text-ink-400">Speak or type — any language is supported.</p>
                  </div>
                </div>

                {/* Language selector for voice */}
                <div className="flex items-center gap-1.5 bg-ink-100 rounded-lg p-1">
                  <Languages size={13} className="text-ink-400 ml-2" />
                  <select
                    value={voiceLang}
                    onChange={(e) => setVoiceLang(e.target.value)}
                    className="bg-transparent text-xs font-medium text-ink-700 focus:outline-none pr-2 py-1"
                    title="Voice input language"
                  >
                    {LANGS.map((l) => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={symptoms}
                  onChange={e => setSymptoms(e.target.value)}
                  placeholder="Describe onset, severity, location, and duration of symptoms."
                  rows={4}
                  className="input resize-none leading-relaxed pr-14"
                />

                {/* Microphone button (Tap to Speak) */}
                <button
                  type="button"
                  onClick={toggleListening}
                  aria-pressed={listening}
                  title={listening ? 'Stop listening' : 'Tap to speak'}
                  className={`absolute right-3 bottom-3 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand ${
                    listening
                      ? 'bg-critical text-white shadow-soft-lg'
                      : 'bg-brand-50 text-brand hover:bg-brand hover:text-white'
                  } ${!voiceSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!voiceSupported}
                >
                  {listening ? <MicOff size={18} /> : <Mic size={18} />}
                  {listening && (
                    <motion.span
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 1.6, opacity: 0 }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-critical -z-10"
                    />
                  )}
                </button>
              </div>

              {/* Voice meta */}
              <AnimatePresence>
                {(listening || voiceError) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="mt-3"
                  >
                    {listening && (
                      <div className="flex items-center gap-2 text-xs text-critical font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-critical animate-pulse" />
                        Listening in {LANGS.find(l => l.code === voiceLang)?.label || voiceLang}…
                      </div>
                    )}
                    {voiceError && (
                      <div className="flex items-start gap-2 mt-1 text-xs text-critical">
                        <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                        <span>{voiceError}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleAnalyze}
                disabled={streaming || !symptoms.trim()}
                className="btn-primary w-full mt-4 py-3 text-base"
              >
                {streaming ? (
                  <>
                    <Activity size={18} className="animate-pulse" /> Analyzing with AI…
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Analyze emergency
                  </>
                )}
              </button>
            </div>

            {/* Triage result + breathing indicator */}
            <AnimatePresence mode="wait">
              {(streaming || triageResult) && (
                <motion.div
                  key="triage"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="card p-6"
                >
                  <div className="flex items-start gap-5">
                    <BreathingIndicator urgency={urgCfg?.breath || 'idle'} size={120} />

                    <div className="flex-1 min-w-0">
                      {!triageResult && (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                            <span className="label text-brand">AI Processing</span>
                          </div>
                          <div
                            ref={tokenBoxRef}
                            className="bg-ink-100 rounded-lg p-3 h-24 overflow-y-auto text-xs font-mono text-ink-700 leading-relaxed whitespace-pre-wrap"
                          >
                            {tokens}
                            <span className="inline-block w-2 h-3.5 bg-brand ml-0.5 animate-pulse rounded-sm" />
                          </div>
                        </>
                      )}

                      {triageResult && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`badge ${urgCfg?.badge}`}>
                              <Activity size={12} /> {urgCfg?.label}
                            </span>
                          </div>
                          <h3 className="font-display font-bold text-lg text-ink-900">
                            {triageResult.suspectedCondition}
                          </h3>
                          <p className="text-ink-600 text-sm mt-2 leading-relaxed">
                            {triageResult.reasoning}
                          </p>
                          <div className="mt-3 inline-flex items-center gap-2 text-xs">
                            <span className="label">Recommended</span>
                            <span className="badge badge-brand">
                              <Hospital size={12} /> {triageResult.recommendedFacilityType?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Immediate actions */}
                  {triageResult?.immediateActions?.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-ink-200">
                      <div className="label mb-3">Immediate actions</div>
                      <div className="space-y-2">
                        {triageResult.immediateActions.map((a, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-brand-50/50 rounded-lg">
                            <div className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                              {i + 1}
                            </div>
                            <span className="text-sm text-ink-700 leading-relaxed">{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recommended hospitals */}
            <AnimatePresence>
              {recommendations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-ink-900">Top 3 recommended facilities</h3>
                    <span className="label">Sorted by score</span>
                  </div>

                  {recommendations.map((h, i) => (
                    <motion.div
                      key={h._id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`card card-hover p-5 ${i === 0 ? 'ring-1 ring-brand/20 border border-brand-100' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`badge ${i === 0 ? 'badge-brand' : 'badge-ink'}`}>#{i + 1}</span>
                            {i === 0 && <span className="text-xs font-semibold text-brand">Best match</span>}
                          </div>
                          <h4 className="font-display font-bold text-ink-900 truncate">{h.name}</h4>
                          <p className="text-sm text-ink-500 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin size={12} className="flex-shrink-0" /> {h.location.address}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <div className="font-display font-bold text-lg text-ink-900">{h.distance} km</div>
                          <div className="label text-xs">away</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-ink-100 rounded-lg p-2.5 text-center">
                          <div className="font-display font-bold text-ink-900">{h.availableBeds}</div>
                          <div className="text-[10px] font-medium text-ink-400 uppercase tracking-wider mt-0.5">Beds</div>
                        </div>
                        <div className="bg-brand-50 rounded-lg p-2.5 text-center">
                          <div className="font-display font-bold text-brand">{h.icuAvailable}</div>
                          <div className="text-[10px] font-medium text-brand uppercase tracking-wider mt-0.5">ICU</div>
                        </div>
                        <div className="bg-safe-50 rounded-lg p-2.5 text-center">
                          <div className="font-display font-bold text-safe text-xs leading-tight pt-1">
                            {h.type.replace('_', ' ')}
                          </div>
                          <div className="text-[10px] font-medium text-safe uppercase tracking-wider mt-0.5">Type</div>
                        </div>
                      </div>

                      {h.specializations?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {h.specializations.slice(0, 3).map(s => (
                            <span key={s} className="badge badge-ink text-[10px] py-0.5">{s}</span>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        {i === 0 && (
                          <button
                            onClick={() => handleRequestAmbulance(h._id)}
                            disabled={reqAmb}
                            className="btn-primary flex-1"
                          >
                            <Truck size={16} />
                            {reqAmb ? 'Dispatching…' : 'Request Ambulance'}
                          </button>
                        )}
                        <button
                          onClick={() => setMapCenter([h.location.lat, h.location.lng])}
                          className="btn-outline"
                        >
                          <MapPin size={16} /> View
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right column: Map ── */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {/* Resource locator */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package size={15} className="text-brand" />
                <h3 className="font-display font-semibold text-sm text-ink-900">Resource locator</h3>
                <span className="label ml-auto">Inventory search</span>
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); handleResourceSearch(); }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    value={resourceQ}
                    onChange={(e) => setResourceQ(e.target.value)}
                    placeholder="Search inventory (e.g. blood type, antivenom, ventilator)"
                    className="input pl-9"
                  />
                </div>
                <button type="submit" disabled={searching || !resourceQ.trim()} className="btn-primary">
                  {searching ? '…' : 'Search'}
                </button>
                {resourceResults && (
                  <button type="button" onClick={clearResourceSearch} className="btn-outline" title="Clear filter">
                    <X size={14} />
                  </button>
                )}
              </form>

              {resourceResults && (
                <div className="mt-3 text-xs text-ink-500 flex items-center gap-2 flex-wrap">
                  <span className={`badge ${resourceResults.length > 0 ? 'badge-safe' : 'badge-critical'}`}>
                    {resourceResults.length > 0 ? `${resourceResults.length} hospital${resourceResults.length === 1 ? '' : 's'} stocked` : 'Out of stock'}
                  </span>
                  <span className="text-ink-400">Showing only matching facilities on the map below.</span>
                </div>
              )}
            </div>

            <div className="card overflow-hidden" style={{ height: '520px' }}>
              <div className="px-5 py-3 border-b border-ink-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
                  <span className="font-semibold text-sm text-ink-900">Live hospital map</span>
                </div>
                <span className="label">Facilities: {visibleHospitals.length}</span>
              </div>
              <MapContainer center={[userLocation.lat, userLocation.lng]} zoom={12} style={{ height: 'calc(100% - 49px)', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {mapCenter && <MapFlyTo center={mapCenter} />}
                {visibleHospitals.map(h => (
                  <Marker key={h._id} position={[h.location.lat, h.location.lng]} icon={hospitalIcon(occupancyHex(h))}>
                    <Popup>
                      <div className="font-sans">
                        <strong className="text-ink-900">{h.name}</strong><br />
                        <span className="text-ink-500 text-xs">Beds: {h.availableBeds}/{h.totalBeds}</span><br />
                        <span className="text-ink-500 text-xs">ICU: {h.icuAvailable}/{h.icuTotal}</span>
                        {h.matchedItem && (
                          <>
                            <br />
                            <span className="text-brand text-xs font-semibold">
                              {h.matchedItem.itemName}: {h.matchedItem.quantity} in stock
                            </span>
                          </>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {ambulance && (
                  <Marker position={[ambulance.lat, ambulance.lng]} icon={ambulanceIcon}>
                    <Popup>🚑 {ambulance.vehicleNumber}<br />ETA ~{ambulance.eta} min</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>

            {/* Resource search results list */}
            {resourceResults && resourceResults.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-ink-200 flex items-center justify-between">
                  <span className="font-semibold text-sm text-ink-900">Stocking "{resourceQ}"</span>
                  <span className="badge badge-safe">{resourceResults.length}</span>
                </div>
                <div className="p-3 max-h-60 overflow-y-auto space-y-2">
                  {resourceResults.map((h) => (
                    <button
                      key={h._id}
                      onClick={() => setMapCenter([h.location.lat, h.location.lng])}
                      className="w-full text-left p-3 rounded-xl bg-ink-100 hover:bg-brand-50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-ink-900 group-hover:text-brand truncate">{h.name}</div>
                          <div className="text-xs text-ink-500 truncate flex items-center gap-1 mt-0.5">
                            <MapPin size={11} /> {h.location.address}
                          </div>
                        </div>
                        {h.matchedItem && (
                          <span className="badge badge-brand flex-shrink-0">
                            {h.matchedItem.quantity}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ambulance live tracker */}
            <AnimatePresence>
              {ambulance && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="card p-5 border border-brand-100 bg-gradient-to-br from-surface to-brand-50/40"
                >
                  <div className="flex items-center gap-4">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-12 h-12 rounded-2xl bg-brand text-white flex items-center justify-center text-xl shadow-soft"
                    >
                      🚑
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="badge badge-brand">En route</span>
                        <span className="text-xs text-ink-400">Live tracking</span>
                      </div>
                      <div className="font-display font-semibold text-ink-900 truncate">{ambulance.vehicleNumber}</div>
                      <div className="text-sm text-ink-500">ETA approximately {ambulance.eta} min</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Legend */}
            <div className="card p-4">
              <div className="label mb-2.5">Hospital availability key</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { color: '#059669', label: 'Available',  desc: '< 70%'  },
                  { color: '#D97706', label: 'Limited',    desc: '70–90%' },
                  { color: '#E11D48', label: 'Critical',   desc: '> 90%'  },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
                    <div className="min-w-0">
                      <div className="font-semibold text-ink-700">{l.label}</div>
                      <div className="text-ink-400 text-[10px]">{l.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}
