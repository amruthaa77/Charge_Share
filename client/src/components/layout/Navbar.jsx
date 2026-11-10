import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { notificationAPI } from '../../services/api';
import {
  Zap,
  MapPin,
  Calendar,
  LayoutDashboard,
  ShieldAlert,
  Moon,
  Sun,
  LogOut,
  PlusCircle,
  Menu,
  X,
  ChevronDown,
  Bike,
  Sparkles,
  AlertTriangle,
  Bell,
  Check,
  Settings2,
  Users,
} from 'lucide-react';

export const Navbar = () => {
  const isDemoMode = import.meta.env.VITE_DEMO_MODE !== 'false';
  const { user, isAuthenticated, isHost, isAdmin, authReady, logout, quickDemoLogin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [centerWidth, setCenterWidth] = useState(0);

  const notifRef = useRef(null);
  const bellButtonRef = useRef(null);
  const userMenuRef = useRef(null);
  const avatarButtonRef = useRef(null);
  const moreMenuRef = useRef(null);
  const moreButtonRef = useRef(null);
  const centerNavRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  // Close all popovers on route change
  useEffect(() => {
    setNotifDropdownOpen(false);
    setUserDropdownOpen(false);
    setMoreDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  // Handle outside click & Escape key to close popovers and return focus
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifDropdownOpen && notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
      if (userDropdownOpen && userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
      if (moreDropdownOpen && moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreDropdownOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (notifDropdownOpen) {
          setNotifDropdownOpen(false);
          bellButtonRef.current?.focus();
        }
        if (userDropdownOpen) {
          setUserDropdownOpen(false);
          avatarButtonRef.current?.focus();
        }
        if (moreDropdownOpen) {
          setMoreDropdownOpen(false);
          moreButtonRef.current?.focus();
        }
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notifDropdownOpen, userDropdownOpen, moreDropdownOpen, mobileMenuOpen]);

  // Priority+ Dynamic Overflow: Measure center nav available width with ResizeObserver
  useEffect(() => {
    if (!centerNavRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setCenterWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(centerNavRef.current);
    return () => observer.disconnect();
  }, []);

  // Poll notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadNotifs = async () => {
      try {
        const res = await notificationAPI.getMyNotifications();
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      } catch {
        // quiet error
      }
    };

    loadNotifs();
    const interval = setInterval(loadNotifs, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleDemoSwitch = async (role) => {
    try {
      await quickDemoLogin(role);
      setUserDropdownOpen(false);
      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'HOST') navigate('/host/dashboard');
      else navigate('/explore');
    } catch (err) {
      console.error('Demo login failed', err);
    }
  };

  const toggleNotif = () => {
    if (!notifDropdownOpen) {
      setUserDropdownOpen(false);
      setMoreDropdownOpen(false);
    }
    setNotifDropdownOpen((prev) => !prev);
  };

  const toggleUserMenu = () => {
    if (!userDropdownOpen) {
      setNotifDropdownOpen(false);
      setMoreDropdownOpen(false);
    }
    setUserDropdownOpen((prev) => !prev);
  };

  const toggleMoreMenu = () => {
    if (!moreDropdownOpen) {
      setNotifDropdownOpen(false);
      setUserDropdownOpen(false);
    }
    setMoreDropdownOpen((prev) => !prev);
  };

  // Nav items per role in priority order
  const getNavItems = () => {
    if (isAdmin) {
      return [
        {
          label: 'Admin Back-Office',
          href: '/admin',
          icon: ShieldAlert,
          isAdmin: true,
          isActive: (loc) => loc.pathname === '/admin',
        },
        {
          label: 'Find Bays',
          href: '/explore',
          icon: MapPin,
          isActive: (loc) => loc.pathname === '/explore' && !loc.search.includes('mode=emergency'),
        },
      ];
    }

    if (isHost) {
      return [
        {
          label: 'Find Bays',
          href: '/explore',
          icon: MapPin,
          isActive: (loc) => loc.pathname === '/explore' && !loc.search.includes('mode=emergency'),
        },
        {
          label: 'Host Dashboard',
          href: '/host/dashboard',
          icon: LayoutDashboard,
          isActive: (loc) => loc.pathname === '/host/dashboard',
        },
        {
          label: 'My Passes',
          href: '/my-bookings',
          icon: Calendar,
          isActive: (loc) => loc.pathname === '/my-bookings',
        },
        {
          label: 'Garage',
          href: '/vehicles',
          icon: Bike,
          isActive: (loc) => loc.pathname === '/vehicles',
        },
        {
          label: 'Emergency SOS',
          href: '/explore?mode=emergency',
          icon: AlertTriangle,
          isEmergency: true,
          isActive: (loc) => loc.pathname === '/explore' && loc.search.includes('mode=emergency'),
        },
      ];
    }

    if (isAuthenticated) {
      return [
        {
          label: 'Find Bays',
          href: '/explore',
          icon: MapPin,
          isActive: (loc) => loc.pathname === '/explore' && !loc.search.includes('mode=emergency'),
        },
        {
          label: 'My Passes',
          href: '/my-bookings',
          icon: Calendar,
          isActive: (loc) => loc.pathname === '/my-bookings',
        },
        {
          label: 'Garage',
          href: '/vehicles',
          icon: Bike,
          isActive: (loc) => loc.pathname === '/vehicles',
        },
        {
          label: 'Emergency SOS',
          href: '/explore?mode=emergency',
          icon: AlertTriangle,
          isEmergency: true,
          isActive: (loc) => loc.pathname === '/explore' && loc.search.includes('mode=emergency'),
        },
      ];
    }

    // Logged-out visitors
    return [
      {
        label: 'Find Bays',
        href: '/explore',
        icon: MapPin,
        isActive: (loc) => loc.pathname === '/explore' && !loc.search.includes('mode=emergency'),
      },
      {
        label: 'Emergency SOS',
        href: '/explore?mode=emergency',
        icon: AlertTriangle,
        isEmergency: true,
        isActive: (loc) => loc.pathname === '/explore' && loc.search.includes('mode=emergency'),
      },
    ];
  };

  const allNavItems = getNavItems();

  // Dynamic priority calculation based on container width
  const computeVisibleCount = () => {
    const total = allNavItems.length;
    if (total <= 2) return total;

    const width = centerWidth > 0
      ? centerWidth
      : typeof window !== 'undefined'
      ? Math.max(300, window.innerWidth - 650)
      : 500;

    if (isHost) {
      if (width >= 610) return 5;
      if (width >= 550) return 4;
      if (width >= 460) return 3;
      return 2;
    }

    if (width >= 470) return 4;
    if (width >= 400) return 3;
    return 2;
  };

  const visibleCount = computeVisibleCount();
  const visibleItems = allNavItems.slice(0, visibleCount);
  const overflowItems = allNavItems.slice(visibleCount);
  const isAnyOverflowActive = overflowItems.some((item) => item.isActive(location));

  return (
    <header className="sticky top-0 z-40 w-full bg-nav-bg backdrop-blur-2xl border-b border-nav-border transition-colors shadow-luxury-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4 lg:gap-6 h-16 lg:h-[72px]">
          {/* =========================================================================
              ZONE 1: LEFT BRAND LOCKUP (Icon + Editorial Wordmark + Bengaluru Pill)
              Guaranteed min-width and shrink-0 to prevent compression.
              ========================================================================= */}
          <div className="flex items-center shrink-0 min-w-0">
            <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0 min-w-0">
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-brand text-brand-contrast border border-white/20 flex items-center justify-center group-hover:scale-105 transition-all shadow-luxury-sm shrink-0">
                <Zap className="w-4 h-4 fill-current text-brand-contrast" />
                <div className="absolute -inset-1 bg-brand/20 blur-md rounded-full -z-10 group-hover:opacity-100 opacity-40 transition-opacity" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-editorial text-base sm:text-lg lg:text-xl font-bold tracking-tight text-nav-text flex items-center leading-none">
                  Charge<span className="text-brand">Share</span>
                  <span className="hidden sm:inline-flex ml-1.5 text-[10px] font-sans-ui font-bold tracking-wider uppercase bg-brand/10 text-brand px-1.5 py-0.5 rounded-full border border-brand/20">
                    Bengaluru
                  </span>
                </span>
                <span className="hidden 2xl:flex text-[11px] font-medium text-text-secondary tracking-tight items-center gap-1 mt-0.5">
                  <Bike className="w-3 h-3 text-brand inline" /> EV Two-Wheeler Network
                </span>
              </div>
            </Link>
          </div>

          {/* =========================================================================
              ZONE 2: CENTER PRIMARY NAVIGATION (Priority+ Dynamic Overflow)
              Uses ResizeObserver to gracefully collapse lowest-priority links into a "More" menu.
              ========================================================================= */}
          <nav
            ref={centerNavRef}
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center justify-center gap-1 xl:gap-1.5 min-w-0"
          >
            {visibleItems.map((item) => {
              const active = item.isActive(location);
              const Icon = item.icon;

              if (item.isAdmin) {
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`px-3 py-1.5 rounded-2xl text-xs font-semibold tracking-wide transition-all items-center gap-1.5 whitespace-nowrap flex shrink-0 ${
                      active
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-sm border border-amber-500/25 font-bold'
                        : 'text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-500/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              }

              if (item.isEmergency) {
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`px-3 py-1.5 rounded-2xl text-xs font-bold tracking-wide transition-all items-center gap-1.5 whitespace-nowrap flex border shadow-sm shrink-0 ${
                      active
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 hover:bg-rose-500/20'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-rose-600 dark:text-rose-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-semibold tracking-wide transition-all items-center gap-1.5 whitespace-nowrap flex shrink-0 ${
                    active
                      ? 'bg-brand text-brand-contrast shadow-luxury-sm font-bold'
                      : 'text-nav-text hover:text-brand hover:bg-bg-raised'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-brand-contrast' : 'text-accent'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Priority+ Overflow "More" Popover Menu */}
            {overflowItems.length > 0 && (
              <div className="relative shrink-0" ref={moreMenuRef}>
                <button
                  ref={moreButtonRef}
                  id="nav-more-button"
                  type="button"
                  onClick={toggleMoreMenu}
                  aria-expanded={moreDropdownOpen}
                  aria-haspopup="menu"
                  className={`px-2.5 py-1.5 rounded-2xl text-xs font-semibold tracking-wide transition-all items-center gap-1 whitespace-nowrap flex cursor-pointer touch-target-min ${
                    isAnyOverflowActive
                      ? 'bg-brand text-brand-contrast shadow-luxury-sm font-bold'
                      : 'text-nav-text hover:text-brand hover:bg-bg-raised'
                  }`}
                  aria-label="More navigation links"
                >
                  <span>More</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 shrink-0 ${moreDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {moreDropdownOpen && (
                  <div
                    role="menu"
                    aria-labelledby="nav-more-button"
                    className="absolute left-0 mt-2 w-52 rounded-3xl bg-surface border border-border p-2 shadow-luxury-xl z-50 animate-in fade-in zoom-in-95"
                  >
                    {overflowItems.map((item) => {
                      const active = item.isActive(location);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          role="menuitem"
                          onClick={() => setMoreDropdownOpen(false)}
                          className={`w-full text-left px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                            item.isEmergency
                              ? active
                                ? 'bg-rose-600 text-white font-bold'
                                : 'text-rose-600 hover:bg-rose-500/10'
                              : active
                              ? 'bg-brand text-brand-contrast font-bold shadow-luxury-sm'
                              : 'text-text-primary hover:bg-bg-elevated hover:text-brand'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${
                            item.isEmergency
                              ? active ? 'text-white' : 'text-rose-600'
                              : active ? 'text-brand-contrast' : 'text-accent'
                          }`} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* =========================================================================
              ZONE 3: RIGHT ACTION CONTROLS (Bell, Theme, User Chip / Auth Buttons)
              Demo Switcher moved entirely inside user dropdown to save 152px top-row space.
              ========================================================================= */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            {/* Notification Bell */}
            {isAuthenticated && (
              <div className="relative shrink-0" ref={notifRef}>
                <button
                  ref={bellButtonRef}
                  type="button"
                  onClick={toggleNotif}
                  aria-expanded={notifDropdownOpen}
                  aria-haspopup="true"
                  className="relative p-2 sm:p-2.5 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] rounded-2xl bg-surface hover:bg-bg-elevated border border-border text-text-primary transition-colors shadow-luxury-sm cursor-pointer flex items-center justify-center touch-target-min"
                  aria-label="View notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white font-extrabold text-[10px] flex items-center justify-center leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-3xl bg-surface border border-border p-3 shadow-luxury-xl z-50 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
                      <span className="text-xs font-bold text-text-primary">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-xs text-brand font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-border py-1">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-text-muted text-center py-4">No notifications yet</p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n._id} className={`p-2 rounded-xl text-xs ${n.read ? 'opacity-70' : 'bg-brand/10 font-semibold'}`}>
                            <p className="text-text-primary text-xs">{n.title || n.message}</p>
                            <span className="text-[10px] text-text-muted">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 sm:p-2.5 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] rounded-2xl bg-surface hover:bg-bg-elevated border border-border text-text-primary transition-colors shadow-luxury-sm cursor-pointer flex items-center justify-center touch-target-min shrink-0"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-text-primary" />}
            </button>

            {/* User Profile / Auth State or Stable Skeleton */}
            {!authReady ? (
              <div className="flex items-center gap-2 shrink-0" aria-hidden="true">
                <div className="w-10 sm:w-20 h-10 rounded-2xl bg-surface border border-border animate-pulse" />
              </div>
            ) : isAuthenticated ? (
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  ref={avatarButtonRef}
                  id="user-menu-button"
                  type="button"
                  onClick={toggleUserMenu}
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:pl-2 sm:pr-3 min-h-[40px] sm:min-h-[44px] max-w-[180px] rounded-2xl bg-brand text-brand-contrast text-xs font-semibold hover:opacity-90 transition-all shadow-luxury-sm cursor-pointer touch-target-min whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 shrink-0"
                >
                  <div className="w-7 h-7 rounded-full bg-surface text-text-primary font-extrabold text-xs flex items-center justify-center shrink-0">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:inline truncate min-w-0 max-w-[100px]">{user?.name || 'User'}</span>
                  <ChevronDown className="hidden sm:inline w-3 h-3 opacity-80 shrink-0" />
                </button>

                {userDropdownOpen && (
                  <div
                    role="menu"
                    aria-labelledby="user-menu-button"
                    className="absolute right-0 mt-2 w-64 rounded-3xl bg-surface border border-border p-2 shadow-luxury-xl z-50 animate-in fade-in zoom-in-95"
                  >
                    <div className="px-3 py-2 border-b border-border">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-xs font-bold text-text-primary truncate">{user?.name}</p>
                        {isAdmin ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-full shrink-0">
                            Admin
                          </span>
                        ) : isHost ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-brand bg-brand/10 border border-brand/25 px-1.5 py-0.5 rounded-full shrink-0">
                            Host
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted bg-bg-raised border border-border px-1.5 py-0.5 rounded-full shrink-0">
                            Rider
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted truncate">{user?.email}</p>
                    </div>

                    {/* Collapsed primary navigation shortcuts below lg (1024px) */}
                    <div className="lg:hidden border-b border-border py-1">
                      <Link
                        to="/explore"
                        role="menuitem"
                        onClick={() => setUserDropdownOpen(false)}
                        className={`w-full text-left px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                          isActive('/explore') ? 'bg-brand/10 text-brand font-bold' : 'text-text-primary hover:bg-bg-elevated'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5 text-brand" /> Find Bays
                      </Link>
                      {!isAdmin && (
                        <>
                          <Link
                            to="/my-bookings"
                            role="menuitem"
                            onClick={() => setUserDropdownOpen(false)}
                            className={`w-full text-left px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                              isActive('/my-bookings') ? 'bg-brand/10 text-brand font-bold' : 'text-text-primary hover:bg-bg-elevated'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5 text-brand" /> My Passes
                          </Link>
                          <Link
                            to="/vehicles"
                            role="menuitem"
                            onClick={() => setUserDropdownOpen(false)}
                            className={`w-full text-left px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                              isActive('/vehicles') ? 'bg-brand/10 text-brand font-bold' : 'text-text-primary hover:bg-bg-elevated'
                            }`}
                          >
                            <Bike className="w-3.5 h-3.5 text-brand" /> Garage
                          </Link>
                        </>
                      )}
                      {isHost && (
                        <Link
                          to="/host/dashboard"
                          role="menuitem"
                          onClick={() => setUserDropdownOpen(false)}
                          className={`w-full text-left px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                            isActive('/host/dashboard') ? 'bg-brand/10 text-brand font-bold' : 'text-text-primary hover:bg-bg-elevated'
                          }`}
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-brand" /> Host Dashboard
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          to="/admin"
                          role="menuitem"
                          onClick={() => setUserDropdownOpen(false)}
                          className={`w-full text-left px-3 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                            isActive('/admin') ? 'bg-amber-500/20 text-amber-500 font-bold' : 'text-amber-600 hover:bg-amber-500/10'
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Admin Back-Office
                        </Link>
                      )}
                    </div>

                    {/* Instant Demo Personas Shortcut (Always available in user dropdown for rapid QA) */}
                    {isDemoMode && (
                      <div className="border-b border-border py-1.5">
                        <div className="px-3 pt-1 pb-1 text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-accent" />
                          <span>Demo Switcher</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setUserDropdownOpen(false);
                              handleDemoSwitch('EV_OWNER');
                            }}
                            className="py-1 px-1.5 text-[11px] font-bold rounded-xl bg-bg-raised text-text-primary hover:bg-brand hover:text-brand-contrast transition-colors text-center cursor-pointer"
                          >
                            🛵 Rider
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUserDropdownOpen(false);
                              handleDemoSwitch('HOST');
                            }}
                            className="py-1 px-1.5 text-[11px] font-bold rounded-xl bg-bg-raised text-text-primary hover:bg-brand hover:text-brand-contrast transition-colors text-center cursor-pointer"
                          >
                            🔌 Host
                          </button>
                        </div>
                      </div>
                    )}

                    <Link
                      to="/settings"
                      role="menuitem"
                      onClick={() => setUserDropdownOpen(false)}
                      className={`w-full text-left px-3 py-2.5 min-h-[44px] mt-1 rounded-2xl text-xs font-semibold flex items-center gap-2 cursor-pointer touch-target-min transition-colors ${
                        isActive('/settings')
                          ? 'bg-brand/10 text-brand font-bold border border-brand/20'
                          : 'text-text-primary hover:bg-bg-elevated'
                      }`}
                    >
                      <Settings2 className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
                      <span>Account Settings</span>
                    </Link>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        setUserDropdownOpen(false);
                        await logout();
                        navigate('/login?switch=true');
                      }}
                      className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-2xl text-xs font-semibold text-text-primary hover:bg-bg-elevated flex items-center gap-2 cursor-pointer touch-target-min transition-colors"
                    >
                      <Users className="w-3.5 h-3.5 text-text-muted" /> Sign in as a different account
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2.5 min-h-[44px] rounded-2xl text-xs font-semibold text-rose-600 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer touch-target-min"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <Link
                  to="/login"
                  className="px-3 py-1.5 min-h-[40px] sm:min-h-[44px] rounded-2xl text-xs font-bold text-nav-text hover:text-brand transition-colors flex items-center justify-center touch-target-min whitespace-nowrap"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 min-h-[40px] sm:min-h-[44px] rounded-2xl bg-brand hover:opacity-90 text-brand-contrast text-xs font-bold transition-all shadow-luxury-sm flex items-center justify-center touch-target-min whitespace-nowrap"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Menu Toggle (Visible below lg: 1024px) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 sm:p-2.5 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] rounded-2xl bg-surface border border-border text-text-primary flex items-center justify-center touch-target-min cursor-pointer shrink-0"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Slide-out Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm -webkit-backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Slide-out Sheet */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xs bg-surface border-l border-border z-50 p-6 pt-safe pb-safe overflow-y-auto flex flex-col justify-between shadow-luxury-xl"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation"
            >
              <div className="space-y-6">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-brand text-brand-contrast flex items-center justify-center">
                      <Zap className="w-4 h-4 fill-current" />
                    </div>
                    <span className="font-editorial text-lg font-bold text-text-primary">
                      Charge<span className="text-brand">Share</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl hover:bg-bg-elevated text-text-muted hover:text-text-primary flex items-center justify-center cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Primary Nav Links */}
                <nav className="flex flex-col space-y-1.5">
                  <Link
                    to="/explore"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-2xl text-sm font-semibold transition-colors ${
                      isActive('/explore') ? 'bg-brand text-brand-contrast font-bold' : 'text-text-primary hover:bg-bg-elevated'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-accent" />
                    <span>Find Bays</span>
                  </Link>

                  <Link
                    to="/explore?mode=emergency"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-2xl text-sm font-bold text-rose-600 bg-rose-500/10 border border-rose-500/20"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Emergency SOS</span>
                  </Link>

                  {isAuthenticated && !isAdmin && (
                    <>
                      <Link
                        to="/my-bookings"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-2xl text-sm font-semibold transition-colors ${
                          isActive('/my-bookings') ? 'bg-brand text-brand-contrast font-bold' : 'text-text-primary hover:bg-bg-elevated'
                        }`}
                      >
                        <Calendar className="w-4 h-4 text-accent" />
                        <span>My Passes</span>
                      </Link>
                      <Link
                        to="/vehicles"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-2xl text-sm font-semibold transition-colors ${
                          isActive('/vehicles') ? 'bg-brand text-brand-contrast font-bold' : 'text-text-primary hover:bg-bg-elevated'
                        }`}
                      >
                        <Bike className="w-4 h-4 text-accent" />
                        <span>Garage</span>
                      </Link>
                    </>
                  )}

                  {isHost && !isAdmin && (
                    <Link
                      to="/host/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-2xl text-sm font-semibold transition-colors ${
                        isActive('/host/dashboard') ? 'bg-brand text-brand-contrast font-bold' : 'text-text-primary hover:bg-bg-elevated'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4 text-accent" />
                      <span>Host Dashboard</span>
                    </Link>
                  )}

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-2xl text-sm font-semibold transition-colors ${
                        isActive('/admin') ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold' : 'text-text-primary hover:bg-bg-elevated'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      <span>Admin Back-Office</span>
                    </Link>
                  )}

                  {!isAdmin && (
                    <Link
                      to="/become-a-host"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-2xl text-sm font-semibold text-text-primary hover:bg-bg-elevated"
                    >
                      <PlusCircle className="w-4 h-4 text-accent" />
                      <span>Host Your Bay</span>
                    </Link>
                  )}
                </nav>

                {/* Instant Demo Persona Switcher */}
                {isDemoMode && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2 px-1">
                      Demo Switcher
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      <button
                        type="button"
                        onClick={() => { handleDemoSwitch('EV_OWNER'); setMobileMenuOpen(false); }}
                        className="w-full text-left px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-bg-elevated hover:bg-brand/10 text-text-primary flex items-center justify-between touch-target-min cursor-pointer"
                      >
                        <span>🛵 EV Scooter Rider</span>
                        <span className="text-text-muted font-normal">Ananya</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { handleDemoSwitch('HOST'); setMobileMenuOpen(false); }}
                        className="w-full text-left px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-bg-elevated hover:bg-brand/10 text-text-primary flex items-center justify-between touch-target-min cursor-pointer"
                      >
                        <span>🔌 16A Socket Host</span>
                        <span className="text-text-muted font-normal">Rajesh</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Auth Actions */}
              <div className="pt-6 border-t border-border space-y-3">
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-bg-elevated">
                      <div className="w-9 h-9 rounded-full bg-brand text-brand-contrast font-bold flex items-center justify-center shrink-0">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-text-primary truncate">{user?.name}</p>
                        <p className="text-[11px] text-text-muted truncate">{user?.email}</p>
                      </div>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold touch-target-min transition-colors ${
                        isActive('/settings')
                          ? 'bg-brand/10 text-brand font-bold border border-brand/20'
                          : 'text-text-primary hover:bg-bg-elevated'
                      }`}
                    >
                      <Settings2 className="w-4 h-4 text-text-muted" /> Account Settings
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        setMobileMenuOpen(false);
                        await logout();
                        navigate('/login?switch=true');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold text-text-primary hover:bg-bg-elevated touch-target-min cursor-pointer transition-colors"
                    >
                      <Users className="w-4 h-4 text-text-muted" /> Sign in as a different account
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMobileMenuOpen(false); logout(); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-500/10 touch-target-min cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full block text-center py-3 min-h-[44px] rounded-2xl border border-border text-text-primary font-bold text-xs hover:bg-bg-elevated cursor-pointer"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full block text-center py-3 min-h-[44px] rounded-2xl bg-brand text-brand-contrast font-bold text-xs shadow-luxury-sm hover:opacity-90 cursor-pointer"
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};
