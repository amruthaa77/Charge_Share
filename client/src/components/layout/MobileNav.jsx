import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { MapPin, Calendar, PlusCircle, LayoutDashboard, Bike, ShieldAlert, Settings2 } from 'lucide-react';

export const MobileNav = () => {
  const { isAuthenticated, isHost, isAdmin } = useAuth();
  const location = useLocation();

  const navItems = isAdmin
    ? [
        {
          to: '/explore',
          label: 'Bays',
          icon: MapPin,
        },
        {
          to: '/admin',
          label: 'Admin',
          icon: ShieldAlert,
        },
        {
          to: '/settings',
          label: 'Settings',
          icon: Settings2,
        },
      ]
    : [
        {
          to: '/explore',
          label: 'Bays',
          icon: MapPin,
        },
        {
          to: isAuthenticated ? '/my-bookings' : '/login',
          label: 'Passes',
          icon: Calendar,
        },
        {
          to: isHost ? '/host/dashboard' : '/become-a-host',
          label: isHost ? 'Host' : 'List Socket',
          icon: isHost ? LayoutDashboard : PlusCircle,
        },
        {
          to: isAuthenticated ? '/vehicles' : '/login',
          label: isAuthenticated ? 'Garage' : 'Account',
          icon: Bike,
        },
      ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-2xl -webkit-backdrop-blur-2xl border-t border-border px-3 pt-2 pb-safe shadow-luxury-lg transition-colors">
      <nav aria-label="Mobile Bottom Navigation" className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-4'} gap-1 items-center max-w-md mx-auto`}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className="relative flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl min-h-[48px] touch-target-min transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="mobileNavPill"
                  className="absolute inset-0 bg-brand/10 rounded-2xl border border-brand/20 -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={`w-5 h-5 mb-0.5 transition-colors ${
                  isActive
                    ? 'text-brand font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              />
              <span
                className={`text-[10px] font-semibold tracking-tight transition-colors ${
                  isActive
                    ? 'text-brand font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
