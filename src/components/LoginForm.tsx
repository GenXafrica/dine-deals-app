// src/components/NewLoginForm.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInputWithToggle } from "./PasswordInputWithToggle";
import { AccountTypeSelectionModal } from "./AccountTypeSelectionModal";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useRoleBasedRouting } from "@/hooks/useRoleBasedRouting";

interface NewLoginFormProps {
  onSuccess?: () => void;
  userType?: "customer" | "merchant" | null;
}

export const NewLoginForm: React.FC<NewLoginFormProps> = ({
  onSuccess,
  userType,
}) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const {
    redirectByRole,
    showAccountTypeModal,
    setShowAccountTypeModal,
    handleAccountTypeSelection,
  } = useRoleBasedRouting();

  // Robust toast helper: supports multiple toast APIs and falls back to alert()
  const showFriendlyToast = (title: string, description: string) => {
    try {
      // react-hot-toast style
      if ((toast as any)?.error && typeof (toast as any).error === "function") {
        (toast as any).error(description);
        console.debug("showFriendlyToast -> used toast.error");
        return;
      }

      // custom UI library style: toast({...})
      if (typeof toast === "function") {
        (toast as any)({
          title,
          description,
          variant: "destructive",
          duration: 3000,
        });
        console.debug("showFriendlyToast -> used toast(func)");
        return;
      }

      // another possible API: toast.show({...})
      if ((toast as any)?.show && typeof (toast as any).show === "function") {
        (toast as any).show({ title, description });
        console.debug("showFriendlyToast -> used toast.show");
        return;
      }
    } catch (e) {
      console.warn("showFriendlyToast: toast call failed", e);
    }

    // last resort
    try {
      // eslint-disable-next-line no-alert
      alert(`${title}\n\n${description}`);
      console.debug("showFriendlyToast -> used alert fallback");
    } catch (e) {
      console.warn("showFriendlyToast: alert fallback failed", e);
    }
  };

  const getFriendlyMessage = (err: any) => {
    const raw = err?.message ?? String(err ?? "");
    const msg = String(raw).toLowerCase();

    // Most common Supabase invalid credentials messages
    if (
      msg.includes("invalid login") ||
      msg.includes("invalid credentials") ||
      msg.includes("user not found") ||
      msg.includes("invalid email or password")
    ) {
      // Friendly message for wrong email/password
      return "That email or password doesn’t look right. Please try again.";
    }

    if (
      msg.includes("email not verified") ||
      msg.includes("email not validated") ||
      msg.includes("email not confirmed")
    ) {
      return "Please verify your email before logging in.";
    }

    return null;
  };

  const handleLogin = async () => {
    setLoading(true);

    try {
      const { data: loginData, error } = await supabase.auth.signInWithPassword(
        {
          email: formData.email,
          password: formData.password,
        }
      );

      // If supabase returns an error object
      if (error) {
        console.error("Login error (returned):", error);

        const friendly = getFriendlyMessage(error);
        if (friendly) {
          console.debug("Friendly message selected:", friendly);
          showFriendlyToast("Login Failed", friendly);
        } else {
          showFriendlyToast(
            "Login Failed",
            "Login failed. Please try again."
          );
        }

        setLoading(false);
        return;
      }

      // Safety: ensure we have a user
      if (!loginData?.user) {
        console.error("Login returned no user object", loginData);
        showFriendlyToast(
          "Login Failed",
          "Authentication failed. Please try again."
        );
        setLoading(false);
        return;
      }

      // Store password for profile completion if needed
      sessionStorage.setItem("login_password", formData.password);

      // ✅ CHECK EMAIL VERIFICATION FIRST - before any other routing
      // This ensures a clean flow: login → verify-email (if needed) → profile
      const isEmailVerified = Boolean(
        (loginData.user as any).email_confirmed_at || (loginData.user as any).confirmed_at
      );

      if (!isEmailVerified) {
        // Set skip flag to prevent any post-login redirect interference
        try {
          (window as any).__dinedeals_skip_postlogin_redirect = true;
          sessionStorage.setItem("skipProfileRedirectOnce", "true");
        } catch {}
        
        // Use hard redirect to prevent any race conditions with other hooks
        window.location.replace("/verify-email");
        return;
      }

      // Email is verified - proceed with role-based redirect
      await redirectByRole(loginData.user.id);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Handle thrown errors (AuthApiError or other exceptions)
      console.error("Login error (caught):", error);

      const friendly = getFriendlyMessage(error);
      if (friendly) {
        console.debug("Friendly message selected (caught):", friendly);
        showFriendlyToast("Login Failed", friendly);
      } else {
        showFriendlyToast(
          "Login Failed",
          "Something went wrong while logging in. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <div className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Password</Label>
            <PasswordInputWithToggle
              autoComplete="current-password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>

          <Button
            onClick={handleLogin}
            className="w-full"
            size="lg"
            disabled={loading || !formData.email || !formData.password}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>
        </div>
      </div>

      <AccountTypeSelectionModal
        isOpen={showAccountTypeModal}
        onSelect={handleAccountTypeSelection}
      />
    </>
  );
};
