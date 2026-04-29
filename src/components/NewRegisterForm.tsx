import React, { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInputWithToggle } from "./PasswordInputWithToggle";
import { RegistrationConfirmationModal } from "./RegistrationConfirmationModal";
import { supabase } from "@/lib/supabase";
import { Utensils, Store, X } from "lucide-react";

interface NewRegisterFormProps {
  onSuccess?: () => void;
  userType?: "customer" | "merchant";
}

export const NewRegisterForm: React.FC<NewRegisterFormProps> = ({
  onSuccess,
  userType = "customer",
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<"customer" | "merchant">(
    userType
  );
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const signupInProgressRef = useRef(false);

  const selectAccountType = (type: "customer" | "merchant") => {
    setAccountType(type);
    setStep(2);
  };

  const handleCancel = () => {
    setStep(1);
    setError("");
  };

  const isEmailValid = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isFormValid = (): boolean => {
    return (
      isEmailValid(formData.email) &&
      formData.password.length >= 6 &&
      formData.confirmPassword === formData.password
    );
  };

  const handleRegisterClick = () => {
    if (loading || signupInProgressRef.current) return;

    setError("");

    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (!isEmailValid(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleCloseConfirmModal = () => {
    if (loading || signupInProgressRef.current) return;
    setShowConfirmModal(false);
  };

  const handleConfirmRegistration = async () => {
    if (loading || signupInProgressRef.current) return;

    signupInProgressRef.current = true;
    setLoading(true);
    setShowConfirmModal(false);

    const email = formData.email.trim().toLowerCase();

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role: accountType,
          },
        },
      });

      if (error) {
        const message = error.message || "";
        const isTimeout =
          message.includes("504") ||
          message.toLowerCase().includes("timed out") ||
          message.toLowerCase().includes("timeout");

        if (isTimeout) {
          localStorage.setItem("pending_verification_email", email);
          window.location.replace("/verify-email");
          return;
        }

        setError(message);
        setLoading(false); // reset ONLY on non-timeout failure
        signupInProgressRef.current = false;
        return;
      }

      localStorage.setItem("pending_verification_email", email);

      // SUCCESS → keep loading true until redirect completes
      window.location.replace("/verify-email");
      return;
    } catch (err) {
      console.error("Registration error:", err);
      setError("Registration failed. Please try again.");
      setLoading(false); // reset on error
      signupInProgressRef.current = false;
    }
  };

  return (
    <div className="relative overflow-hidden">
      <div
        className={`transition-all duration-200 ease-out ${
          step === 1
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        {step === 1 && (
          <div className="space-y-6">
            <Label className="text-lg font-semibold text-center block">
              Select Account Type
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => selectAccountType("customer")}
                className="rounded-xl p-5 text-white text-left transition hover:scale-[1.01]"
                style={{ backgroundColor: "#F59E0B" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Utensils className="w-7 h-7" />
                  <span className="text-xl font-semibold">Diner</span>
                </div>
                <p className="text-white/90">Find deals near you</p>
              </button>

              <button
                type="button"
                onClick={() => selectAccountType("merchant")}
                className="rounded-xl p-5 text-white text-left transition hover:scale-[1.01]"
                style={{ backgroundColor: "#D94B3D" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Store className="w-7 h-7" />
                  <span className="text-xl font-semibold">Restaurant</span>
                </div>
                <p className="text-white/90">Create and manage deals</p>
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        className={`transition-all duration-200 ease-out ${
          step === 2
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        {step === 2 && (
          <div className="space-y-4">

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Registration</h3>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1 text-gray-500 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <PasswordInputWithToggle
                  id="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <p className="text-sm text-gray-500 mt-1">
                  Minimum 8 characters
                </p>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <PasswordInputWithToggle
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
              </div>

              <Button
                onClick={handleRegisterClick}
                disabled={loading || !isFormValid()}
                className="w-full min-h-[48px] bg-green-600 hover:bg-green-700"
              >
{loading
  ? `Signing up as ${
      accountType === "customer"
        ? "Diner"
        : "Restaurant"
    }...`
  : `Sign up as ${
      accountType === "customer"
        ? "Diner"
        : "Restaurant"
    }`}
              </Button>
            </div>

            <RegistrationConfirmationModal
              open={showConfirmModal}
              onClose={handleCloseConfirmModal}
              accountType={accountType}
              email={formData.email}
              onConfirm={handleConfirmRegistration}
              loading={loading}
            />
          </div>
        )}
      </div>
    </div>
  );
};
