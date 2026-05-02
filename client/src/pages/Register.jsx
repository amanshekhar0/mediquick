import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, AlertCircle, Hospital } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

/** Normalize pasted JSON / noisy clipboard text into a 24-char hex id for display & submit */
function coerceHospitalIdPaste(raw) {
  if (!raw || !String(raw).trim()) return '';
  const t = String(raw).trim();
  try {
    if (t.startsWith('{')) {
      const o = JSON.parse(t);
      if (o && typeof o === 'object' && o.hospitalId != null) return String(o.hospitalId).trim();
    }
  } catch {
    /* ignore */
  }
  const m = t.match(/[a-fA-F0-9]{24}/);
  return m ? m[0] : t;
}

const ROLES = [
  { value: 'patient',         label: 'Patient',         desc: 'Submit symptoms and request transport' },
  { value: 'hospital_admin',  label: 'Hospital Admin',  desc: 'Maintain beds, inventory, and live inpatient telemetry' },
  { value: 'system_admin',    label: 'System Admin',    desc: 'Regional alerting, routing manifests, and fleet oversight' },
  { value: 'volunteer',       label: 'CPR Volunteer',   desc: 'Receive proximity alerts for eligible critical incidents' },
  { value: 'paramedic',       label: 'Paramedic',       desc: 'Stream structured vitals to receiving facilities' },
];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient', hospitalId: '' });
  const [hospitals, setHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (form.role !== 'hospital_admin') return;
    let cancelled = false;
    setHospitalsLoading(true);
    api
      .get('/hospitals')
      .then(({ data }) => {
        if (!cancelled) setHospitals(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setHospitals([]);
      })
      .finally(() => {
        if (!cancelled) setHospitalsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const payload = { ...form };
      if (payload.role === 'hospital_admin') {
        const hid = String(payload.hospitalId || '').trim();
        if (!hid) {
          setError('Select your hospital from the list, or paste a valid facility ID below.');
          setLoading(false);
          return;
        }
        payload.hospitalId = hid;
      } else {
        delete payload.hospitalId;
      }
      const user = await register(payload);
      const redirects = {
        patient: '/patient',
        hospital_admin: '/hospital-admin',
        system_admin: '/admin',
        volunteer: '/volunteer',
        paramedic: '/ambulance',
      };
      navigate(redirects[user.role] || '/patient');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Left — illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand to-brand-800 relative overflow-hidden p-12 flex-col justify-between">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_80%,_white_0%,_transparent_50%)] pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full pointer-events-none" />

        <Logo to="/" />

        <div className="relative">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-4xl xl:text-5xl font-bold text-white leading-tight max-w-md"
          >
            Provision access for your organization
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-brand-50/90 text-lg mt-5 max-w-md"
          >
            Accounts are created with a role that determines dashboard capabilities, data scope, and API permissions.
          </motion.p>
        </div>

        <div className="relative text-brand-50/60 text-sm">
          © {new Date().getFullYear()} MediEquip 2.0
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md py-8"
        >
          <div className="lg:hidden mb-6 flex justify-center">
            <Logo />
          </div>

          <div className="mb-7">
            <h2 className="font-display font-bold text-3xl text-ink-900">Register</h2>
            <p className="text-ink-500 mt-2">Complete all fields. Hospital administrators require a facility identifier from your onboarding package.</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-start gap-3 p-3.5 bg-critical-50 border border-critical-100 rounded-lg mb-5"
            >
              <AlertCircle size={18} className="text-critical flex-shrink-0 mt-0.5" />
              <span className="text-sm text-critical-700">{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div>
              <label htmlFor="register-name" className="block text-sm font-semibold text-ink-700 mb-1.5">Full name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
                <input
                  id="register-name"
                  name="name"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Legal name"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className="block text-sm font-semibold text-ink-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="name@organization.org"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className="block text-sm font-semibold text-ink-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
                <input
                  id="register-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Strong password (min. 8 characters)"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <span id="register-role-legend" className="block text-sm font-semibold text-ink-700 mb-2">Account type</span>
              <div className="space-y-2" role="radiogroup" aria-labelledby="register-role-legend">
                {ROLES.map(r => (
                  <label
                    key={r.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      form.role === r.value
                        ? 'border-brand bg-brand-50 ring-1 ring-brand/20'
                        : 'border-ink-200 hover:border-ink-300 hover:bg-ink-100'
                    }`}
                  >
                    <input
                      id={`register-role-${r.value}`}
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={form.role === r.value}
                      onChange={() =>
                      setForm((f) => ({
                        ...f,
                        role: r.value,
                        hospitalId: r.value === 'hospital_admin' ? f.hospitalId : '',
                      }))
                    }
                      className="mt-1 text-brand focus:ring-brand"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-ink-900">{r.label}</div>
                      <div className="text-xs text-ink-500 mt-0.5">{r.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {form.role === 'hospital_admin' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                <div>
                  <label htmlFor="register-hospital" className="block text-sm font-semibold text-ink-700 mb-1.5">Your facility</label>
                  <div className="relative">
                    <Hospital size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 z-10" aria-hidden />
                    <select
                      id="register-hospital"
                      name="hospitalId"
                      disabled={hospitalsLoading}
                      value={
                        hospitals.some((h) => String(h._id) === String(form.hospitalId))
                          ? String(form.hospitalId)
                          : ''
                      }
                      onChange={(e) => setForm({ ...form, hospitalId: e.target.value })}
                      className="input pl-10 w-full appearance-none"
                    >
                      <option value="">{hospitalsLoading ? 'Loading hospitals…' : 'Select your hospital'}</option>
                      {hospitals.map((h) => (
                        <option key={h._id} value={h._id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-ink-500 mt-1.5">List comes from the live directory (GET /api/hospitals). Staging: run GET /api/seed first if the list is empty.</p>
                </div>
                <details className="group">
                  <summary className="text-sm text-brand font-medium cursor-pointer list-none flex items-center gap-1">
                    <span className="group-open:rotate-90 transition-transform">▸</span> Paste facility ID instead
                  </summary>
                  <div className="relative mt-2">
                    <label htmlFor="register-hospital-paste" className="sr-only">Facility ID (paste)</label>
                    <Hospital size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
                    <input
                      id="register-hospital-paste"
                      name="hospitalIdPaste"
                      autoComplete="off"
                      value={form.hospitalId}
                      onChange={(e) => setForm({ ...form, hospitalId: e.target.value })}
                      onBlur={(e) => setForm({ ...form, hospitalId: coerceHospitalIdPaste(e.target.value) })}
                      placeholder="24-character ID, or paste JSON from the API"
                      className="input pl-10"
                    />
                  </div>
                </details>
              </motion.div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
              {loading ? 'Creating your account…' : (<>Create account <ArrowRight size={16} /></>)}
            </button>
          </form>

          <p className="text-center text-sm text-ink-500 mt-6">
            Already registered?{' '}
            <Link to="/login" className="text-brand font-semibold hover:underline">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
