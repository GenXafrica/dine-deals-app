// src/components/AdminLogin.tsx
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

type Props = {
  onLogin?: () => void;
};

const ADMIN_SIGNED_IN_EVENT = "dinedeals:admin_signed_in";

export function AdminLogin({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  async function normalizeFunctionResponse(res: any) {
    if (res && (res as any).data) return (res as any).data;
    if (!res) return null;
    if (typeof res === "object" && !("text" in res) && !("json" in res)) return res;
    try {
      if (typeof res.json === "function") {
        try {
          return await res.json();
        } catch {}
      }
      if (typeof res.text === "function") {
        const txt = await res.text();
        try {
          return JSON.parse(txt);
        } catch {
          return txt;
        }
      }
    } catch {
      // ignore
    }
    return res;
  }

  const notifySignedIn = () => {
    try {
      window.dispatchEvent(new CustomEvent(ADMIN_SIGNED_IN_EVENT));
    } catch {}
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const res = await supabase.functions.invoke("admin-auth", {
        body: { email, password },
      });

      const payload: any = await normalizeFunctionResponse(res);

      const fnError =
        payload?.error ||
        (payload?.status && payload.status >= 400 ? payload : null) ||
        (payload && typeof payload === "string" && payload.toLowerCase().includes("error")
          ? { message: payload }
          : null);

      if (fnError) {
        const message =
          fnError.message || fnError.error || JSON.stringify(fnError) || "Login failed";
        toast({ title: "Admin login failed", description: message, variant: "destructive" });
        setLoading(false);
        return;
      }

      // IMPORTANT:
      // Ignore payload.redirect.
      // It can keep the user on /admin?modal=login and prevent the modal closing logic.
      // We rely on setting the session + calling onLogin() to land on /admin cleanly.

      const accessToken =
        payload?.access_token ?? payload?.token ?? payload?.session?.access_token;
      const refreshToken =
        payload?.refresh_token ?? payload?.session?.refresh_token ?? null;

      if (accessToken && refreshToken) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token: String(accessToken),
          refresh_token: String(refreshToken),
        } as any);

        if (setErr) {
          toast({
            title: "Login error",
            description: `Failed to set session: ${setErr.message || String(setErr)}`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        await sleep(500);

        const { data: verifySession } = await supabase.auth.getSession();
        if (!verifySession?.session) {
          await sleep(400);
          const { data: verifySession2 } = await supabase.auth.getSession();
          if (!verifySession2?.session) {
            toast({
              title: "Login error",
              description: "Session was not established properly",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }

        notifySignedIn();
        toast({ title: "Signed in", description: "Admin access granted." });
        onLogin?.();
        setLoading(false);
        return;
      }

      const returnedUser = payload?.user ?? payload?.admin_user ?? payload?.data?.user ?? null;
      if (returnedUser) {
        let { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          notifySignedIn();
          toast({ title: "Signed in", description: "Admin access granted." });
          onLogin?.();
          setLoading(false);
          return;
        }

        const maxRetries = 10;
        const retryDelayMs = 300;
        let found = false;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          await sleep(retryDelayMs);
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            found = true;
            break;
          }
        }

        if (found) {
          notifySignedIn();
          toast({ title: "Signed in", description: "Admin access granted." });
          onLogin?.();
          setLoading(false);
          return;
        }

        toast({
          title: "Signed in (no client session)",
          description:
            "Login returned a user but no client session was established. Please refresh or contact support.",
          variant: "warning",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Admin login",
        description: "Login completed but no session tokens were returned.",
        variant: "warning",
      });
    } catch (err: any) {
      const message = err?.message ?? String(err ?? "Login failed");
      toast({ title: "Admin login failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on" aria-label="Admin login form">
      <h2 className="text-lg font-medium">Admin sign in</h2>

      <div>
        <label htmlFor="admin-email" className="block text-sm font-medium mb-1">Email</label>
        <input
          id="admin-email"
          name="email"
          type="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
          placeholder="admin@example.com"
          aria-label="Admin email"
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="admin-password" className="block text-sm font-medium mb-1">Password</label>
        <div className="relative">
          <input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
            className="w-full px-3 py-2 border rounded pr-10"
            placeholder="password"
            aria-label="Admin password"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-slate-800 text-white disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}

export default AdminLogin;
