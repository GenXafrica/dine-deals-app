// DO NOT MODIFY – AUTH / ROUTING CRITICAL
// This file controls global routing, guards, and auth flow.
// Changes here can break login, profile routing, and dashboard access.
// Paystack or subscription work must NEVER modify this file.

// force rebuild-1

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProvider } from "@/contexts/AppContext";
import { PWAWrapper } from "@/components/PWAWrapper";
import { MobilePWAToast } from "@/components/MobilePWAToast";
import Index from "./pages/Index";
import Deals from "./pages/deals/index";
import DealDetail from "./pages/deals/[dealId]";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import CustomerDashboard from "./pages/customer-dashboard";
import { AuthCallback } from "@/components/AuthCallback";
import { EmailValidationPage } from "@/components/EmailValidationPage";
import ModernAdminDashboard from "@/components/ModernAdminDashboard";
import { CustomerProfileEdit } from "@/components/CustomerProfileEdit";
import { MerchantProfileEdit } from "@/components/MerchantProfileEdit";
import { MerchantDashboardEnhanced } from "@/components/MerchantDashboardEnhanced";
import { PaymentSuccess } from "@/components/PaymentSuccess";
import ProtectedCustomerRoute from "@/components/ProtectedCustomerRoute";
import { ProtectedMerchantRoute } from "@/components/ProtectedMerchantRoute";
import { useEffect, useRef, useState } from "react";
import { supabase, broadcastAuthChange } from "@/lib/supabase";
import { AboutUs } from "@/components/AboutUs";
import AppLayout from "@/components/AppLayout";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import WireframeAnalysisPage from "./pages/InfoGuides";
import { AgentDashboard } from "@/components/AgentDashboard";

/* =========================
   SCROLL RESET ON ROUTE CHANGE
   ========================= */

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, [pathname]);

  return null;
};

/* =========================
   GLOBAL SUPABASE READY GATE
   ========================= */

const isResetPasswordRoute = () => {
  try {
    return window.location.pathname === "/reset-password";
  } catch {
    return false;
  }
};

const useSupabaseReady = () => {
  const [ready, setReady] = useState(() => isResetPasswordRoute());

  useEffect(() => {
    let mounted = true;

    if (isResetPasswordRoute()) {
      setReady(true);
      return;
    }

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (mounted) setReady(true);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async () => {
      if (!mounted) return;
      setReady(true);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return ready;
};

/* =========================
   ADMIN ROUTE GUARD
   ========================= */

const ProtectedAdminRoute = ({
  children,
}: {
  children: JSX.Element;
}) => {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        if (mounted) setAllowed(false);
        return;
      }

      const { data: admin } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (mounted) setAllowed(!!admin);
    };

    check();
    return () => {
      mounted = false;
    };
  }, []);

  if (allowed === null) return null;
  if (!allowed) return <Navigate to="/login" replace />;
  return children;
};

/* =========================
   COOKIE CONSENT
   ========================= */

const CONSENT_KEY = "dd_cookie_preferences";

const isAppInstalled = () => {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // @ts-ignore
  if ((window.navigator as any).standalone) return true;
  return false;
};

const CookieConsent = () => {
  const [show, setShow] = useState(false);
  const [allowAll, setAllowAll] = useState(false);

  useEffect(() => {
    if (!isAppInstalled()) return;
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setShow(true);
  }, []);

  const saveConsent = (allAccepted: boolean) => {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        essential: true,
        allAccepted,
      })
    );
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-[rgba(0,0,0,0.75)] backdrop-blur-md text-[#F3F4F6] px-4 py-4 shadow-[0_8px_25px_rgba(0,0,0,0.25)]">
      <div className="flex flex-col gap-3 text-[11px]">
        <p className="leading-snug">
          We use cookies to help this site function and support marketing
          efforts. Essential cookies always on.
        </p>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allowAll}
            onChange={(e) => setAllowAll(e.target.checked)}
            className="accent-[#34A853] scale-90"
          />
          Allow all
        </label>

        <div className="flex gap-2 mt-1">
          <button
            onClick={() => saveConsent(false)}
            className="flex-1 bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#374151] rounded-md py-1 text-[11px]"
          >
            Reject
          </button>

          <button
            onClick={() => saveConsent(allowAll)}
            className="flex-1 bg-[#34A853] hover:bg-[#2E9448] text-white rounded-md py-1 text-[11px]"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================
   ROUTES
   ========================= */

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/deals" element={<Deals />} />
    <Route path="/deals/:dealId" element={<DealDetail />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/about" element={<AboutUs />} />
    <Route path="/verify-email" element={<EmailValidationPage />} />
    <Route path="/auth/callback" element={<AuthCallback />} />

    <Route
      path="/customer-profile"
      element={
        <ProtectedCustomerRoute>
          <CustomerProfileEdit />
        </ProtectedCustomerRoute>
      }
    />

    <Route
      path="/customer-dashboard"
      element={
        <ProtectedCustomerRoute>
          <CustomerDashboard />
        </ProtectedCustomerRoute>
      }
    />

    <Route
      path="/merchant-profile"
      element={
        <ProtectedMerchantRoute>
          <MerchantProfileEdit />
        </ProtectedMerchantRoute>
      }
    />

    <Route
      path="/merchant-dashboard"
      element={
        <ProtectedMerchantRoute>
          <MerchantDashboardEnhanced />
        </ProtectedMerchantRoute>
      }
    />

    <Route path="/agent-dashboard" element={<AgentDashboard />} />

    <Route
      path="/admin-dashboard"
      element={
        <ProtectedAdminRoute>
          <ModernAdminDashboard />
        </ProtectedAdminRoute>
      }
    />

    <Route path="/payment-success" element={<PaymentSuccess />} />

    <Route path="/reset-password" element={<ResetPasswordPage />} />

    <Route path="/customer-guide" element={<WireframeAnalysisPage />} />
    <Route path="/merchant-guide" element={<WireframeAnalysisPage />} />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

/* =========================
   APP ROOT
   ========================= */

function App(): JSX.Element {
  const ready = useSupabaseReady();
  const lastEnsuredUser = useRef<string | null>(null);

  useEffect(() => {
    if (window.location.hostname === "preview.app.dinedeals.co.za") {
      document.title = "Dine Deals Preview";
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(
      (event, session) => {
        broadcastAuthChange(event, session);

        if (!session?.user) return;
        if (lastEnsuredUser.current === session.user.id) return;

        lastEnsuredUser.current = session.user.id;
      }
    );

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  if (!ready) return null;

  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={new QueryClient()}>
        <TooltipProvider>
          <AppProvider>
            <PWAWrapper>
              <BrowserRouter>
                <ScrollToTop />
                <MobilePWAToast />
                <CookieConsent />
                <Toaster />
                <AppLayout>
                  <AppRoutes />
                </AppLayout>
              </BrowserRouter>
            </PWAWrapper>
          </AppProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;