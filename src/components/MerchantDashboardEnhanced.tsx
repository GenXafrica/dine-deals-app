import React, { useState, useEffect, useRef } from "react";
import { createPortal, flushSync } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionStatus } from "./SubscriptionStatus";
import SubscriptionPaywall from "./SubscriptionPaywall";
import { MerchantDashboardDeals } from "./MerchantDashboardDeals";
import Masthead from "./Masthead";
import { supabase } from "@/lib/supabase";
import { Settings, Check } from "lucide-react";

export const MerchantDashboardEnhanced: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const previousPlanRef = useRef<string | null>(null);
  const paymentInProgressRef = useRef(false);
  const dealsRef = useRef<{ refresh: () => void } | null>(null);

  const [merchantProfile, setMerchantProfile] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showAccountSheet, setShowAccountSheet] = useState(false);
  const [subscriptionRefreshKey, setSubscriptionRefreshKey] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchMerchant = async () => {
      const { data } = await supabase
        .from("merchants")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setMerchantProfile(data);
        setMerchantId(data.id);
      }
    };

    fetchMerchant();
  }, [user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("payment") === "success") {
      paymentInProgressRef.current = true;
      sessionStorage.setItem("payment_pending", "1");
      navigate("/merchant-dashboard", { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    if (!merchantId) return;

    const checkEntitlement = async () => {
      const { data: merchantData } = await supabase
        .from("merchants")
        .select("promo_enabled, promo_used_at, promo_expires_at")
        .eq("id", merchantId)
        .maybeSingle();

      const promoActive =
        merchantData?.promo_enabled === true &&
        merchantData?.promo_used_at &&
        merchantData?.promo_expires_at &&
        new Date(merchantData.promo_expires_at) > new Date();

      if (promoActive) {
        setShowPaywallModal(false);
        return;
      }

      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("merchant_id", merchantId)
        .eq("status", "active")
        .maybeSingle();

      if (!data) {
        setShowPaywallModal(true);
      } else {
        setShowPaywallModal(false);
      }
    };

    checkEntitlement();
  }, [merchantId]);

  useEffect(() => {
    if (!merchantId) return;

    if (sessionStorage.getItem("payment_pending") === "1") {
      paymentInProgressRef.current = true;
      previousPlanRef.current = null;
    }

    const handleSubscriptionChange = (currentPlan: string | null) => {
      if (
        paymentInProgressRef.current &&
        currentPlan &&
        (previousPlanRef.current !== currentPlan ||
          previousPlanRef.current === null)
      ) {
        setTimeout(() => {
          toast({
            title: (
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-semibold">Subscription Activated</span>
              </div>
            ),
            description: "Your plan is now active and ready to use.",
            duration: 8000,
            className:
              "border-l-4 border-green-600 bg-green-50 text-green-900",
          });
        }, 200);

        paymentInProgressRef.current = false;
        sessionStorage.removeItem("payment_pending");
      }

      const planChanged = previousPlanRef.current !== currentPlan;

      previousPlanRef.current = currentPlan;

      if (planChanged) {
        setSubscriptionRefreshKey((prev) => prev + 1);
      }

      dealsRef.current?.refresh();
    };

    const initSubscriptionState = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("merchant_id", merchantId)
        .eq("status", "active")
        .maybeSingle();

      handleSubscriptionChange(data?.plan_id ?? null);
    };

    initSubscriptionState();

    const subscriptionChannel = supabase
      .channel(`subscription-changes-${merchantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `merchant_id=eq.${merchantId}`,
        },
        async () => {
          const { data } = await supabase
            .from("subscriptions")
            .select("plan_id")
            .eq("merchant_id", merchantId)
            .eq("status", "active")
            .maybeSingle();

          handleSubscriptionChange(data?.plan_id ?? null);
        }
      )
      .subscribe();

    const merchantChannel = supabase
      .channel(`merchant-changes-${merchantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "merchants",
          filter: `id=eq.${merchantId}`,
        },
        async (payload) => {
          const nextRow = payload.new as any;

          if (nextRow) {
            setMerchantProfile(nextRow);
          } else {
            const { data } = await supabase
              .from("merchants")
              .select("*")
              .eq("id", merchantId)
              .maybeSingle();

            if (data) {
              setMerchantProfile(data);
            }
          }

          dealsRef.current?.refresh();
          setSubscriptionRefreshKey((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscriptionChannel);
      supabase.removeChannel(merchantChannel);
    };
  }, [merchantId, toast]);

  useEffect(() => {
    const resolveLogoUrl = async () => {
      if (!merchantProfile?.logo) {
        setLogoUrl(null);
        return;
      }

      const logo = merchantProfile.logo as string;

      if (/^https?:\/\//i.test(logo)) {
        setLogoUrl(logo);
        return;
      }

      try {
        const res = supabase.storage.from("merchant-images").getPublicUrl(logo);
        const publicUrl =
          (res as any)?.data?.publicUrl ??
          (res as any)?.data?.public_url ??
          null;

        if (publicUrl) {
          setLogoUrl(publicUrl);
          return;
        }
      } catch {}

      setLogoUrl(null);
    };

    resolveLogoUrl();
  }, [merchantProfile]);

  const openAccountSheet = () => {
    (window as any).__BOTTOM_SHEET_OPEN__ = true;
    window.dispatchEvent(new Event("dd:sheet"));
    setShowAccountSheet(true);
  };

  const closeAccountSheet = () => {
    (window as any).__BOTTOM_SHEET_OPEN__ = false;
    window.dispatchEvent(new Event("dd:sheet"));
    setShowAccountSheet(false);
  };

  const handleAccountEditProfile = () => {
    flushSync(() => {
      setShowAccountSheet(false);
    });
    navigate("/merchant-profile", { state: { fromDashboard: true } });
  };

  const handleAccountSignOut = async () => {
    (window as any).__BOTTOM_SHEET_OPEN__ = false;
    window.dispatchEvent(new Event("dd:sheet"));
    closeAccountSheet();
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleUpgrade = () => {
    paymentInProgressRef.current = true;
    sessionStorage.setItem("payment_pending", "1");
    setShowPaywallModal(true);
  };

  const accountSheetNode =
    showAccountSheet && typeof document !== "undefined"
      ? createPortal(
          <>
            <div
              onClick={closeAccountSheet}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.25)",
                pointerEvents: "auto",
                zIndex: 9998,
              }}
            />
            <div
              role="dialog"
              aria-label="Account actions"
              style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 0,
                background: "#FFFFFF",
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                zIndex: 9999,
                padding: 16,
              }}
            >
              <div className="flex gap-3">
                <button
                  onClick={handleAccountEditProfile}
                  className="flex-1 h-12 rounded-lg px-4 text-center"
                  style={{ background: "#16A34A", color: "#FFFFFF" }}
                >
                  Edit Profile
                </button>

                <button
                  onClick={handleAccountSignOut}
                  className="flex-1 h-12 rounded-lg px-4 text-center"
                  style={{ background: "#9CA3AF", color: "#FFFFFF" }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  if (!merchantProfile) return null;

  return (
    <main
      className="flex-1 flex flex-col px-2"
      style={{
        minHeight: 0,
        height: "100vh",
        overflow: "hidden",
        pointerEvents: showAccountSheet ? "none" : "auto",
      }}
    >
      <Masthead
        title={merchantProfile.first_name}
        greet
        logoSrc={logoUrl ?? undefined}
        showNotifications={false}
        rightSlot={
          <button
            type="button"
            aria-label="Account settings"
            onClick={openAccountSheet}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              cursor: "pointer",
            }}
          >
            <Settings className="h-8 w-8" />
          </button>
        }
      />

      <SubscriptionStatus
        key={subscriptionRefreshKey}
        onUpgrade={handleUpgrade}
      />

      <SubscriptionPaywall
        isOpen={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
      />

      <div className="mt-4 overflow-auto" style={{ minHeight: 0 }}>
        <MerchantDashboardDeals ref={dealsRef} merchant={merchantProfile} />
      </div>

      {accountSheetNode}
    </main>
  );
};

export default MerchantDashboardEnhanced;