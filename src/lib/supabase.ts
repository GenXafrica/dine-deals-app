import { createClient, Session } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isResetPasswordRoute = () => {
  try {
    return window.location.pathname === '/reset-password';
  } catch {
    return false;
  }
};

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'deals-auth',
    },

    realtime: {
      params: {
        eventsPerSecond: 0,
      },
    },

    global: {
      fetch: async (url, options = {}) => {
        try {
          const response = await fetch(url as any, options as any);
          return response;
        } catch (err) {
          console.warn('Network request failed:', url, err);
          throw err;
        }
      },
    },
  }
);

export default supabase;

export function broadcastAuthChange(event: string, session: Session | null) {
  try {
    const payload = { event, session };
    window.dispatchEvent(
      new CustomEvent('dinedeals:auth_changed', { detail: payload })
    );
    console.info('[supabase] broadcast auth change', event, !!session);
  } catch (err) {
    console.warn('failed to broadcast auth change', err);
  }
}

(async () => {
  try {
    if (isResetPasswordRoute()) return;

    const { data } = await supabase.auth.getSession();
    broadcastAuthChange('INITIAL_SESSION', data?.session ?? null);
  } catch (err) {
    console.warn('[supabase] initial session check failed', err);
  }
})();

const WATCH_KEYS = [
  'deals-auth',
  'supabase.auth.token',
  'supabase.auth.session'
];

function storageEventHandler(ev: StorageEvent) {
  try {
    if (!ev.key) return;
    if (isResetPasswordRoute()) return;

    const key = ev.key;

    if (WATCH_KEYS.some((k) => key.includes(k))) {
      supabase.auth
        .getSession()
        .then(({ data }) => {
          broadcastAuthChange('STORAGE_UPDATE', data?.session ?? null);
        })
        .catch(() => {
          broadcastAuthChange('STORAGE_UPDATE', null);
        });
    }
  } catch {
    // ignore
  }
}

try {
  window.addEventListener('storage', storageEventHandler);
} catch {
  // ignore
}