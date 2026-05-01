import { motion } from 'framer-motion';

const STATUS = {
  critical: { ring: '#FECDD3', core: '#E11D48', label: 'CRITICAL', textCls: 'text-critical' },
  moderate: { ring: '#FDE68A', core: '#D97706', label: 'MODERATE', textCls: 'text-warning' },
  minor:    { ring: '#A7F3D0', core: '#059669', label: 'STABLE',   textCls: 'text-safe' },
  idle:     { ring: '#CCFBF1', core: '#0F766E', label: 'STANDBY',  textCls: 'text-brand' },
};

/**
 * Breathing Status Indicator — calming pulse that scales gently on a 3s loop.
 * Replaces the previous Three.js orb. Color reflects urgency level.
 *
 * @param {'critical'|'moderate'|'minor'|'idle'} urgency
 * @param {number} size  px (default 160)
 */
const BreathingIndicator = ({ urgency = 'idle', size = 160, label }) => {
  const cfg = STATUS[urgency] || STATUS.idle;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer pulsing rings */}
      <motion.div
        className="absolute rounded-full"
        style={{ background: cfg.core, opacity: 0.10 }}
        initial={{ scale: 0.85 }}
        animate={{ scale: [0.85, 1.15, 0.85] }}
        transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{ background: cfg.ring, opacity: 0.55, width: '70%', height: '70%' }}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity, delay: 0.2 }}
      />
      {/* Solid core */}
      <motion.div
        className="relative rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${cfg.core}, ${cfg.core}DD)`,
          width: '50%', height: '50%',
          boxShadow: `0 8px 24px ${cfg.core}40`,
        }}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
      >
        {label !== undefined && (
          <span className="font-display text-white font-bold text-sm tracking-wide">{label}</span>
        )}
      </motion.div>
    </div>
  );
};

export default BreathingIndicator;
