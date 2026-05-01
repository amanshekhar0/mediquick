import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

const ROLE_CONFIG = {
  patient:        { label: 'Patient',        color: 'badge-brand'    },
  hospital_admin: { label: 'Hospital Admin', color: 'badge-safe'     },
  system_admin:   { label: 'System Admin',   color: 'badge-critical' },
  volunteer:      { label: 'CPR Volunteer',  color: 'badge-warning'  },
  paramedic:      { label: 'Paramedic',      color: 'badge-brand'    },
};

const Navbar = ({ variant = 'app' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const cfg = user ? ROLE_CONFIG[user.role] : null;

  return (
    <nav className="sticky top-0 z-40 bg-surface/85 backdrop-blur-md border-b border-ink-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo />

        {user ? (
          <div className="flex items-center gap-3">
            {cfg && <span className={`badge ${cfg.color}`}>{cfg.label}</span>}

            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-ink-100 rounded-lg">
              <div className="w-7 h-7 bg-brand-100 text-brand rounded-full flex items-center justify-center font-semibold text-xs">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-ink-700">{user.name}</span>
            </div>

            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="p-2.5 text-ink-500 hover:bg-critical-50 hover:text-critical rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-brand"
              title="Sign out"
            >
              <LogOut size={18} strokeWidth={2} />
            </button>
          </div>
        ) : variant === 'landing' ? (
          <div className="flex items-center gap-2">
            <Link to="/login"    className="btn-ghost">Sign in</Link>
            <Link to="/register" className="btn-primary">Get started</Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login"    className="btn-ghost">Sign in</Link>
            <Link to="/register" className="btn-primary">Register</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
