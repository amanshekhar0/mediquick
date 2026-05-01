import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

/** Staging-only accounts created by GET /api/seed (disabled in production). */
const STAGING_ACCOUNTS = [
  { label: 'Patient',        email: 'patient@mediequip.ai',     pwd: 'Patient@1234' },
  { label: 'Hospital admin', email: 'hospital.admin@mediequip.ai', pwd: 'Hospital@1234' },
  { label: 'System admin',   email: 'admin@mediequip.ai',       pwd: 'Admin@1234' },
  { label: 'Volunteer',      email: 'volunteer1@mediequip.ai',  pwd: 'Volunteer@1234' },
  { label: 'Paramedic',      email: 'paramedic@mediequip.ai',   pwd: 'Paramedic@1234' },
];

const Login = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      const redirects = {
        patient: '/patient',
        hospital_admin: '/hospital-admin',
        system_admin: '/admin',
        volunteer: '/volunteer',
        paramedic: '/ambulance',
      };
      navigate(redirects[user.role] || '/patient');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand to-brand-800 relative overflow-hidden p-12 flex-col justify-between">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,_white_0%,_transparent_50%)] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute top-1/2 -left-12 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />

        <Logo to="/" />

        <div className="relative">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-4xl xl:text-5xl font-bold text-white leading-tight max-w-md"
          >
            Secure access to your <span className="text-brand-100">operations dashboard.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-brand-50/90 text-lg mt-5 max-w-md"
          >
            Sign in with organization-issued credentials. Role-based access keeps each workflow isolated.
          </motion.p>

          <div className="mt-8 flex items-center gap-2 text-brand-50/80 text-sm">
            <ShieldCheck size={18} />
            JWT authentication · least-privilege roles
          </div>
        </div>

        <div className="relative text-brand-50/60 text-sm">
          © {new Date().getFullYear()} MediEquip 2.0
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo />
          </div>

          <div className="mb-8">
            <h2 className="font-display font-bold text-3xl text-ink-900">Sign in</h2>
            <p className="text-ink-500 mt-2">Use your work email and password.</p>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="email" required autoComplete="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="name@organization.org"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-ink-700">Password</label>
                <span className="text-xs text-ink-400">Contact IT to reset</span>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="password" required autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter password"
                  className="input pl-10"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {loading ? 'Signing in…' : (<>Sign in <ArrowRight size={16} /></>)}
            </button>
          </form>

          <p className="text-center text-sm text-ink-500 mt-6">
            Need an account?{' '}
            <Link to="/register" className="text-brand font-semibold hover:underline">Request access</Link>
          </p>

          <div className="mt-8 pt-6 border-t border-ink-200">
            <p className="label text-center mb-1">Staging sign-in</p>
            <p className="text-center text-xs text-ink-400 mb-3 max-w-sm mx-auto">
              One-click fill for non-production datasets created by <code className="text-ink-600 bg-ink-100 px-1 rounded text-[11px]">GET /api/seed</code>. Use organization credentials in live deployments.
            </p>
            <div className="space-y-2">
                {STAGING_ACCOUNTS.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setForm({ email: c.email, password: c.pwd })}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-lg bg-ink-100 hover:bg-brand-50 transition-colors group focus-visible:ring-2 focus-visible:ring-brand text-left"
                  >
                    <span className="font-semibold text-sm text-ink-900 group-hover:text-brand">{c.label}</span>
                    <span className="text-xs text-ink-500 truncate ml-2 max-w-[55%]">{c.email}</span>
                  </button>
                ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
