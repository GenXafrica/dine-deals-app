import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export const SessionManager: React.FC = () => {
  const { logout } = useAuth();

  const refreshInFlightRef = useRef(false);
  const lastRefreshAtRef = useRef<number>(0);

  useEffect(() => {
    // 🚫 CRITICAL: skip ALL session logic during password recovery
    if (window.location.pathname === '/reset-password') {
      return;
    }

    const safeSignOutOnInvalidRefresh = async () => {
      try {
        await supabase.auth.signOut();
      } catch {}
    };

    const safeRefreshSession = async () => {
      const now = Date.now();
      if (refreshInFlightRef.current) return;
      if (now - lastRefreshAtRef.current < 1500) return;

      refreshInFlightRef.current = true;
      lastRefreshAtRef.current = now;

      try {
        const resp = await supabase.auth.refreshSession();
        if (resp?.error?.message?.includes('Invalid Refresh Token')) {
          await safeSignOutOnInvalidRefresh();
        }
      } catch (err: any) {
        if (err?.message?.includes('Invalid Refresh Token')) {
          await safeSignOutOnInvalidRefresh();
        }
      } finally {
        refreshInFlightRef.current = false;
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        logout();
      }
    });

    const checkInitialSession = async () => {
      try {
        const resp = await supabase.auth.getSession();
        if (resp?.error?.message?.includes('Invalid Refresh Token')) {
          await safeSignOutOnInvalidRefresh();
          return;
        }
      } catch {}
    };

    const onVisibleOrFocus = () => {
      if (document.visibilityState === 'visible') {
        safeRefreshSession();
      }
    };

    window.addEventListener('focus', onVisibleOrFocus);
    document.addEventListener('visibilitychange', onVisibleOrFocus);

    checkInitialSession();

    return () => {
      subscription?.unsubscribe?.();
      window.removeEventListener('focus', onVisibleOrFocus);
      document.removeEventListener('visibilitychange', onVisibleOrFocus);
    };
  }, [logout]);

  return null;
};

export default SessionManager;