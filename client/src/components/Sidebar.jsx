import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Hospital, Bell, Truck, Settings, LogOut, ChevronLeft, ChevronRight, BedDouble,
  Package, HeartPulse,
} from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = {
  hospital_admin: [
    { to: '/hospital-admin', label: 'Dashboard',     icon: LayoutDashboard },
    { to: '/hospital-admin', label: 'Resources',     icon: BedDouble,  hash: '#resources' },
    { to: '/hospital-admin', label: 'Inventory',     icon: Package,    hash: '#inventory' },
    { to: '/hospital-admin', label: 'Live Vitals',   icon: HeartPulse, hash: '#vitals' },
    { to: '/hospital-admin', label: 'Settings',      icon: Settings,   hash: '#settings' },
  ],
  system_admin: [
    { to: '/admin', label: 'Command Center', icon: LayoutDashboard },
    { to: '/admin', label: 'Hospitals',      icon: Hospital, hash: '#hospitals' },
    { to: '/admin', label: 'Ambulances',     icon: Truck,    hash: '#ambulances' },
    { to: '/admin', label: 'Alerts',         icon: Bell,     hash: '#alerts' },
    { to: '/admin', label: 'Settings',       icon: Settings, hash: '#settings' },
  ],
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const items = NAV_ITEMS[user?.role] || [];
  const isCompact = collapsed;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCompact ? 80 : 264 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="sticky top-0 h-screen bg-surface border-r border-ink-200 flex flex-col flex-shrink-0 z-40"
    >
      {/* Brand */}
      <div className={`p-5 border-b border-ink-200 ${isCompact ? 'flex justify-center' : ''}`}>
        {isCompact ? (
          <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand-800 rounded-xl flex items-center justify-center">
            <span className="text-white font-display font-bold">M</span>
          </div>
        ) : (
          <Logo subtitle />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className={`px-3 mb-2 label ${isCompact ? 'sr-only' : ''}`}>Navigation</div>
        {items.map((item, i) => {
          const Icon = item.icon;
          const hashActive = item.hash
            ? location.pathname === item.to && location.hash === item.hash
            : location.pathname === item.to && (!location.hash || location.hash === '');
          return (
            <NavLink
              key={i}
              to={`${item.to}${item.hash || ''}`}
              end={!item.hash}
              className={() =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  hashActive
                    ? 'bg-brand-50 text-brand'
                    : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                } ${isCompact ? 'justify-center' : ''}`
              }
              title={item.label}
            >
              <Icon size={18} strokeWidth={2} className="flex-shrink-0" />
              <AnimatePresence>
                {!isCompact && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-ink-200">
        <div className={`flex items-center gap-3 p-3 rounded-lg ${isCompact ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 bg-brand-100 text-brand rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          {!isCompact && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink-900 truncate">{user?.name}</div>
              <div className="text-xs text-ink-400 truncate">{user?.email}</div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`w-full mt-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-600 hover:bg-critical-50 hover:text-critical transition-all ${isCompact ? 'justify-center' : ''}`}
          title="Sign out"
        >
          <LogOut size={18} strokeWidth={2} />
          {!isCompact && <span>Sign out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-20 w-6 h-6 bg-surface border border-ink-200 rounded-full flex items-center justify-center text-ink-500 hover:text-brand hover:border-brand shadow-soft transition-all"
      >
        {isCompact ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </motion.aside>
  );
};

export default Sidebar;
