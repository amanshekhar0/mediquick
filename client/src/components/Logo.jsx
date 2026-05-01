import { Link } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';

const Logo = ({ to = '/', size = 'md', subtitle = false }) => {
  const dims = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  const text = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <Link to={to} className="flex items-center gap-3 group">
      <div className={`${dims} bg-gradient-to-br from-brand to-brand-800 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-soft-lg transition-shadow duration-300`}>
        <HeartPulse className="text-white" size={iconSize} strokeWidth={2.5} />
      </div>
      <div>
        <div className={`font-display font-bold ${text} text-ink-900 leading-tight`}>
          MediEquip <span className="text-brand">2.0</span>
        </div>
        {subtitle && (
          <div className="text-xs text-ink-400 font-medium tracking-wider">EMERGENCY INTELLIGENCE</div>
        )}
      </div>
    </Link>
  );
};

export default Logo;
