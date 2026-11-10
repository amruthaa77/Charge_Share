import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authAPI, adminAuthAPI } from '../services/api';

const AuthContext = createContext();
const USER_HINT_KEY = 'cs_user_hint';
const ADMIN_HINT_KEY = 'cs_admin_hint';
const AUTH_BROADCAST_CHANNEL = 'charges_share_auth_channel';

// Cross-tab synchronization channel
let authBroadcast = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    authBroadcast = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
  } catch {
    // fallback to storage event
  }
}

const broadcastAuthChange = (payload) => {
  try {
    authBroadcast?.postMessage(payload);
  } catch {
    // ignore
  }
  try {
    localStorage.setItem('cs_auth_event', JSON.stringify({ ...payload, ts: Date.now() }));
  } catch {
    // ignore
  }
};

export const AuthProvider = ({ children }) => {
  // ---------------------------------------------------------------------------
  // 1. RIDER / HOST SESSION (Isolated: cs_token & cs_user_hint)
  // ---------------------------------------------------------------------------
  const [token, setToken] = useState(() => localStorage.getItem('cs_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const storedToken = localStorage.getItem('cs_token');
      const hint = localStorage.getItem(USER_HINT_KEY);
      if (storedToken && hint) {
        const parsed = JSON.parse(hint);
        if (parsed?.name && parsed?.role) {
          return { name: parsed.name, role: parsed.role, email: parsed.email || '' };
        }
      }
    } catch {
      // fallback
    }
    return null;
  });

  const [authReady, setAuthReady] = useState(() => {
    if (!localStorage.getItem('cs_token')) return true;
    if (localStorage.getItem(USER_HINT_KEY)) return true;
    return false;
  });

  const [loading, setLoading] = useState(!authReady);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      if (token) {
        try {
          const res = await authAPI.getMe();
          if (isMounted) {
            const verifiedUser = res.data.user;
            setUser(verifiedUser);
            try {
              localStorage.setItem(
                USER_HINT_KEY,
                JSON.stringify({ name: verifiedUser.name, role: verifiedUser.role, email: verifiedUser.email })
              );
            } catch {
              // quota ignore
            }
          }
        } catch {
          console.warn('User session expired or invalid token');
          if (isMounted) {
            localStorage.removeItem('cs_token');
            localStorage.removeItem(USER_HINT_KEY);
            setToken(null);
            setUser(null);
          }
        }
      } else {
        localStorage.removeItem(USER_HINT_KEY);
      }

      if (isMounted) {
        setAuthReady(true);
        setLoading(false);
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // ---------------------------------------------------------------------------
  // 2. ADMIN BACK-OFFICE SESSION (Isolated: cs_admin_token & cs_admin_hint)
  // ---------------------------------------------------------------------------
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('cs_admin_token') || null);
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const storedToken = localStorage.getItem('cs_admin_token');
      const hint = localStorage.getItem(ADMIN_HINT_KEY);
      if (storedToken && hint) {
        const parsed = JSON.parse(hint);
        if (parsed?.role === 'ADMIN') {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return null;
  });

  const [adminAuthReady, setAdminAuthReady] = useState(() => {
    if (!localStorage.getItem('cs_admin_token')) return true;
    if (localStorage.getItem(ADMIN_HINT_KEY)) return true;
    return false;
  });

  useEffect(() => {
    let isMounted = true;

    const verifyAdminSession = async () => {
      if (adminToken) {
        try {
          const res = await adminAuthAPI.getMe();
          if (isMounted && res.data?.user) {
            const verified = res.data.user;
            setAdminUser(verified);
            try {
              localStorage.setItem(
                ADMIN_HINT_KEY,
                JSON.stringify({
                  id: verified.id || verified._id,
                  name: verified.name,
                  email: verified.email,
                  role: verified.role,
                  mustChangePassword: verified.mustChangePassword || verified.must_change_password || false,
                })
              );
            } catch {
              // ignore storage serialization error
            }
          }
        } catch (err) {
          // If token requires initial password rotation, keep admin user so the modal can render
          if (err.response?.status === 403 && (err.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED' || err.response?.data?.error === 'PASSWORD_CHANGE_REQUIRED')) {
            if (isMounted) {
              setAdminAuthReady(true);
            }
            return;
          }
          if (isMounted) {
            localStorage.removeItem('cs_admin_token');
            localStorage.removeItem(ADMIN_HINT_KEY);
            setAdminToken(null);
            setAdminUser(null);
          }
        }
      } else {
        localStorage.removeItem(ADMIN_HINT_KEY);
      }

      if (isMounted) {
        setAdminAuthReady(true);
      }
    };

    verifyAdminSession();

    return () => {
      isMounted = false;
    };
  }, [adminToken]);

  // ---------------------------------------------------------------------------
  // 3. MULTI-TAB SYNCHRONIZATION LISTENER
  // ---------------------------------------------------------------------------
  const syncStateFromStorage = useCallback(() => {
    const storedToken = localStorage.getItem('cs_token');
    const userHint = localStorage.getItem(USER_HINT_KEY);
    const storedAdminToken = localStorage.getItem('cs_admin_token');
    const adminHint = localStorage.getItem(ADMIN_HINT_KEY);

    if (storedToken && userHint) {
      try {
        const parsed = JSON.parse(userHint);
        setToken(storedToken);
        setUser(parsed);
      } catch {
        setToken(null);
        setUser(null);
      }
    } else {
      setToken(null);
      setUser(null);
    }

    if (storedAdminToken && adminHint) {
      try {
        const parsed = JSON.parse(adminHint);
        setAdminToken(storedAdminToken);
        setAdminUser(parsed);
      } catch {
        setAdminToken(null);
        setAdminUser(null);
      }
    } else {
      setAdminToken(null);
      setAdminUser(null);
    }
  }, []);

  useEffect(() => {
    const handleChannelMessage = (e) => {
      if (e?.data?.type) {
        syncStateFromStorage();
      }
    };

    const handleStorageEvent = (e) => {
      if (e.key === 'cs_token' || e.key === 'cs_admin_token' || e.key === 'cs_auth_event') {
        syncStateFromStorage();
      }
    };

    authBroadcast?.addEventListener('message', handleChannelMessage);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      authBroadcast?.removeEventListener('message', handleChannelMessage);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [syncStateFromStorage]);

  // ---------------------------------------------------------------------------
  // 4. ATOMIC AUTH ACTIONS WITH CLEAN REPLACEMENT
  // ---------------------------------------------------------------------------

  // Login as Rider or Host -> Atomically replaces any active Admin session
  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token: newToken, user: newUser } = res.data;

    // Purge prior admin session from storage
    localStorage.removeItem('cs_admin_token');
    localStorage.removeItem(ADMIN_HINT_KEY);
    // Best-effort server logout of prior admin session
    adminAuthAPI.logout().catch(() => {});

    // Save new user session
    localStorage.setItem('cs_token', newToken);
    try {
      localStorage.setItem(
        USER_HINT_KEY,
        JSON.stringify({ name: newUser.name, role: newUser.role, email: newUser.email })
      );
    } catch {
      // ignore
    }

    // Atomically swap in-memory state
    setAdminToken(null);
    setAdminUser(null);
    setToken(newToken);
    setUser(newUser);
    setAuthReady(true);
    setAdminAuthReady(true);
    setLoading(false);

    // Broadcast across tabs
    broadcastAuthChange({ type: 'LOGIN', role: newUser.role, user: newUser });

    return newUser;
  };

  // Dedicated adminLogin -> Atomically replaces any active Rider/Host session
  const adminLogin = async (email, password) => {
    const res = await adminAuthAPI.login({ email, password });
    const { token: newToken, user: newUser } = res.data;

    // Purge prior rider/host session from storage
    localStorage.removeItem('cs_token');
    localStorage.removeItem(USER_HINT_KEY);
    // Best-effort server logout of prior rider/host session
    authAPI.logout().catch(() => {});

    // Save new admin session
    localStorage.setItem('cs_admin_token', newToken);
    try {
      localStorage.setItem(
        ADMIN_HINT_KEY,
        JSON.stringify({
          id: newUser.id || newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          mustChangePassword: newUser.mustChangePassword || newUser.must_change_password || false,
        })
      );
    } catch {
      // ignore
    }

    // Atomically swap in-memory state
    setToken(null);
    setUser(null);
    setAdminToken(newToken);
    setAdminUser(newUser);
    setAuthReady(true);
    setAdminAuthReady(true);

    // Broadcast across tabs
    broadcastAuthChange({ type: 'ADMIN_LOGIN', role: 'ADMIN', user: newUser });

    return newUser;
  };

  // Register as Rider or Host -> Atomically replaces any active Admin session
  const register = async (userData) => {
    const res = await authAPI.register(userData);
    const { token: newToken, user: newUser } = res.data;

    // Purge prior admin session from storage
    localStorage.removeItem('cs_admin_token');
    localStorage.removeItem(ADMIN_HINT_KEY);
    adminAuthAPI.logout().catch(() => {});

    localStorage.setItem('cs_token', newToken);
    try {
      localStorage.setItem(
        USER_HINT_KEY,
        JSON.stringify({ name: newUser.name, role: newUser.role, email: newUser.email })
      );
    } catch {
      // ignore
    }

    setAdminToken(null);
    setAdminUser(null);
    setToken(newToken);
    setUser(newUser);
    setAuthReady(true);
    setAdminAuthReady(true);
    setLoading(false);

    broadcastAuthChange({ type: 'REGISTER', role: newUser.role, user: newUser });

    return newUser;
  };

  // User logout
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore network err
    }
    localStorage.removeItem('cs_token');
    localStorage.removeItem(USER_HINT_KEY);
    setToken(null);
    setUser(null);
    setAuthReady(true);

    broadcastAuthChange({ type: 'LOGOUT' });
  };

  // Admin logout
  const adminLogout = async () => {
    try {
      await adminAuthAPI.logout();
    } catch {
      // ignore network err
    }
    localStorage.removeItem('cs_admin_token');
    localStorage.removeItem(ADMIN_HINT_KEY);
    setAdminToken(null);
    setAdminUser(null);
    setAdminAuthReady(true);

    broadcastAuthChange({ type: 'ADMIN_LOGOUT' });
  };

  // Helper to switch to a different account from user menu
  const switchAccount = async () => {
    await logout();
    await adminLogout();
  };

  // One-click demo login helper (riders and hosts only; admin has no demo shortcut)
  const quickDemoLogin = async (role = 'EV_OWNER') => {
    let email = 'owner1@chargeshare.in';
    let password = 'OwnerPassword123!';

    if (role === 'HOST') {
      email = 'host1@chargeshare.in';
      password = 'HostPassword123!';
    }

    return await login(email, password);
  };

  const updateUserProfile = (updatedUser) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedUser };
      try {
        localStorage.setItem(
          USER_HINT_KEY,
          JSON.stringify({ name: merged.name, role: merged.role, email: merged.email })
        );
      } catch {
        // ignore
      }
      return merged;
    });
  };

  const updateToken = (newToken) => {
    localStorage.setItem('cs_token', newToken);
    setToken(newToken);
  };

  const updateAdminProfile = (updatedAdmin) => {
    setAdminUser((prev) => {
      const merged = { ...prev, ...updatedAdmin };
      try {
        localStorage.setItem(
          ADMIN_HINT_KEY,
          JSON.stringify({
            id: merged.id || merged._id,
            name: merged.name,
            email: merged.email,
            role: merged.role,
            mustChangePassword: merged.mustChangePassword || merged.must_change_password || false,
          })
        );
      } catch {
        // ignore
      }
      return merged;
    });
  };

  const updateAdminToken = (newToken) => {
    localStorage.setItem('cs_admin_token', newToken);
    setAdminToken(newToken);
  };

  return (
    <AuthContext.Provider
      value={{
        // Rider / Host session
        user,
        token,
        loading,
        authReady,
        isAuthenticated: !!user,
        isHost: user?.role === 'HOST',
        isAdmin: adminUser?.role === 'ADMIN' || user?.role === 'ADMIN',

        // Admin session
        adminUser,
        adminToken,
        isAdminAuthenticated: !!adminUser && adminUser.role === 'ADMIN',
        adminAuthReady,

        // Actions
        login,
        adminLogin,
        register,
        logout,
        adminLogout,
        switchAccount,
        quickDemoLogin,
        updateUserProfile,
        updateToken,
        updateAdminProfile,
        updateAdminToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
