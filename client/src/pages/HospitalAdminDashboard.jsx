import { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend,
} from 'recharts';
import {
  BedDouble, HeartPulse, Wind, Droplet, Wrench, Wifi, Check, AlertCircle, Radio, MapPin,
  Package, Plus, Trash2, Edit3, Save, X as XIcon, Activity, Search,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../lib/socket';
import api from '../lib/api';

// ─────────────────────── Reusable atoms ───────────────────────

const KpiCard = ({ icon: Icon, label, value, sub, tone = 'brand' }) => {
  const tones = {
    brand:    { bg: 'bg-brand-50',    text: 'text-brand'    },
    safe:     { bg: 'bg-safe-50',     text: 'text-safe'     },
    warning:  { bg: 'bg-warning-50',  text: 'text-warning'  },
    critical: { bg: 'bg-critical-50', text: 'text-critical' },
    ink:      { bg: 'bg-ink-100',     text: 'text-ink-600'  },
  };
  const t = tones[tone];
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="label">{label}</div>
          <div className="font-display font-bold text-3xl text-ink-900 mt-2 leading-none">{value}</div>
          {sub && <div className="text-sm text-ink-500 mt-1.5">{sub}</div>}
        </div>
        <div className={`w-11 h-11 rounded-2xl ${t.bg} flex items-center justify-center`}>
          <Icon size={20} className={t.text} />
        </div>
      </div>
    </div>
  );
};

