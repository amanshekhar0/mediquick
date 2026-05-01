import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  HeartPulse, MapPin, Navigation, BellRing, ShieldCheck, AlertCircle, Crosshair, X, Check,
} from 'lucide-react';
import Navbar from '../components/Navbar';
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

const volunteerIcon = L.divIcon({
  className: '',
  html: `<div style="background:#0F766E;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 4px 10px rgba(15,118,110,0.4)"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});

const emergencyIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:36px;height:36px">
      <div style="position:absolute;inset:0;background:#E11D48;border-radius:50%;opacity:0.25;animation:vp 1.4s ease-out infinite"></div>
      <div style="position:absolute;inset:8px;background:#E11D48;border-radius:50%;border:3px solid white;box-shadow:0 6px 14px rgba(225,29,72,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold">!</div>
    </div>
    <style>@keyframes vp{0%{transform:scale(.5);opacity:.6}100%{transform:scale(1.7);opacity:0}}</style>
  `,
  iconSize: [36, 36], iconAnchor: [18, 18],
});

const FlyTo = ({ center, zoom = 15 }) => {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom, { duration: 1.0 }); }, [center, zoom, map]);
  return null;
};

const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const VolunteerDashboard = () => {
  const { user } = useAuth();
  const [coords, setCoords]       = useState(null);          // { lat, lng }
  const [locStatus, setLocStatus] = useState('idle');        // idle | locating | active | error
  const [locError, setLocError]   = useState('');
  const [alerts, setAlerts]       = useState([]);            // active alert list
  const [acceptedId, setAcceptedId] = useState(null);
  const [toast, setToast]         = useState(null);

  // ── Geolocation: register volunteer on the server ───────────────────
  const updateMyLocation = useCallback(async (lat, lng) => {
    try {
      await api.put('/auth/location', { lat, lng });
      setLocStatus('active');
    } catch (err) {
      setLocStatus('error');
      setLocError(err.response?.data?.message || 'Could not register location with the server.');
    }
  }, []);

  const requestGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setLocStatus('error');
      setLocError('Geolocation is not supported by your browser.');
      return;
    }
    setLocStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude };
        setCoords(next);
        updateMyLocation(next.lat, next.lng);
      },
      (err) => {
        setLocStatus('error');
        setLocError(err.message || 'Location permission denied.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [updateMyLocation]);

  useEffect(() => { requestGPS(); }, [requestGPS]);

  // ── Socket: join volunteer room and listen for emergency dispatch ──
  useEffect(() => {
    if (!user?.id) return;
    const s = getSocket();
    s.emit('volunteer:join_room', user.id);

    s.on('volunteer:alert', (payload) => {
      const id = payload.alertId || `${Date.now()}`;
      setAlerts((prev) => {
        if (prev.some((a) => a.alertId === id)) return prev;
        return [{ ...payload, alertId: id, receivedAt: Date.now() }, ...prev];
      });

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Emergency near you', {
          body: payload.condition || 'A nearby person needs immediate help.',
        });
      }
    });

    return () => { s.off('volunteer:alert'); };
  }, [user?.id]);

  // Ask for browser notification permission once, when GPS is active
  useEffect(() => {
    if (locStatus === 'active' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [locStatus]);

  const onAccept = (a) => {
    setAcceptedId(a.alertId);
    setToast({ type: 'success', text: 'On your way — drive safely.' });
    setTimeout(() => setToast(null), 4000);
  };

  const onDismiss = (a) => {
    setAlerts((prev) => prev.filter((x) => x.alertId !== a.alertId));
    if (acceptedId === a.alertId) setAcceptedId(null);
  };

  const ActiveAlert = alerts[0];

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="fixed top-20 right-6 z-50 card shadow-soft-xl flex items-center gap-3 px-4 py-3"
          >
            <div className="w-8 h-8 rounded-full bg-safe-50 text-safe flex items-center justify-center">
              <Check size={16} />
            </div>
            <span className="text-sm text-ink-700">{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <PageTransition className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl text-ink-900">First Responder</h1>
            <p className="text-ink-500 mt-1.5">
              You'll be alerted when someone nearby has a cardiac or choking emergency.
            </p>
          </div>

          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${
              locStatus === 'active' ? 'bg-safe-50 border-safe/20 text-safe' :
              locStatus === 'locating' ? 'bg-warning-50 border-warning/20 text-warning' :
              'bg-critical-50 border-critical/20 text-critical'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${
              locStatus === 'active' ? 'bg-safe animate-pulse' :
              locStatus === 'locating' ? 'bg-warning' : 'bg-critical'
            }`} />
            <span className="text-sm font-semibold">
              {locStatus === 'active'   && 'On-call · Available'}
              {locStatus === 'locating' && 'Acquiring location…'}
              {locStatus === 'error'    && 'Location required'}
              {locStatus === 'idle'     && 'Idle'}
            </span>
          </div>
        </div>

        {/* Location-error CTA */}
        {locStatus === 'error' && (
          <div className="card p-5 border border-critical/20 mb-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-critical-50 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} className="text-critical" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-ink-900">Location access needed</div>
              <p className="text-sm text-ink-500 mt-1">{locError}</p>
              <p className="text-xs text-ink-400 mt-1">
                We use your real-time GPS only to dispatch you to nearby cardiac/choking emergencies.
              </p>
              <button onClick={requestGPS} className="btn-primary mt-3">
                <Crosshair size={16} /> Retry location access
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Map ── */}
          <div className="lg:col-span-2 card overflow-hidden" style={{ height: '560px' }}>
            <div className="px-5 py-3.5 border-b border-ink-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
                <span className="font-semibold text-sm text-ink-900">Volunteer field map</span>
              </div>
              {coords && (
                <span className="label">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
              )}
            </div>
            <MapContainer
              center={[coords?.lat || 12.9716, coords?.lng || 77.5946]}
              zoom={14}
              style={{ height: 'calc(100% - 50px)' }}
            >
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {coords && (
                <>
                  <Marker position={[coords.lat, coords.lng]} icon={volunteerIcon}>
                    <Popup>You — on call</Popup>
                  </Marker>
                  <Circle center={[coords.lat, coords.lng]} radius={500} pathOptions={{ color: '#0F766E', fillColor: '#0F766E', fillOpacity: 0.05 }} />
                </>
              )}
              {alerts.map((a) => (
                <Marker key={a.alertId} position={[a.location.lat, a.location.lng]} icon={emergencyIcon}>
                  <Popup>
                    <strong>{a.condition || 'Critical emergency'}</strong><br />
                    <span style={{ fontSize: 12 }}>{a.distanceMeters || '?'}m away</span>
                  </Popup>
                </Marker>
              ))}
              {ActiveAlert && (
                <FlyTo center={[ActiveAlert.location.lat, ActiveAlert.location.lng]} zoom={16} />
              )}
            </MapContainer>
          </div>

          {/* ── Side panel ── */}
          <div className="space-y-4">
            <div className="card p-5 flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center">
                <ShieldCheck size={18} className="text-brand" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-semibold text-ink-900">CPR-certified responder</div>
                <p className="text-xs text-ink-500 mt-0.5">
                  We only dispatch you for cardiac and choking emergencies within 500 m of your location.
                </p>
              </div>
            </div>

            {/* Live alerts */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-ink-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BellRing size={16} className="text-critical" />
                  <span className="font-semibold text-sm text-ink-900">Live alerts</span>
                </div>
                <span className="badge badge-ink">{alerts.length}</span>
              </div>

              <div className="p-3 max-h-[460px] overflow-y-auto space-y-2">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-sm text-ink-400">
                    Standing by. We'll alert you if a critical emergency happens nearby.
                  </div>
                ) : (
                  <AnimatePresence>
                    {alerts.map((a) => {
                      const dist = (coords && a.location)
                        ? haversineMeters(coords.lat, coords.lng, a.location.lat, a.location.lng)
                        : a.distanceMeters;
                      const accepted = acceptedId === a.alertId;
                      return (
                        <motion.div
                          key={a.alertId}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                          className={`p-3.5 rounded-xl border ${accepted ? 'bg-safe-50 border-safe/20' : 'bg-critical-50 border-critical/20'}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className={`badge ${accepted ? 'badge-safe' : 'badge-critical'}`}>
                              <HeartPulse size={11} /> {accepted ? 'En route' : 'Critical'}
                            </span>
                            <button onClick={() => onDismiss(a)} className="text-ink-400 hover:text-ink-700 p-1 rounded">
                              <X size={14} />
                            </button>
                          </div>
                          <p className="text-sm font-semibold text-ink-900 leading-snug">
                            {a.condition || 'Cardiac event nearby'}
                          </p>
                          <p className="text-xs text-ink-500 mt-1 flex items-center gap-1">
                            <MapPin size={11} /> ~{dist || '?'} m away
                          </p>
                          {a.immediateActions?.length > 0 && (
                            <ul className="mt-2 text-xs text-ink-600 space-y-1 pl-3.5">
                              {a.immediateActions.slice(0, 3).map((act, i) => (
                                <li key={i} className="list-disc">{act}</li>
                              ))}
                            </ul>
                          )}
                          {!accepted && (
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => onAccept(a)} className="btn-primary flex-1 py-2">
                                <Navigation size={14} /> I'm going
                              </button>
                              <a
                                target="_blank" rel="noopener noreferrer"
                                href={`https://www.google.com/maps/dir/?api=1&destination=${a.location.lat},${a.location.lng}`}
                                className="btn-outline py-2"
                              >
                                <MapPin size={14} /> Maps
                              </a>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    </div>
  );
};

export default VolunteerDashboard;
