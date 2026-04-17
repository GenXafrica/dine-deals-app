// src/hooks/useSessionAutoLogin.tsx
import { useState, useCallback } from 'react';

const SESSION_REGISTRATION_KEY = 'dine_deals_pending_registration';

/**
 * IMPORTANT:
 * Supabase Auth is the ONLY authentication source.
 * This hook must NEVER perform login or mutate auth state.
 *
 * Its sole responsibility is now:
 * - clearing stale registration flags
 * - preventing redirect loops
 */
export const useSessionAutoLogin = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const shouldBlockAutoLogin = (): boolean => {
    try {
      if (typeof window === 'undefined') return false;

      const signoutAndSkip =
        !!(window as any).__dinedeals_signout_and_skip ||
        sessionStorage.getItem('signout_and_skip') === 'true';

      if (signoutAndSkip) return true;

      const skip =
        !!(window as any).__dinedeals_skip_postlogin_redirect ||
        sessionStorage.getItem('skipProfileRedirectOnce') === 'true';

      if (skip) return true;
    } catch {
      // ignore
    }
    return false;
  };

  const storePendingRegistration = useCallback(
    (email: string, userType: 'customer' | 'merchant') => {
      const registrationData = {
        email,
        userType,
        timestamp: Date.now()
      };
      sessionStorage.setItem(
        SESSION_REGISTRATION_KEY,
        JSON.stringify(registrationData)
      );
    },
    []
  );

  /**
   * No-op auto-login.
   * We only clear stale flags and return false.
   * AuthCallback + Supabase session handle everything else.
   */
  const checkAndAutoLogin = useCallback(async () => {
    try {
      setIsProcessing(true);

      if (shouldBlockAutoLogin()) {
        sessionStorage.removeItem(SESSION_REGISTRATION_KEY);
        return false;
      }

      // Always clear pending registration to avoid loops
      sessionStorage.removeItem(SESSION_REGISTRATION_KEY);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearPendingRegistration = useCallback(() => {
    sessionStorage.removeItem(SESSION_REGISTRATION_KEY);
  }, []);

  return {
    isProcessing,
    storePendingRegistration,
    checkAndAutoLogin,
    clearPendingRegistration
  };
};
