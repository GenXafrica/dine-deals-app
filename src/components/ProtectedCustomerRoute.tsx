import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface ProtectedCustomerRouteProps {
  children: React.ReactNode;
}

export const ProtectedCustomerRoute: React.FC<ProtectedCustomerRouteProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const enforceCustomerAccess = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (!session?.user) {
          if (mounted) {
            setChecking(false);
            navigate("/login", { replace: true });
          }
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 150));

        const { data: status, error } = await supabase
          .rpc("get_user_signin_status")
          .maybeSingle();

        if (error || !status) {
          if (mounted) {
            setChecking(false);
            navigate("/login", { replace: true });
          }
          return;
        }

        if (status.role !== "customer") {
          if (status.role === "merchant") {
            if (location.pathname !== "/merchant-dashboard") {
              if (mounted) navigate("/merchant-dashboard", { replace: true });
            }
          } else {
            if (mounted) navigate("/login", { replace: true });
          }
          return;
        }

        if (status.email_verified !== true) {
          if (location.pathname !== "/verify-email") {
            if (mounted) navigate("/verify-email", { replace: true });
          }
          return;
        }

        if (!status.profile_complete) {
          if (location.pathname !== "/customer-profile") {
            if (mounted) navigate("/customer-profile", { replace: true });
          } else {
            if (mounted) {
              setIsAuthorized(true);
              setChecking(false);
            }
          }
          return;
        }

        if (mounted) {
          setIsAuthorized(true);
          setChecking(false);
        }
      } catch {
        if (mounted) {
          setChecking(false);
          navigate("/login", { replace: true });
        }
      }
    };

    enforceCustomerAccess();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return;

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        enforceCustomerAccess();
      }

      if (event === "SIGNED_OUT") {
        navigate("/login", { replace: true });
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [navigate, location.pathname]);

  if (checking) return null;
  if (!isAuthorized) return null;

  return <>{children}</>;
};

export default ProtectedCustomerRoute;