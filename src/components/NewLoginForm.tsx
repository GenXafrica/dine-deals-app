import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInputWithToggle } from "./PasswordInputWithToggle";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

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
  const [forgotLoading, setForgotLoading] = useState(false);

  const showFriendlyToast = (title: string, description: string) => {
    toast({
      title,
      description,
      variant: "destructive",
    });
  };

  const getFriendlyMessage = (err: any) => {
    const msg = String(err?.message ?? "").toLowerCase();
    if (
      msg.includes("invalid") ||
      msg.includes("credentials") ||
      msg.includes("not found")
    ) {
      return "That email or password doesn’t look right. Please try again.";
    }
    return "Something went wrong while logging in. Please try again.";
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (error || !data?.user) {
        console.error("Supabase login error:", error);
        showFriendlyToast("Login Failed", getFriendlyMessage(error));
        setLoading(false);
        return;
      }

      window.location.replace("/auth/callback");
    } catch (err) {
      console.error("Unexpected login error:", err);
      showFriendlyToast("Login Failed", getFriendlyMessage(err));
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      showFriendlyToast(
        "Reset password",
        "Enter your email address above and we'll send a reset link."
      );
      return;
    }

    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        formData.email.trim(),
        { redirectTo: "https://app.dinedeals.co.za/reset-password" }
      );

      if (error) {
        console.error("Reset password error:", error);
        showFriendlyToast(
          "Reset password",
          "Could not send reset link. Please try again."
        );
        return;
      }

      toast({
        title: "Reset password",
        description: "Check your email for a link to reset your password.",
      });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || !formData.email || !formData.password) return;
    await handleLogin();
  };

  return (
    <form
  className="space-y-4"
  onSubmit={handleSubmit}
  autoComplete="on"
  action="#"
  method="post"
>
      <div className="space-y-3">
        <div>
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
        </div>

        <div>
          <Label htmlFor="login-password">Password</Label>
          <PasswordInputWithToggle
            id="login-password"
            name="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />
        </div>

        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={forgotLoading}
            className="text-sm font-medium text-green-600 hover:underline"
          >
            {forgotLoading ? "Sending..." : "Forgot your password?"}
          </button>
        </div>

        <Button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700"
          size="lg"
          disabled={loading || !formData.email || !formData.password}
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </div>
    </form>
  );
};