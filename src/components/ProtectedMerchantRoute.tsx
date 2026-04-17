// DO NOT MODIFY – AUTH / ROUTING CRITICAL
// This file controls merchant access and routing protection.

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface ProtectedMerchantRouteProps {
  children: React.ReactNode;
}

export const ProtectedMerchantRoute: React.FC<ProtectedMerchantRouteProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathnameRef = useRef(location.pathname);

  const [checking, setChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;

    const failToLogin = () => {
      if (mounted) {
        setIsAuthorized(false);
        setChecking(false);
        navigate("/login", { replace: true });
      }
    };

    const enforceMerchantAccess = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (!session?.user) {
          failToLogin();
          return;
        }

        const { data: merchant, error } = await supabase
          .from("merchants")
          .select("profile_complete")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error || !merchant) {
          failToLogin();
          return;
        }

        if (!merchant.profile_complete && pathnameRef.current !== "/merchant-profile") {
          if (mounted) {
            setChecking(false);
            navigate("/merchant-profile", { replace: true });
          }
          return;
        }

        if (mounted) {
          setIsAuthorized(true);
          setChecking(false);
        }
      } catch {
        failToLogin();
      }
    };

    enforceMerchantAccess();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (!session) {
        failToLogin();
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        enforceMerchantAccess();
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [navigate]);

  if (checking) return null;
  if (!isAuthorized) return null;

  return <>{children}</>;
};

export default ProtectedMerchantRoute;