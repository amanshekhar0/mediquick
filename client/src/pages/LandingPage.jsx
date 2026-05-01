import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Brain, Truck, Hospital,
  HeartPulse, Shield, Activity, Clock, MapPin, CheckCircle2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import BreathingIndicator from '../components/BreathingIndicator';
import { useAuth } from '../context/AuthContext';

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 } }),
};

const VALUE_PROPS = [
  {
    icon: Brain,
    title: 'Clinical decision support',
    body:  'Symptoms are assessed with a gated large-language model workflow: structured triage fields stream in real time, with multilingual patient-facing guidance.',
  },
  {
    icon: Truck,
    title: 'Intelligent Dispatch',
    body:  'Smart routing matches patients to the closest, most-capable hospital — weighing distance, beds, and specializations.',
  },
  {
    icon: Hospital,
    title: 'Hospital Readiness',
    body:  'Live bed counts, ICU availability, and resource status. Hospital admins update once — every connected screen reflects it.',
  },
];

const CAPABILITIES = [
  { title: 'Real-time synchronization', body: 'Hospital capacity and inventory propagate to every authorized client over a single WebSocket mesh.' },
  { title: 'Role-isolated workspaces', body: 'Patients, facility operators, system administrators, volunteers, and EMS each see only what their role requires.' },
  { title: 'Geospatial routing', body: 'Distance-aware hospital scoring, mass-casualty manifests, and volunteer proximity alerts share one consistent coordinate model.' },
  { title: 'Structured clinical support', body: 'Triage outputs are constrained JSON for downstream automation while keeping language-appropriate guidance for the end user.' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Describe symptoms',         body: 'Patient enters symptoms in plain language. AI processes the context in real time.' },
  { step: '02', title: 'Get matched to a facility', body: 'Top 3 hospitals appear with availability, distance and a recommendation score.' },
  { step: '03', title: 'Track help arriving',        body: 'Request an ambulance and watch its live GPS update on the map until arrival.' },
];

const LandingPage = () => {
  const { user } = useAuth();
  const ctaTo = user
    ? (
        user.role === 'patient' ? '/patient'
          : user.role === 'hospital_admin' ? '/hospital-admin'
          : user.role === 'system_admin' ? '/admin'
          : user.role === 'volunteer' ? '/volunteer'
          : user.role === 'paramedic' ? '/ambulance'
          : '/register'
      )
    : '/register';

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar variant="landing" />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Soft background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/60 via-canvas to-canvas pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-100 rounded-full blur-3xl opacity-40 pointer-events-none" />
        <div className="absolute top-40 -left-20 w-72 h-72 bg-brand-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <motion.div
              variants={fadeUp} custom={0}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand text-sm font-semibold rounded-full mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              Emergency coordination platform
            </motion.div>

            <motion.h1
              variants={fadeUp} custom={1}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-ink-900 leading-[1.1]"
            >
              Rapid Response.
              <br />
              <span className="text-brand">Reassuring Care.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp} custom={2}
              className="mt-6 text-lg text-ink-600 leading-relaxed max-w-xl"
            >
              Coordinate triage, facility readiness, and pre-hospital communication in one system:
              structured assessments, capacity-aware routing, and live operational telemetry.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to={ctaTo} className="btn-primary text-base px-6 py-3.5 group">
                {user ? 'Open dashboard' : 'Begin triage workflow'}
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/login" className="btn-outline text-base px-6 py-3.5">
                Organization sign-in
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} custom={4} className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500">
              {[
                'JWT-secured sessions',
                'Least-privilege role model',
                'TLS to platform services',
              ].map((t) => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-safe" />
                  {t}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — Visual hero card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="relative"
          >
            {/* Floating stat cards */}
            <div className="relative">
              {/* Main mockup card */}
              <div className="relative card shadow-soft-xl p-6 lg:p-8 bg-gradient-to-br from-surface to-brand-50/40">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-safe animate-pulse" />
                    <span className="text-sm font-semibold text-ink-700">Capability preview</span>
                  </div>
                  <span className="text-xs text-ink-400">Illustrative UI</span>
                </div>

                {/* Breathing indicator */}
                <div className="flex justify-center my-4">
                  <BreathingIndicator urgency="moderate" size={140} />
                </div>

                <div className="text-center mt-2">
                  <div className="badge badge-warning mb-3">Moderate urgency</div>
                  <h3 className="font-display font-bold text-xl text-ink-900 mb-1">Suspected condition (example)</h3>
                  <p className="text-sm text-ink-500">Facility type recommendation follows protocol output</p>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { Icon: Activity, label: 'Input', value: 'Captured' },
                    { Icon: MapPin,   label: 'Routing', value: 'Scored' },
                    { Icon: Clock,    label: 'Status', value: 'In review' },
                  ].map(({ Icon, label, value }, i) => (
                    <div key={i} className="bg-surface rounded-xl p-3 text-center border border-ink-200">
                      <Icon size={16} className="text-brand mx-auto mb-1" />
                      <div className="label text-[10px]">{label}</div>
                      <div className="font-display font-bold text-ink-900 text-sm">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating accent cards */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-4 -left-4 lg:-left-8 card p-4 flex items-center gap-3 shadow-soft-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-safe-50 flex items-center justify-center">
                  <Hospital size={18} className="text-safe" />
                </div>
                <div>
                  <div className="text-xs text-ink-400 font-medium">CAPACITY</div>
                  <div className="font-display font-bold text-ink-900">Live census</div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-4 -right-4 lg:-right-8 card p-4 flex items-center gap-3 shadow-soft-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                  <Truck size={18} className="text-brand" />
                </div>
                <div>
                  <div className="text-xs text-ink-400 font-medium">EMS</div>
                  <div className="font-display font-bold text-ink-900">Assignable</div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Capabilities — qualitative, no fabricated metrics */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CAPABILITIES.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
                className="card p-5"
              >
                <div className="font-display font-semibold text-ink-900 text-sm leading-snug">{c.title}</div>
                <p className="text-xs text-ink-500 mt-2 leading-relaxed">{c.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VALUE PROPS ──────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <div className="label mb-3">What we do</div>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-ink-900 leading-tight">
              Built for the moments that matter most
            </h2>
            <p className="text-ink-600 mt-4 text-lg">
              Aligned interfaces for patients, hospital operations, regional oversight, field responders, and EMS—sharing the same authoritative facility and transport state.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUE_PROPS.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="card card-hover p-7"
                >
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mb-5">
                    <Icon size={22} className="text-brand" strokeWidth={2} />
                  </div>
                  <h3 className="font-display font-bold text-xl text-ink-900 mb-2">{p.title}</h3>
                  <p className="text-ink-600 leading-relaxed">{p.body}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="label mb-3">How it works</div>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-ink-900 leading-tight">
              From symptoms to safety in three steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {HOW_IT_WORKS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative card p-7 card-hover"
              >
                <div className="font-display font-bold text-5xl text-brand-100 leading-none mb-4">
                  {s.step}
                </div>
                <h3 className="font-display font-bold text-lg text-ink-900 mb-2">{s.title}</h3>
                <p className="text-ink-600 text-sm leading-relaxed">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-brand to-brand-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_white_0%,_transparent_50%)] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Shield size={48} className="text-white mx-auto mb-6 opacity-90" strokeWidth={1.5} />
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white leading-tight">
            Be ready, before the emergency
          </h2>
          <p className="text-brand-50 mt-4 text-lg max-w-2xl mx-auto">
            Deploy a single operational picture for emergency intake, inpatient capacity, and pre-arrival vitals—before the patient reaches the door.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="bg-surface text-brand font-semibold px-7 py-3.5 rounded-lg shadow-soft-lg hover:shadow-soft-xl transition-all duration-200 inline-flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              Get started
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              className="border border-white/30 text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-white/10 transition-all duration-200 inline-flex items-center justify-center"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="bg-surface border-t border-ink-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <HeartPulse size={16} className="text-brand" />
            <span>MediEquip 2.0 — Emergency Medical Intelligence</span>
          </div>
          <div className="flex gap-6 text-sm text-ink-500">
            <Link to="/login" className="hover:text-brand transition-colors">Sign in</Link>
            <Link to="/register" className="hover:text-brand transition-colors">Register</Link>
            <span className="text-ink-400">Privacy policy: configure per deployment</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
