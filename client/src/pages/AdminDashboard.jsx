import { useState, useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  BedDouble, Truck, AlertTriangle, Activity, MapPin, Bell, Send, X, HeartPulse, Wind, Droplet,
  Crosshair, Users, Route, ArrowRight,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import { getSocket } from '../lib/socket';
import api from '../lib/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const occPct = (h) => h.totalBeds > 0 ? ((h.totalBeds - h.availableBeds) / h.totalBeds) * 100 : 0;

const dotIcon = (pct) => {
  const color = pct >= 90 ? '#E11D48' : pct >= 70 ? '#D97706' : '#059669';
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 4px 10px rgba(15,23,42,0.18)"></div>`,
    iconSize: [16, 16], iconAnchor: [8, 8],
  });
};

const incidentIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:34px;height:34px">
      <div style="position:absolute;inset:0;background:#E11D48;border-radius:50%;opacity:0.25;animation:ip 1.4s ease-out infinite"></div>
      <div style="position:absolute;inset:8px;background:#E11D48;border-radius:50%;border:3px solid white;box-shadow:0 6px 14px rgba(225,29,72,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold">!</div>
    </div>
    <style>@keyframes ip{0%{transform:scale(.5);opacity:.6}100%{transform:scale(1.6);opacity:0}}</style>
  `,
  iconSize: [34, 34], iconAnchor: [17, 17],
});

// Click-to-pin helper for the System Admin's mass casualty form
const ClickToPin = ({ enabled, onPick }) => {
  useMapEvents({
    click(e) { if (enabled) onPick({ lat: e.latlng.lat, lng: e.latlng.lng }); },
  });
  return null;
};

const CHART_COLORS = ['#0F766E', '#E11D48', '#059669', '#D97706', '#8B5CF6', '#EC4899'];

const KpiCard = ({ icon: Icon, label, value, sub, tone = 'brand' }) => {
  const tones = {
    brand:    'bg-brand-50 text-brand',
    safe:     'bg-safe-50 text-safe',
    warning:  'bg-warning-50 text-warning',
    critical: 'bg-critical-50 text-critical',
    ink:      'bg-ink-100 text-ink-600',
  };
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl ${tones[tone]} flex items-center justify-center`}>
          <Icon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="label">{label}</div>
          <div className="font-display font-bold text-3xl text-ink-900 mt-1.5 leading-none truncate">{value}</div>
          {sub && <div className="text-sm text-ink-500 mt-1.5">{sub}</div>}
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const location = useLocation();
  const [hospitals,  setHospitals]  = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [alerts,     setAlerts]     = useState([]);
  const [alertForm,  setAlertForm]  = useState({
    type: 'mass_casualty',
    affectedRadius: 10,
    message: '',
    patientCount: 25,
    location: null,    // { lat, lng } — set via map click
  });
  const [pickMode,   setPickMode]   = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [latestManifest, setLatestManifest] = useState(null); // bubble up via socket

  useEffect(() => {
    const run = async () => {
      const results = await Promise.allSettled([
        api.get('/hospitals'),
        api.get('/ambulance'),
        api.get('/alerts/active'),
      ]);
      if (results[0].status === 'fulfilled') setHospitals(results[0].value.data);
      else console.error('[admin] /hospitals', results[0].reason);
      if (results[1].status === 'fulfilled') setAmbulances(results[1].value.data);
      else console.error('[admin] /ambulance', results[1].reason);
      if (results[2].status === 'fulfilled') setAlerts(results[2].value.data);
      else console.error('[admin] /alerts/active', results[2].reason);
      setLoading(false);
    };
    run();
  }, []);

  const scrollMainToHash = (hashStr) => {
    const id = String(hashStr || '').replace(/^#/, '');
    if (!id) return;
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  useLayoutEffect(() => {
    if (loading) return;
    scrollMainToHash(location.hash);
  }, [loading, location.pathname, location.hash]);

  useEffect(() => {
    if (loading) return;
    const onHashChange = () => scrollMainToHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [loading]);

  useEffect(() => {
    const s = getSocket();
    s.on('hospital:update', d => setHospitals(p => p.map(h => h._id === d.hospitalId ? { ...h, ...d } : h)));
    s.on('alert:mass_casualty', d => {
      setAlerts(p => [{ ...d, isActive: true, createdAt: d.createdAt || new Date() }, ...p]);
      if (d.routingManifest?.length > 0) setLatestManifest(d);
    });
    return () => { s.off('hospital:update'); s.off('alert:mass_casualty'); };
  }, []);

  const handleTrigger = async () => {
    if (!alertForm.message.trim()) return;
    setTriggering(true);
    try {
      const payload = {
        type: alertForm.type,
        affectedRadius: alertForm.affectedRadius,
        message: alertForm.message,
        ...(alertForm.type === 'mass_casualty' && {
          location: alertForm.location || undefined,
          patientCount: alertForm.patientCount,
        }),
      };
      const { data } = await api.post('/alerts', payload);
      setAlerts(p => [data, ...p]);
      if (data.routingManifest?.length > 0) setLatestManifest(data);
      setAlertForm({ type: 'mass_casualty', affectedRadius: 10, message: '', patientCount: 25, location: null });
      setPickMode(false);
    } catch (err) { window.alert(err.response?.data?.message || 'Failed'); }
    finally { setTriggering(false); }
  };

  const deactivate = async (id) => {
    try { await api.delete(`/alerts/${id}`); setAlerts(p => p.filter(a => a._id !== id)); } catch {}
  };

  const totalBeds      = hospitals.reduce((s, h) => s + h.totalBeds,    0);
  const totalAvail     = hospitals.reduce((s, h) => s + h.availableBeds, 0);
  const totalIcu       = hospitals.reduce((s, h) => s + h.icuTotal,     0);
  const totalIcuAvail  = hospitals.reduce((s, h) => s + h.icuAvailable, 0);
  const icuUtil        = totalIcu > 0 ? Math.round(((totalIcu - totalIcuAvail) / totalIcu) * 100) : 0;
  const activeAmbs     = ambulances.filter(a => a.status === 'dispatched').length;

  const trendData = Array.from({ length: 24 }, (_, i) => {
    const entry = { hour: `${i}h` };
    hospitals.slice(0, 6).forEach(h => {
      const hist = h.occupancyHistory || [];
      const point = hist[Math.floor((hist.length / 24) * i)];
      entry[h.name.split(' ')[0]] = point?.occupancyPercent ?? Math.round(occPct(h));
    });
    return entry;
  });

  const cityStatus = [
    { color: '#059669', label: 'Available', count: hospitals.filter(h => occPct(h) < 70).length },
    { color: '#D97706', label: 'Limited',   count: hospitals.filter(h => occPct(h) >= 70 && occPct(h) < 90).length },
    { color: '#E11D48', label: 'Critical',  count: hospitals.filter(h => occPct(h) >= 90).length },
  ];

  if (loading) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="text-ink-500 animate-pulse">Loading city intelligence…</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas flex">
      <Sidebar />

      <main className="flex-1 min-w-0">
        <PageTransition className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="font-display font-bold text-3xl text-ink-900">Command Center</h1>
              <p className="text-ink-500 mt-1.5 flex items-center gap-1.5">
                <MapPin size={14} /> Regional operations and capacity overview
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              {cityStatus.map(s => (
                <div key={s.label} className="flex items-center gap-2 px-3 py-2 bg-surface border border-ink-200 rounded-xl">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm font-semibold text-ink-700">{s.count}</span>
                  <span className="text-xs text-ink-400">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard icon={BedDouble}    label="Total city beds"   value={totalBeds.toLocaleString()} sub={`${totalAvail.toLocaleString()} available`} tone="ink" />
            <KpiCard icon={HeartPulse}   label="ICU utilization"   value={`${icuUtil}%`} sub={`${totalIcuAvail} of ${totalIcu} free`} tone={icuUtil >= 90 ? 'critical' : icuUtil >= 70 ? 'warning' : 'safe'} />
            <div id="ambulances" className="scroll-mt-28 min-h-0">
              <KpiCard icon={Truck} label="Active ambulances" value={activeAmbs} sub={`${ambulances.length} total fleet`} tone="brand" />
            </div>
            <KpiCard icon={Bell}         label="Active alerts"     value={alerts.length} sub={alerts.length > 0 ? 'Requires attention' : 'City normal'} tone={alerts.length > 0 ? 'critical' : 'safe'} />
          </div>

          {/* Mass-casualty routing manifest banner */}
          <AnimatePresence>
            {latestManifest && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="card p-6 mb-6 border border-critical/20 bg-gradient-to-br from-surface to-critical-50/40"
              >
                <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-critical-50 flex items-center justify-center flex-shrink-0">
                      <Route size={20} className="text-critical" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-display font-bold text-ink-900">Mass-casualty routing manifest</h3>
                        <span className="badge badge-critical">
                          <Users size={11} /> {latestManifest.patientCount} patients
                        </span>
                      </div>
                      <p className="text-sm text-ink-600">{latestManifest.message}</p>
                      {latestManifest.location && (
                        <p className="text-xs text-ink-400 mt-1 flex items-center gap-1.5">
                          <MapPin size={11} />
                          {latestManifest.location.lat.toFixed(4)}, {latestManifest.location.lng.toFixed(4)}
                          <span className="mx-1">•</span>
                          radius {latestManifest.affectedRadius || 0} km
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setLatestManifest(null)}
                    className="text-ink-400 hover:text-ink-700 p-1.5 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {latestManifest.routingManifest.map((m, i) => (
                    <motion.div
                      key={`${m.hospitalId}-${i}`}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-surface rounded-2xl border border-ink-200 p-4 shadow-soft"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="badge badge-brand">#{i + 1}</span>
                        <span className="label">{m.distanceKm} km</span>
                      </div>
                      <div className="font-display font-semibold text-ink-900 truncate" title={m.hospitalName}>
                        {m.hospitalName}
                      </div>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="font-display font-bold text-3xl text-critical leading-none">
                          {m.allocatedPatients}
                        </span>
                        <span className="text-xs text-ink-500 mb-0.5">patients</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-ink-500">
                        <span>{m.availableBedsBefore} beds</span>
                        <ArrowRight size={12} className="text-ink-400" />
                        <span className="text-safe font-semibold">{m.availableBedsAfter} after intake</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {latestManifest.unallocatedPatients > 0 && (
                  <div className="mt-4 flex items-start gap-2 p-3 bg-warning-50 border border-warning/20 rounded-xl">
                    <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-ink-700">
                      <span className="font-semibold text-warning">{latestManifest.unallocatedPatients} patient{latestManifest.unallocatedPatients === 1 ? '' : 's'}</span>{' '}
                      could not be allocated within the radius. Consider expanding the radius or routing manually.
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map + Alerts panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Map */}
            <div id="hospitals" className="lg:col-span-2 card overflow-hidden scroll-mt-28" style={{ height: '500px' }}>
              <div className="px-5 py-3.5 border-b border-ink-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
                  <span className="font-semibold text-sm text-ink-900">
                    {pickMode ? 'Click on the map to drop an incident pin…' : 'Live city hospital map'}
                  </span>
                </div>
                <span className="label">{hospitals.length} facilities</span>
              </div>
              <MapContainer
                center={[12.9716, 77.5946]} zoom={11}
                style={{ height: 'calc(100% - 50px)', cursor: pickMode ? 'crosshair' : 'grab' }}
              >
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <ClickToPin
                  enabled={pickMode}
                  onPick={(loc) => { setAlertForm((f) => ({ ...f, location: loc })); setPickMode(false); }}
                />
                {alertForm.location && (
                  <>
                    <Marker position={[alertForm.location.lat, alertForm.location.lng]} icon={incidentIcon}>
                      <Popup>Incident location</Popup>
                    </Marker>
                    <Circle
                      center={[alertForm.location.lat, alertForm.location.lng]}
                      radius={alertForm.affectedRadius * 1000}
                      pathOptions={{ color: '#E11D48', fillColor: '#E11D48', fillOpacity: 0.04 }}
                    />
                  </>
                )}
                {hospitals.map(h => {
                  const pct = occPct(h);
                  return (
                    <Marker key={h._id} position={[h.location.lat, h.location.lng]} icon={dotIcon(pct)}>
                      <Popup>
                        <div className="font-sans" style={{ minWidth: '180px' }}>
                          <strong className="text-ink-900 font-display">{h.name}</strong><br />
                          <span className="text-ink-500 text-xs capitalize">{h.type}</span><br />
                          <span className="text-ink-500 text-xs">Beds: {h.availableBeds}/{h.totalBeds}</span><br />
                          <span className="text-ink-500 text-xs">ICU: {h.icuAvailable}/{h.icuTotal}</span><br />
                          <span className="font-bold mt-1 inline-block" style={{ color: pct >= 90 ? '#E11D48' : pct >= 70 ? '#D97706' : '#059669' }}>
                            {Math.round(pct)}% occupied
                          </span>
                        </div>
                      </Popup>
                      {pct >= 90 && <Circle center={[h.location.lat, h.location.lng]} radius={1500} color="#E11D48" fillColor="#E11D48" fillOpacity={0.06} />}
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Alert panel */}
            <div id="alerts" className="space-y-4 scroll-mt-28">
              <div className="card p-5 border border-critical-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-critical-50 flex items-center justify-center">
                    <AlertTriangle size={18} className="text-critical" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-ink-900">Trigger alert</h3>
                    <p className="text-xs text-ink-400">Broadcast to all city dashboards.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="label block mb-1.5">Type</label>
                    <select
                      value={alertForm.type}
                      onChange={e => setAlertForm({ ...alertForm, type: e.target.value })}
                      className="input"
                    >
                      <option value="mass_casualty">Mass casualty</option>
                      <option value="resource_critical">Resource critical</option>
                      <option value="system">System alert</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label block mb-1.5">Radius (km)</label>
                      <input
                        type="number" min={1} max={100}
                        value={alertForm.affectedRadius}
                        onChange={e => setAlertForm({ ...alertForm, affectedRadius: +e.target.value })}
                        className="input"
                      />
                    </div>
                    {alertForm.type === 'mass_casualty' && (
                      <div>
                        <label className="label block mb-1.5">Patients</label>
                        <input
                          type="number" min={1} max={500}
                          value={alertForm.patientCount}
                          onChange={e => setAlertForm({ ...alertForm, patientCount: +e.target.value })}
                          className="input"
                        />
                      </div>
                    )}
                  </div>

                  {alertForm.type === 'mass_casualty' && (
                    <div>
                      <label className="label block mb-1.5">Incident location</label>
                      <button
                        type="button"
                        onClick={() => setPickMode((p) => !p)}
                        className={`w-full flex items-center justify-between gap-2 p-3 rounded-lg border transition-colors ${
                          pickMode
                            ? 'border-brand bg-brand-50 text-brand'
                            : alertForm.location
                            ? 'border-ink-200 bg-surface text-ink-700'
                            : 'border-ink-200 bg-ink-100 text-ink-500 hover:border-ink-300'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Crosshair size={14} />
                          {pickMode
                            ? 'Click on the map to drop a pin'
                            : alertForm.location
                            ? `${alertForm.location.lat.toFixed(4)}, ${alertForm.location.lng.toFixed(4)}`
                            : 'Pick incident location on the map'}
                        </span>
                        {alertForm.location && !pickMode && (
                          <span className="badge badge-safe">Pinned</span>
                        )}
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="label block mb-1.5">Message</label>
                    <textarea
                      rows={3}
                      value={alertForm.message}
                      onChange={e => setAlertForm({ ...alertForm, message: e.target.value })}
                      placeholder="Incident summary and instructions for connected consoles"
                      className="input resize-none"
                    />
                  </div>
                  <button
                    onClick={handleTrigger}
                    disabled={triggering || !alertForm.message.trim()}
                    className="btn-danger w-full"
                  >
                    <Send size={16} />
                    {triggering ? 'Broadcasting…' : 'Broadcast alert'}
                  </button>
                </div>
              </div>

              {/* Active alerts */}
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-ink-200 flex items-center justify-between">
                  <span className="font-semibold text-sm text-ink-900">Active alerts</span>
                  <span className="badge badge-ink">{alerts.length}</span>
                </div>
                <div className="p-3 max-h-56 overflow-y-auto space-y-2">
                  {alerts.length === 0 ? (
                    <div className="text-center py-6 text-sm text-ink-400">No active alerts</div>
                  ) : (
                    <AnimatePresence>
                      {alerts.map((a, i) => (
                        <motion.div
                          key={a._id || i}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                          className="p-3 bg-critical-50 border border-critical-100 rounded-xl"
                        >
                          <div className="flex justify-between gap-2">
                            <div className="min-w-0">
                              <span className="badge badge-critical text-[10px] capitalize">{a.type?.replace('_', ' ')}</span>
                              <p className="text-sm text-ink-900 mt-1.5 break-words">{a.message}</p>
                              <p className="text-xs text-ink-400 mt-1">
                                Radius: {a.affectedRadius}km
                                {a.patientCount > 0 && ` • ${a.patientCount} patients`}
                              </p>
                              {a.routingManifest?.length > 0 && (
                                <button
                                  onClick={() => setLatestManifest(a)}
                                  className="text-xs text-brand font-semibold mt-1.5 hover:underline flex items-center gap-1"
                                >
                                  <Route size={11} /> View routing manifest
                                </button>
                              )}
                            </div>
                            {a._id && (
                              <button onClick={() => deactivate(a._id)} className="text-ink-400 hover:bg-critical-100 hover:text-critical p-1 rounded flex-shrink-0">
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Trend chart */}
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display font-semibold text-ink-900">Occupancy trend</h3>
                <p className="text-xs text-ink-400 mt-0.5">Last 24 hours • Top 6 hospitals</p>
              </div>
              <Activity size={18} className="text-brand" />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 12px 32px rgba(15,23,42,0.08)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#475569', paddingTop: '8px' }} />
                {hospitals.slice(0, 6).map((h, i) => (
                  <Line
                    key={h._id}
                    type="monotone"
                    dataKey={h.name.split(' ')[0]}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Hospital list (replacing dense table with grid) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-xl text-ink-900">All facilities</h3>
              <span className="label">Live status</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hospitals.map((h, i) => {
                const pct = Math.round(occPct(h));
                const tone = pct >= 90 ? 'critical' : pct >= 70 ? 'warning' : 'safe';
                const toneCls  = pct >= 90 ? 'badge-critical' : pct >= 70 ? 'badge-warning' : 'badge-safe';
                const barColor = pct >= 90 ? '#E11D48' : pct >= 70 ? '#D97706' : '#059669';
                return (
                  <motion.div
                    key={h._id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="card card-hover p-5"
                  >
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-display font-semibold text-ink-900 truncate">{h.name}</h4>
                        <p className="text-xs text-ink-400 mt-0.5 capitalize">{h.type.replace('_', ' ')}</p>
                      </div>
                      <span className={`badge ${toneCls}`}>{pct}%</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-ink-100 rounded-lg p-2.5">
                        <div className="text-[10px] font-medium text-ink-400 uppercase tracking-wider">Beds</div>
                        <div className="font-display font-bold text-ink-900">
                          {h.availableBeds}<span className="text-ink-400 font-medium text-sm">/{h.totalBeds}</span>
                        </div>
                      </div>
                      <div className="bg-brand-50 rounded-lg p-2.5">
                        <div className="text-[10px] font-medium text-brand uppercase tracking-wider">ICU</div>
                        <div className="font-display font-bold text-brand">
                          {h.icuAvailable}<span className="text-brand/50 font-medium text-sm">/{h.icuTotal}</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-ink-100 rounded-full overflow-hidden mb-3">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className={`flex items-center gap-1 ${h.resources?.oxygen ? 'text-safe' : 'text-ink-300'}`} title="Oxygen">
                        <Wind size={12} /> {h.resources?.oxygen ? '✓' : '✕'}
                      </span>
                      <span className={`flex items-center gap-1 ${h.resources?.bloodBank ? 'text-safe' : 'text-ink-300'}`} title="Blood bank">
                        <Droplet size={12} /> {h.resources?.bloodBank ? '✓' : '✕'}
                      </span>
                      <span className="flex items-center gap-1 text-ink-500" title="Ventilators">
                        <Activity size={12} /> {h.resources?.ventilators}
                      </span>
                      <span className="ml-auto text-ink-400 truncate">{h.location.address.split(',')[0]}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <section id="settings" className="scroll-mt-28 mt-12 pt-8 border-t border-ink-200">
            <p className="text-xs text-ink-400">
              Non-production staging: if demo logins fail, run <code className="text-ink-600">GET /api/seed</code> once, then sign in again.
            </p>
          </section>
        </PageTransition>
      </main>
    </div>
  );
};

export default AdminDashboard;