const SliderRow = ({ label, val, max, onChange, accent }) => (
  <div className="mb-6">
    <div className="flex justify-between items-baseline mb-2">
      <span className="label">{label}</span>
      <span className="font-display font-bold text-lg text-ink-900">
        {val} <span className="text-ink-400 text-sm font-medium">/ {max}</span>
      </span>
    </div>
    <input type="range" min={0} max={max} value={val} onChange={e => onChange(+e.target.value)} className="w-full" />
    <div className="w-full h-1.5 bg-ink-100 rounded-full mt-2 overflow-hidden">
      <motion.div
        animate={{ width: `${max > 0 ? (val / max) * 100 : 0}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ background: accent || '#0F766E' }}
      />
    </div>
  </div>
);

const ToggleCard = ({ label, icon: Icon, value, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`flex items-center gap-4 p-4 rounded-2xl border w-full text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand ${
      value
        ? 'bg-safe-50 border-safe-100 shadow-soft'
        : 'bg-ink-100 border-ink-200 hover:bg-surface'
    }`}
  >
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${value ? 'bg-safe text-white' : 'bg-surface text-ink-400'}`}>
      <Icon size={20} />
    </div>
    <div className="flex-1 min-w-0">
      <div className={`font-semibold ${value ? 'text-ink-900' : 'text-ink-700'}`}>{label}</div>
      <div className={`text-xs ${value ? 'text-safe' : 'text-ink-400'} font-medium mt-0.5`}>
        {value ? 'Operational' : 'Unavailable'}
      </div>
    </div>
    <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${value ? 'bg-safe' : 'bg-ink-300'}`}>
      <motion.div
        animate={{ x: value ? 16 : 0 }}
        transition={{ duration: 0.2 }}
        className="w-5 h-5 rounded-full bg-white shadow-soft"
      />
    </div>
  </button>
);

// ─────────────────────── Inventory section ───────────────────────

const CATEGORY_TONES = {
  blood:      { bg: 'bg-critical-50',  text: 'text-critical', label: 'Blood' },
  vaccine:    { bg: 'bg-warning-50',   text: 'text-warning',  label: 'Vaccine' },
  medication: { bg: 'bg-brand-50',     text: 'text-brand',    label: 'Medication' },
  equipment:  { bg: 'bg-safe-50',      text: 'text-safe',     label: 'Equipment' },
  antivenom:  { bg: 'bg-warning-50',   text: 'text-warning',  label: 'Antivenom' },
  other:      { bg: 'bg-ink-100',      text: 'text-ink-600',  label: 'Other' },
};

const InventorySection = ({ hospitalId, inventory, onChange }) => {
  const [searchQ, setSearchQ] = useState('');
  const [draft, setDraft]     = useState({ itemName: '', quantity: 0, category: 'other' });
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState({ itemName: '', quantity: 0, category: 'other' });
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  const filtered = useMemo(() => {
    if (!searchQ.trim()) return inventory;
    const q = searchQ.toLowerCase();
    return inventory.filter((i) => i.itemName.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }, [inventory, searchQ]);

  const handleAdd = async () => {
    if (!draft.itemName.trim()) { setErr('Item name is required'); return; }
    setBusy(true); setErr('');
    try {
      const { data } = await api.post(`/hospitals/${hospitalId}/inventory`, draft);
      onChange(data);
      setDraft({ itemName: '', quantity: 0, category: 'other' });
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to add item');
    } finally { setBusy(false); }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setBusy(true); setErr('');
    try {
      const { data } = await api.put(`/hospitals/${hospitalId}/inventory/${editingId}`, editVal);
      onChange(data);
      setEditingId(null);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to update item');
    } finally { setBusy(false); }
  };

  const handleDelete = async (itemId) => {
    setBusy(true); setErr('');
    try {
      const { data } = await api.delete(`/hospitals/${hospitalId}/inventory/${itemId}`);
      onChange(data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to remove item');
    } finally { setBusy(false); }
  };

  return (
    <div id="inventory" className="card p-6 scroll-mt-28">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center">
            <Package size={18} className="text-brand" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-ink-900">Medical inventory</h2>
            <p className="text-xs text-ink-400">Granular stock — patients can search across the city in real time.</p>
          </div>
        </div>
        <span className="badge badge-ink">{inventory.length} items</span>
      </div>

      {/* Add form */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-4 rounded-2xl bg-ink-100 mb-5">
        <input
          value={draft.itemName}
          onChange={(e) => setDraft({ ...draft, itemName: e.target.value })}
          placeholder="Catalog item name"
          className="input sm:col-span-5"
        />
        <input
          type="number" min={0}
          value={draft.quantity}
          onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })}
          placeholder="Quantity"
          className="input sm:col-span-2"
        />
        <select
          value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          className="input sm:col-span-3"
        >
          {Object.entries(CATEGORY_TONES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={busy}
          className="btn-primary sm:col-span-2"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {err && (
        <div className="flex items-start gap-2 p-3 bg-critical-50 border border-critical/20 rounded-lg mb-4">
          <AlertCircle size={16} className="text-critical flex-shrink-0 mt-0.5" />
          <span className="text-sm text-critical-700">{err}</span>
        </div>
      )}

      {/* Filter */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Filter by name or category"
          className="input pl-9"
        />
      </div>

      {/* Table-grid */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-ink-400">
            {inventory.length === 0 ? 'No inventory items yet — add your first item above.' : 'No items match your filter.'}
          </div>
        ) : (
          filtered.map((item) => {
            const tone = CATEGORY_TONES[item.category] || CATEGORY_TONES.other;
            const isEditing = editingId === item._id;

            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-3 rounded-xl border border-ink-200 hover:border-ink-300 transition-colors"
              >
                {isEditing ? (
                  <>
                    <input
                      value={editVal.itemName}
                      onChange={(e) => setEditVal({ ...editVal, itemName: e.target.value })}
                      className="input sm:col-span-5"
                    />
                    <input
                      type="number" min={0}
                      value={editVal.quantity}
                      onChange={(e) => setEditVal({ ...editVal, quantity: Number(e.target.value) })}
                      className="input sm:col-span-2"
                    />
                    <select
                      value={editVal.category}
                      onChange={(e) => setEditVal({ ...editVal, category: e.target.value })}
                      className="input sm:col-span-3"
                    >
                      {Object.entries(CATEGORY_TONES).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                    <div className="sm:col-span-2 flex gap-2">
                      <button onClick={handleSaveEdit} disabled={busy} className="btn-primary flex-1 py-2">
                        <Save size={14} /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-outline py-2">
                        <XIcon size={14} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="sm:col-span-5 flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl ${tone.bg} flex items-center justify-center flex-shrink-0`}>
                        <Package size={15} className={tone.text} />
                      </div>
                      <div className="font-semibold text-ink-900 truncate">{item.itemName}</div>
                    </div>
                    <div className="sm:col-span-2 font-display font-bold text-ink-900">
                      {item.quantity}
                      <span className="text-xs text-ink-400 font-medium ml-1">in stock</span>
                    </div>
                    <div className="sm:col-span-3">
                      <span className={`badge ${tone.bg} ${tone.text}`}>{tone.label}</span>
                    </div>
                    <div className="sm:col-span-2 flex gap-2 justify-end">
                      <button
                        onClick={() => { setEditingId(item._id); setEditVal({ itemName: item.itemName, quantity: item.quantity, category: item.category }); }}
                        className="btn-outline py-2"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-2 rounded-lg text-ink-500 hover:bg-critical-50 hover:text-critical transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─────────────────────── Live vitals (incoming ambulance) ───────────

/** Plausible demo waveform for staging when no ambulance socket feed is active */
const STAGING_VITALS_DEMO = Array.from({ length: 32 }, (_, i) => ({
  t: `${String(Math.floor(i / 2) % 24).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}`,
  hr: 72 + Math.round(10 * Math.sin(i / 3.2)),
  spo2: 95 + (i % 4),
  bpSys: 118 + (i % 9),
  bpDia: 74 + (i % 7),
}));

const LiveVitalsPanel = ({ hospitalId }) => {
  const [feeds, setFeeds] = useState({});       // { patientId: { vitals[], hospitalId, lastUpdated } }
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (!hospitalId) return;
    const s = getSocket();
    const onVitals = (data) => {
      if (!data?.vitals || !data.patientId) return;
      setFeeds((prev) => {
        const existing = prev[data.patientId] || { history: [], hospitalId: data.hospitalId };
        const point = {
          t: new Date(data.timestamp || Date.now()).toLocaleTimeString(),
          ...data.vitals,
        };
        const history = [...existing.history, point].slice(-60);
        return {
          ...prev,
          [data.patientId]: { history, hospitalId: data.hospitalId, lastUpdated: Date.now() },
        };
      });
      setActiveId((a) => a || data.patientId);
    };
    s.on('ambulance:vitals', onVitals);
    return () => s.off('ambulance:vitals', onVitals);
  }, [hospitalId]);

  const patientIds = Object.keys(feeds);
  const active = activeId ? feeds[activeId] : null;
  const last = active?.history?.[active.history.length - 1];

  const demoLast = STAGING_VITALS_DEMO[STAGING_VITALS_DEMO.length - 1];

  return (
    <div id="vitals" className="card p-6 scroll-mt-28">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-critical-50 flex items-center justify-center">
            <HeartPulse size={18} className="text-critical" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-ink-900">Pre-arrival vitals</h2>
            <p className="text-xs text-ink-400">Live stream from inbound ambulances en route to your facility.</p>
          </div>
        </div>
        {patientIds.length > 0 && (
          <span className={`badge ${active && Date.now() - active.lastUpdated < 8000 ? 'badge-safe' : 'badge-warning'}`}>
            <Activity size={11} /> {patientIds.length} active
          </span>
        )}
      </div>

      {patientIds.length === 0 ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-brand/20 bg-brand-50/60 px-4 py-3 text-sm text-ink-700">
            <span className="font-semibold text-brand">Staging preview</span>
            <span className="text-ink-600">
              {' '}
              — representative telemetry for demos. Live traces replace this when a paramedic streams from the Ambulance console to this facility.
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-critical-50 rounded-xl p-3">
              <div className="text-[10px] font-medium text-critical uppercase tracking-wider">Heart rate</div>
              <div className="font-display font-bold text-2xl text-critical mt-1">{demoLast.hr}<span className="text-xs font-medium ml-1">bpm</span></div>
            </div>
            <div className="bg-brand-50 rounded-xl p-3">
              <div className="text-[10px] font-medium text-brand uppercase tracking-wider">SpO₂</div>
              <div className="font-display font-bold text-2xl text-brand mt-1">{demoLast.spo2}<span className="text-xs font-medium ml-1">%</span></div>
            </div>
            <div className="bg-warning-50 rounded-xl p-3">
              <div className="text-[10px] font-medium text-warning uppercase tracking-wider">BP Sys</div>
              <div className="font-display font-bold text-2xl text-warning mt-1">{demoLast.bpSys}<span className="text-xs font-medium ml-1">mmHg</span></div>
            </div>
            <div className="bg-warning-50 rounded-xl p-3">
              <div className="text-[10px] font-medium text-warning uppercase tracking-wider">BP Dia</div>
              <div className="font-display font-bold text-2xl text-warning mt-1">{demoLast.bpDia}<span className="text-xs font-medium ml-1">mmHg</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={STAGING_VITALS_DEMO}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#94A3B8' }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#475569' }} />
              <Line type="monotone" dataKey="hr" stroke="#E11D48" dot={false} strokeWidth={2.5} name="HR" isAnimationActive={false} />
              <Line type="monotone" dataKey="spo2" stroke="#0F766E" dot={false} strokeWidth={2.5} name="SpO₂" isAnimationActive={false} />
              <Line type="monotone" dataKey="bpSys" stroke="#D97706" dot={false} strokeWidth={2} name="BP Sys" isAnimationActive={false} />
              <Line type="monotone" dataKey="bpDia" stroke="#94A3B8" dot={false} strokeWidth={2} name="BP Dia" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <>
          {/* Patient tabs */}
          {patientIds.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {patientIds.map((pid) => (
                <button
                  key={pid}
                  onClick={() => setActiveId(pid)}
                  className={`badge whitespace-nowrap ${pid === activeId ? 'badge-brand' : 'badge-ink'}`}
                >
                  Patient {pid}
                </button>
              ))}
            </div>
          )}

          {/* Last reading summary */}
          {last && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-critical-50 rounded-xl p-3">
                <div className="text-[10px] font-medium text-critical uppercase tracking-wider">Heart rate</div>
                <div className="font-display font-bold text-2xl text-critical mt-1">{last.hr}<span className="text-xs font-medium ml-1">bpm</span></div>
              </div>
              <div className="bg-brand-50 rounded-xl p-3">
                <div className="text-[10px] font-medium text-brand uppercase tracking-wider">SpO₂</div>
                <div className="font-display font-bold text-2xl text-brand mt-1">{last.spo2}<span className="text-xs font-medium ml-1">%</span></div>
              </div>
              <div className="bg-warning-50 rounded-xl p-3">
                <div className="text-[10px] font-medium text-warning uppercase tracking-wider">BP Sys</div>
                <div className="font-display font-bold text-2xl text-warning mt-1">{last.bpSys}<span className="text-xs font-medium ml-1">mmHg</span></div>
              </div>
              <div className="bg-warning-50 rounded-xl p-3">
                <div className="text-[10px] font-medium text-warning uppercase tracking-wider">BP Dia</div>
                <div className="font-display font-bold text-2xl text-warning mt-1">{last.bpDia}<span className="text-xs font-medium ml-1">mmHg</span></div>
              </div>
            </div>
          )}

          {/* EKG-style chart */}
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={active?.history || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#475569' }} />
              <Line type="monotone" dataKey="hr"    stroke="#E11D48" dot={false} strokeWidth={2.5} name="HR" isAnimationActive={false} />
              <Line type="monotone" dataKey="spo2"  stroke="#0F766E" dot={false} strokeWidth={2.5} name="SpO₂" isAnimationActive={false} />
              <Line type="monotone" dataKey="bpSys" stroke="#D97706" dot={false} strokeWidth={2}   name="BP Sys" isAnimationActive={false} />
              <Line type="monotone" dataKey="bpDia" stroke="#94A3B8" dot={false} strokeWidth={2}   name="BP Dia" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
};

