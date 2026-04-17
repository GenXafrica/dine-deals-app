// src/hooks/useAuth.tsx
import { useState, useEffect, useCallback } from 'react';
import { User, Merchant, AuthState } from '@/types';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'dine_deals_auth';
const SESSION_STORAGE_KEY = 'dine_deals_session';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    merchant: null,
    isAuthenticated: false,
  });
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Helper: remove Supabase auth token keys (prevents "silent re-login")
  const clearSupabaseAuthTokens = useCallback(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
            localStorage.removeItem(k);
          }
        }
      }
    } catch {
      // ignore
    }
    try {
      if (typeof sessionStorage !== 'undefined') {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const k = sessionStorage.key(i);
          if (!k) continue;
          if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
            sessionStorage.removeItem(k);
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Helper: apply and persist auth state
  const saveAuth = useCallback((state: AuthState) => {
    try {
      setAuthState(state);
      const stateString = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, stateString);
      sessionStorage.setItem(SESSION_STORAGE_KEY, stateString);
      setUpdateTrigger((prev) => prev + 1);
    } catch {
      console.warn('[useAuth] saveAuth failed');
    }
  }, []);

  // Helper: clear persisted state
  const clearPersisted = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
    // also clear Supabase token keys
    clearSupabaseAuthTokens();
  }, [clearSupabaseAuthTokens]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        let sessionResp;
        try {
          sessionResp = await supabase.auth.getSession();
        } catch {
          console.warn('[useAuth] supabase.auth.getSession failed');
          sessionResp = { data: { session: null }, error: null };
        }

        const session = sessionResp?.data?.session ?? null;

        if (session) {
          const sessionData =
            typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_STORAGE_KEY)
              ? sessionStorage.getItem(SESSION_STORAGE_KEY)
              : typeof localStorage !== 'undefined'
              ? localStorage.getItem(STORAGE_KEY)
              : null;

          if (sessionData) {
            try {
              const parsed = JSON.parse(sessionData);
              if (mounted) {
                if (parsed && (parsed.user || parsed.merchant || parsed.isAuthenticated)) {
                  setAuthState(parsed);
                } else {
                  clearPersisted();
                  setAuthState({
                    user:
                      session.user && session.user.id
                        ? ({ id: session.user.id, email: session.user.email || '' } as any)
                        : null,
                    merchant: null,
                    isAuthenticated: !!session.user,
                  });
                }
              }
            } catch {
              clearPersisted();
              if (mounted) {
                setAuthState({
                  user:
                    session.user && session.user.id
                      ? ({ id: session.user.id, email: session.user.email || '' } as any)
                      : null,
                  merchant: null,
                  isAuthenticated: !!session.user,
                });
              }
            }
          } else {
            const newState: AuthState = {
              user:
                session.user && session.user.id
                  ? ({ id: session.user.id, email: session.user.email || '' } as any)
                  : null,
              merchant: null,
              isAuthenticated: !!session.user,
            };
            if (mounted) setAuthState(newState);
          }
        } else {
          // No live session: clear stale persisted state
          clearPersisted();
          if (mounted) {
            setAuthState({ user: null, merchant: null, isAuthenticated: false });
          }
        }
      } catch {
        console.warn('[useAuth] error initializing auth');
        clearPersisted();
        if (mounted) setAuthState({ user: null, merchant: null, isAuthenticated: false });
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // React to global auth broadcast (App.tsx should be the single supabase listener)
    const onAuthBroadcast = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent)?.detail;
        if (!detail) return;
        const { event, session } = detail;

        if (event === 'SIGNED_OUT') {
          clearPersisted();
          setAuthState({ user: null, merchant: null, isAuthenticated: false });
          return;
        }

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          const freshState: AuthState = {
            user: { id: session.user.id, email: session.user.email || '' } as any,
            merchant: null,
            isAuthenticated: true,
          };
          saveAuth(freshState);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('dinedeals:auth_changed', onAuthBroadcast);

    return () => {
      mounted = false;
      setIsLoading(false);
      window.removeEventListener('dinedeals:auth_changed', onAuthBroadcast);
    };
    // IMPORTANT: run once (do not re-subscribe per route)
  }, [clearPersisted, saveAuth]);

  const loginUser = useCallback(
    async (user: User) => {
      try {
        const { data } = await supabase.from('customers').select('*').eq('id', user.id).maybeSingle();

        const updatedUser: User = data
          ? { ...user, mobileNumber: (data as any).mobile_number }
          : user;

        const newState: AuthState = { user: updatedUser, merchant: null, isAuthenticated: true };
        saveAuth(newState);
        return newState;
      } catch {
        const newState: AuthState = { user, merchant: null, isAuthenticated: true };
        saveAuth(newState);
        return newState;
      }
    },
    [saveAuth]
  );

  const loginMerchant = useCallback(
    async (merchant: Merchant) => {
      try {
        const { data } = await supabase
          .from('merchants')
          .select('*')
          .eq('user_id', merchant.id)
          .maybeSingle();

        const updatedMerchant: Merchant = data
          ? {
              id: merchant.id,
              ownerName: (data as any).manager_name || '',
              restaurantName: (data as any).restaurant_name || (data as any).name || '',
              email: (data as any).email || merchant.email,
              password: merchant.password,
              phone: (data as any).phone || '',
              address: (data as any).street_address || '',
              category: (data as any).category || '',
              website: (data as any).website || '',
              logo: (data as any).logo_url || '',
              deals: merchant.deals || [],
              createdAt: merchant.createdAt,
            }
          : merchant;

        const newState: AuthState = { user: null, merchant: updatedMerchant, isAuthenticated: true };
        saveAuth(newState);
        return updatedMerchant;
      } catch {
        const newState: AuthState = { user: null, merchant, isAuthenticated: true };
        saveAuth(newState);
        return merchant;
      }
    },
    [saveAuth]
  );

  const updateMerchant = useCallback(
    async (merchantToUpdate: Merchant) => {
      try {
        const { data } = await supabase
          .from('merchants')
          .select('*')
          .eq('user_id', merchantToUpdate.id)
          .maybeSingle();

        if (data) {
          const freshMerchant: Merchant = {
            id: merchantToUpdate.id,
            ownerName: (data as any).manager_name || '',
            restaurantName: (data as any).restaurant_name || (data as any).name || '',
            email: (data as any).email || merchantToUpdate.email,
            password: merchantToUpdate.password,
            phone: (data as any).phone || '',
            address: (data as any).street_address || '',
            category: (data as any).category || '',
            website: (data as any).website || '',
            logo: (data as any).logo_url || '',
            deals: merchantToUpdate.deals || [],
            createdAt: merchantToUpdate.createdAt,
          };
          const newState: AuthState = { user: null, merchant: freshMerchant, isAuthenticated: true };
          saveAuth(newState);
          return freshMerchant;
        }
      } catch {
        // ignore
      }
      return merchantToUpdate;
    },
    [saveAuth]
  );

  const logout = useCallback(
    async () => {
      setIsLoading(true);
      try {
        try {
          await (supabase.auth.signOut as any)({ scope: 'local' });
        } catch {
          try {
            await supabase.auth.signOut();
          } catch {}
        }

        clearPersisted();
        setAuthState({ user: null, merchant: null, isAuthenticated: false });
        setUpdateTrigger((prev) => prev + 1);

        try {
          window.dispatchEvent(
            new CustomEvent('dinedeals:auth_changed', { detail: { event: 'SIGNED_OUT', session: null } })
          );
        } catch {}
      } finally {
        setIsLoading(false);
      }
    },
    [clearPersisted]
  );

  return {
    ...authState,
    loginUser,
    loginMerchant,
    updateMerchant,
    logout,
    updateTrigger,
    isLoading,
  };
};

export default useAuth;
