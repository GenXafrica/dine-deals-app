// src/lib/adminRpc.ts
// Central wrapper for admin RPCs / functions.
// Exports:
//  - named export `adminRpc` (call DB RPC first, then fallbacks)
//  - named export `adminFunctionInvoke` (explicitly invoke Edge Function or raw fetch)
//  - default export `adminRpc` (for existing default imports)

import { supabase } from './supabase';

type AnyObj = Record<string, any>;

// --------- shared helpers: timeout + session wait ----------

async function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('request timeout')), ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Wait until Supabase has a real session (or give up)
async function waitForSession(maxMs = 15000): Promise<any | null> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data?.session) return data.session;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

// Force-refresh the session once (then re-read it)
async function refreshAndGetSession(): Promise<any | null> {
  try {
    // This triggers TOKEN_REFRESHED on success
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed?.error) {
      console.warn('[adminRpc] refreshSession error:', refreshed.error);
    }
  } catch (err) {
    console.warn('[adminRpc] refreshSession threw:', err);
  }
  return await waitForSession(8000);
}

function looksAuthRelated(err: any) {
  const msg = (err?.message || '').toString().toLowerCase();
  const code = (err?.code || '').toString().toLowerCase();
  return (
    msg.includes('jwt') ||
    msg.includes('token') ||
    msg.includes('not authorized') ||
    msg.includes('permission') ||
    msg.includes('unauthorized') ||
    code.includes('401') ||
    code.includes('403')
  );
}

/**
 * adminFunctionInvoke
 * Try to invoke a Supabase Edge Function (functions.invoke). If that fails,
 * try raw fetch to VITE_SUPABASE_URL/functions/v1/<name>.
 * Returns parsed JSON or null on failure.
 */
export async function adminFunctionInvoke<T = any>(
  name: string,
  params?: AnyObj
): Promise<T | null> {
  // Ensure we have a signed-in session
  let session = await waitForSession();
  if (!session) {
    console.debug('[adminRpc] adminFunctionInvoke skipped - no session for', name);
    return null;
  }

  // Prefer client-side functions.invoke if available
  // @ts-ignore
  if (supabase.functions && typeof (supabase.functions as any).invoke === 'function') {
    try {
      const payload = params ?? {};
      const invokeFn = (supabase.functions as any).invoke;

      const resp = await withTimeout(
        invokeFn(name, { body: payload }),
        20000
      );

      // Shape 1: { data, error }
      if (resp && typeof resp === 'object' && ('data' in resp || 'error' in resp)) {
        const anyResp: any = resp;
        if (anyResp.error) {
          // If token is stale, refresh and try once more
          if (looksAuthRelated(anyResp.error)) {
            session = await refreshAndGetSession();
            if (!session) return null;

            const retry = await withTimeout(
              invokeFn(name, { body: payload }),
              20000
            );

            if (retry && typeof retry === 'object' && ('data' in retry || 'error' in retry)) {
              const anyRetry: any = retry;
              if (anyRetry.error) {
                console.warn('[adminRpc] functions.invoke retry error for', name, anyRetry.error);
                return null;
              }
              return (anyRetry.data as T) ?? null;
            }

            return (retry as T) ?? null;
          }

          console.warn('[adminRpc] functions.invoke error for', name, anyResp.error);
          return null;
        }
        return (anyResp.data as T) ?? null;
      }

      // Shape 2: Response-like
      if (resp && typeof (resp as any).json === 'function') {
        try {
          return (await (resp as any).json()) as T;
        } catch {
          try {
            const txt = await (resp as any).text();
            return JSON.parse(txt) as T;
          } catch {
            return null;
          }
        }
      }

      return (resp as T) ?? null;
    } catch (err: any) {
      // If invoke throws with auth-ish error, refresh and try once more
      if (looksAuthRelated(err)) {
        session = await refreshAndGetSession();
        if (!session) return null;

        try {
          const payload = params ?? {};
          const invokeFn = (supabase.functions as any).invoke;
          const retry = await withTimeout(
            invokeFn(name, { body: payload }),
            20000
          );

          if (retry && typeof retry === 'object' && ('data' in retry || 'error' in retry)) {
            const anyRetry: any = retry;
            if (anyRetry.error) return null;
            return (anyRetry.data as T) ?? null;
          }

          return (retry as T) ?? null;
        } catch {
          return null;
        }
      }

      console.warn('[adminRpc] supabase.functions.invoke failed for', name, err);
      // fall through to fetch fallback
    }
  }

  // Fallback: raw fetch
  const base =
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env &&
      (import.meta as any).env.VITE_SUPABASE_URL) ||
    '';
  const url = `${(base || '').replace(/\/+$/, '')}/functions/v1/${name}`;

  if (!base) {
    console.error('[adminRpc] Missing SUPABASE URL for functions fallback');
    return null;
  }

  // Use the real access token
  const authToken = session?.access_token;
  if (!authToken) return null;

  const doFetch = async () => {
    const res = await withTimeout(
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(params ?? {}),
      }),
      20000
    );

    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return (text as unknown) as T;
    }
  };

  try {
    return await doFetch();
  } catch (err: any) {
    if (looksAuthRelated(err)) {
      session = await refreshAndGetSession();
      if (!session?.access_token) return null;
      return await doFetch();
    }
    return null;
  }
}

/**
 * adminRpc
 * - Wait for session
 * - Call supabase.rpc
 * - If it errors or returns empty (common when token is stale), refresh token and retry once
 * - Then fallback to adminFunctionInvoke
 */
export async function adminRpc<T = any>(
  name: string,
  params?: AnyObj
): Promise<T | null> {
  let session = await waitForSession();
  if (!session) {
    console.debug('[adminRpc] skipping RPC - no session for', name);
    return null;
  }

  const callRpc = async () => {
    const { data, error } = await withTimeout(
      supabase.rpc(name as any, params as any),
      20000
    );
    return { data, error };
  };

  try {
    // 1) First attempt
    const first = await callRpc();

    if (first?.error) {
      console.warn('[adminRpc] supabase.rpc error for', name, first.error);

      // auth-ish error: refresh & retry once
      if (looksAuthRelated(first.error)) {
        session = await refreshAndGetSession();
        if (session) {
          const second = await callRpc();
          if (!second.error && second.data !== undefined && second.data !== null) {
            return second.data as T;
          }
        }
      }
    }

    // If we got data, return it
if (first.data !== undefined) {
  console.log('[adminRpc] RPC success:', name, first.data);
  return first.data as T;
}

    // 2) If data is empty/null, do a single refresh-and-retry (this is the key fix)
    session = await refreshAndGetSession();
    if (session) {
      const second = await callRpc();
      if (!second.error && second.data !== undefined && second.data !== null) {
        return second.data as T;
      }
    }
  } catch (err: any) {
    // If rpc threw, and it smells auth-related, refresh & retry once
    if (looksAuthRelated(err)) {
      session = await refreshAndGetSession();
      if (session) {
        try {
          const second = await callRpc();
          if (!second.error && second.data !== undefined && second.data !== null) {
            return second.data as T;
          }
        } catch {
          // ignore
        }
      }
    }

    console.warn('[adminRpc] supabase.rpc threw for', name, err);
  }

  // 3) Fallback: try Edge Function / raw functions endpoint
  try {
    const res = await adminFunctionInvoke<T>(name, params);
    if (res !== null && res !== undefined) return res as T;
  } catch (err) {
    console.error('[adminRpc] adminFunctionInvoke failed for', name, err);
  }

  throw new Error('[adminRpc] No response from RPC: ' + name);
}

export default adminRpc;