// ─────────────────────── Main page ───────────────────────

const HospitalAdminDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [hospital, setHospital] = useState(null);
  const [form, setForm]         = useState({ availableBeds: 0, icuAvailable: 0, oxygen: true, bloodBank: true, ventilators: 0 });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const hospitalId = user?.hospitalId;

  useEffect(() => {
    if (!hospitalId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get(`/hospitals/${hospitalId}`)
      .then(({ data }) => {
        if (cancelled) return;
        setHospital(data);
        setForm({
          availableBeds: data.availableBeds,
          icuAvailable:  data.icuAvailable,
          oxygen:        data.resources?.oxygen ?? true,
          bloodBank:     data.resources?.bloodBank ?? true,
          ventilators:   data.resources?.ventilators ?? 0,
        });
      })
      .catch(() => {
        if (!cancelled) setHospital(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hospitalId]);

  const scrollMainToHash = (hashSource) => {
    const raw = typeof hashSource === 'string' ? hashSource : hashSource?.hash ?? window.location.hash;
    const id = String(raw || '').replace(/^#/, '');
    if (!id) return;
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  useLayoutEffect(() => {
    if (loading || !hospital) return;
    scrollMainToHash(location.hash);
  }, [loading, hospital, location.pathname, location.hash]);

  useEffect(() => {
    if (loading || !hospital) return;
    const onHashChange = () => scrollMainToHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [loading, hospital]);

  useEffect(() => {
    if (!hospitalId) return;
    const s = getSocket();
    s.emit('hospital:join_room', hospitalId);
    s.on('hospital:update', d => { if (d.hospitalId === hospitalId) setHospital(p => p ? { ...p, ...d } : p); });
    s.on('hospital:capacity_warning', d => { if (d.hospitalId === hospitalId) console.warn(`Capacity Warning: ${d.occupancyPercent}% occupancy.`); });
    return () => { s.off('hospital:update'); s.off('hospital:capacity_warning'); };
  }, [hospitalId]);

  const handleSave = async () => {
    setSaving(true); setSavedMsg('');
    try {
      const { data } = await api.put(`/hospitals/${hospitalId}/resources`, {
        availableBeds: Number(form.availableBeds),
        icuAvailable:  Number(form.icuAvailable),
        resources: { oxygen: form.oxygen, bloodBank: form.bloodBank, ventilators: Number(form.ventilators) },
      });
      setHospital(data);
      setSavedMsg('Resources updated and broadcast to all connected clients.');
      setTimeout(() => setSavedMsg(''), 5000);
    } catch (err) { window.alert(err.response?.data?.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  const handleInventoryChange = (newInventory) => {
    setHospital((p) => p ? { ...p, inventory: newInventory } : p);
  };

  if (loading) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="text-ink-500 animate-pulse">Loading facility data…</div>
    </div>
  );

  if (!hospitalId) {
    return (
      <div className="min-h-screen bg-canvas flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-12">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-warning-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-warning" size={28} />
            </div>
            <h2 className="font-display font-bold text-xl text-ink-900">No facility linked to this account</h2>
            <p className="text-ink-500 mt-2 text-sm">
              Sign in as the seeded hospital admin (<span className="text-ink-700">hospital.admin@mediequip.ai</span>) or run{' '}
              <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">GET /api/seed</code> and log in again so your user gets a{' '}
              <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">hospitalId</code>.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!hospital) return (
    <div className="min-h-screen bg-canvas flex">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center p-12">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-critical-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-critical" size={28} />
          </div>
          <h2 className="font-display font-bold text-xl text-ink-900">Hospital not found</h2>
          <p className="text-ink-500 mt-2 text-sm">This facility id is missing from the database. Run GET /api/seed for a fresh staging dataset.</p>
        </div>
      </main>
    </div>
  );

  const occupancy = hospital.totalBeds > 0
    ? Math.round(((hospital.totalBeds - hospital.availableBeds) / hospital.totalBeds) * 100) : 0;

  const occHex   = occupancy >= 90 ? '#E11D48' : occupancy >= 70 ? '#D97706' : '#059669';
  const occText  = occupancy >= 90 ? 'text-critical' : occupancy >= 70 ? 'text-warning' : 'text-safe';
  const occLabel = occupancy >= 90 ? 'Critical capacity' : occupancy >= 70 ? 'Limited' : 'Comfortable';

  const gaugeData   = [{ value: 100, fill: '#F1F5F9' }, { value: occupancy, fill: occHex }];
  const historyData = (hospital.occupancyHistory || []).slice(-24).map((h, i) => ({
    hour: `${i}h`, occupancy: h.occupancyPercent,
  }));

  return (
    <div className="min-h-screen bg-canvas flex">
      <Sidebar />

      <main className="flex-1 min-w-0">
        <PageTransition className="max-w-6xl mx-auto px-6 lg:px-10 py-8">
          {/* Page header */}
          <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="font-display font-bold text-3xl text-ink-900">{hospital.name}</h1>
              <p className="text-ink-500 mt-1.5 flex items-center gap-1.5">
                <MapPin size={14} /> {hospital.location.address}
                <span className="mx-1 text-ink-300">•</span>
                <span className="capitalize">{hospital.type.replace('_', ' ')}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-safe-50 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
              <span className="text-sm font-semibold text-safe">Facility online</span>
            </div>
          </div>

          {/* KPI Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard icon={BedDouble}  label="Total beds"     value={hospital.totalBeds}     tone="ink" />
            <KpiCard icon={Check}      label="Available"      value={hospital.availableBeds} sub="bed capacity" tone="safe" />
            <KpiCard icon={HeartPulse} label="ICU available"  value={hospital.icuAvailable}  sub={`of ${hospital.icuTotal}`} tone="brand" />
            <KpiCard icon={AlertCircle} label="Occupancy"     value={`${occupancy}%`}        sub={occLabel} tone={occupancy >= 90 ? 'critical' : occupancy >= 70 ? 'warning' : 'safe'} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* ── Resource controls ── */}
            <div id="resources" className="xl:col-span-2 space-y-5 scroll-mt-28">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center">
                      <Wrench size={18} className="text-brand" />
                    </div>
                    <div>
                      <h2 className="font-display font-semibold text-ink-900">Live resource management</h2>
                      <p className="text-xs text-ink-400">Changes broadcast instantly to all connected dashboards.</p>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {savedMsg && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 p-3 bg-safe-50 border border-safe-100 rounded-lg mb-5"
                    >
                      <Check size={16} className="text-safe flex-shrink-0" />
                      <span className="text-sm text-safe font-medium">{savedMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <SliderRow label="Available beds" val={form.availableBeds} max={hospital.totalBeds} onChange={v => setForm(f => ({ ...f, availableBeds: v }))} />
                <SliderRow label="ICU beds available" val={form.icuAvailable} max={hospital.icuTotal} onChange={v => setForm(f => ({ ...f, icuAvailable: v }))} />

                <div className="mb-6">
                  <label className="label block mb-2">Ventilators available</label>
                  <input
                    type="number" min={0} max={300}
                    value={form.ventilators}
                    onChange={e => setForm(f => ({ ...f, ventilators: +e.target.value }))}
                    className="input w-32"
                  />
                </div>

                <div className="mb-6">
                  <div className="label mb-3">Critical resources</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ToggleCard label="Oxygen supply" icon={Wind}    value={form.oxygen}    onChange={v => setForm(f => ({ ...f, oxygen: v }))} />
                    <ToggleCard label="Blood bank"    icon={Droplet} value={form.bloodBank} onChange={v => setForm(f => ({ ...f, bloodBank: v }))} />
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary w-full py-3 text-base"
                >
                  <Radio size={18} className={saving ? 'animate-pulse' : ''} />
                  {saving ? 'Broadcasting update…' : 'Broadcast resource update'}
                </button>
              </div>

              {/* Inventory CRUD */}
              <InventorySection
                hospitalId={hospitalId}
                inventory={hospital.inventory || []}
                onChange={handleInventoryChange}
              />

              {/* Live vitals */}
              <LiveVitalsPanel hospitalId={hospitalId} />

              {/* Specializations */}
              <div className="card p-6">
                <h3 className="font-display font-semibold text-ink-900 mb-4">Specializations</h3>
                <div className="flex flex-wrap gap-2">
                  {hospital.specializations?.map(s => (
                    <span key={s} className="badge badge-brand text-sm py-1.5 px-3">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right: Gauge + History ── */}
            <div id="settings" className="space-y-5 scroll-mt-28">
              {/* Gauge */}
              <div className="card p-6">
                <h3 className="font-display font-semibold text-ink-900 mb-2">Bed occupancy</h3>
                <div className="text-xs text-ink-400 mb-3">Current utilization</div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="80%" innerRadius="65%" outerRadius="95%" startAngle={180} endAngle={0} data={gaugeData}>
                      <RadialBar dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center -mt-12">
                  <div className={`font-display font-bold text-4xl ${occText}`}>{occupancy}%</div>
                  <div className="text-sm text-ink-500 mt-1">{occLabel}</div>
                </div>
              </div>

              {/* 24h history */}
              {historyData.length > 0 && (
                <div className="card p-6">
                  <h3 className="font-display font-semibold text-ink-900 mb-1">24-hour trend</h3>
                  <p className="text-xs text-ink-400 mb-3">Bed occupancy over time</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                      <Tooltip
                        contentStyle={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 12px 32px rgba(15,23,42,0.08)' }}
                        formatter={v => [`${v}%`, 'Occupancy']}
                      />
                      <Area type="monotone" dataKey="occupancy" stroke={occHex} fill={`${occHex}22`} strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Connection status */}
              <div className="card p-5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-safe-50 flex items-center justify-center">
                  <Wifi size={16} className="text-safe" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink-900">Real-time sync active</div>
                  <div className="text-xs text-ink-400">Connected to MediEquip 2.0 network</div>
                </div>
              </div>
            </div>
          </div>
        </PageTransition>
      </main>
    </div>
  );
};

export default HospitalAdminDashboard;
