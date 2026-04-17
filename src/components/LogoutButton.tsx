// src/components/LogoutButton.tsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type LogoutButtonProps = {
  className?: string;
};

export const LogoutButton: React.FC<LogoutButtonProps> = ({ className = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Supabase signOut error:", err);
    }

    try {
      localStorage.removeItem("supabase.auth.token");
      localStorage.removeItem("supabase.auth.session");
      sessionStorage.clear();
    } catch {}

    const origin = window.location.origin;
    const pathname = location?.pathname ?? window.location.pathname ?? "";

    const isOnMerchantPage =
      pathname.startsWith("/merchant") || pathname.includes("/merchant/profile");

    try {
      if (isOnMerchantPage) {
        navigate("/", { replace: true });
        window.location.assign(`${origin}/`);
      } else {
        navigate("/admin", { replace: true });
        window.location.assign(`${origin}/admin`);
      }
    } catch {
      window.location.assign(origin);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleLogout}
      aria-label="Sign out"
      className={`w-full ${className}`.trim()}
    >
      Sign out
    </Button>
  );
};

export default LogoutButton;
