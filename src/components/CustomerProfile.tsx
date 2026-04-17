import React, { useEffect, useState, FormEvent, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Masthead from "./Masthead";
import { PhoneInput } from "@/components/PhoneInput";

type CustomerRow = {
  id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  city?: string | null;
  email_verified?: boolean | null;
};

const CustomerProfile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [city, setCity] = useState<string>("");

  const [customerId, setCustomerId] = useState<string | null>(null);

  const handleSaveRef = useRef<((e?: FormEvent) => Promise<void> | void) | null>(null);
  const handleCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        const user = (userRes as any)?.user;
        if (!user) {
          navigate("/", { replace: true });
          return;
        }

        const isVerified = Boolean(
          (user as any).email_confirmed_at || (user as any).confirmed_at
        );

        if (!isVerified) {
          navigate("/email-validation", { replace: true });
          return;
        }

        const { data: custRow } = await supabase
          .from<CustomerRow>("customers")
          .select("id, first_name, last_name, phone, city")
          .eq("user_id", user.id)
          .maybeSingle();

        if (mounted && custRow) {
          setCustomerId(custRow.id ?? null);
          setFirstName(custRow.first_name ?? "");
          setLastName(custRow.last_name ?? "");
          setPhone(custRow.phone ?? "");
          setCity(custRow.city ?? "");
        }
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Could not load profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function handleSave(e?: FormEvent) {
    e?.preventDefault?.();
    setSaving(true);
    setError(null);

    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const user = (userRes as any)?.user;
      if (!user) throw new Error("Not signed in");

      let result;

      if (customerId) {
        result = await supabase.rpc("update_customer_profile", {
          p_customer_id: customerId,
          p_first_name: firstName.trim() || null,
          p_last_name: lastName.trim() || null,
          p_email: null,
          p_phone: phone || null,
          p_address: null,
          p_city: city.trim() || null,
          p_postal_code: null,
        });
      } else {
        result = await supabase.rpc("create_customer_profile", {
          p_first_name: firstName.trim() || null,
          p_last_name: lastName.trim() || null,
          p_email: user.email || null,
          p_phone: phone || null,
          p_address: null,
          p_city: city.trim() || null,
          p_postal_code: null,
        });
      }

      if (result.error) throw result.error;

      navigate("/customer/dashboard", { replace: true });
    } catch (e: any) {
      if (!error) setError(e?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    navigate("/", { replace: true });
  }

  useEffect(() => {
    handleSaveRef.current = handleSave;
    handleCancelRef.current = handleCancel;
  }, [handleSave, handleCancel]);

  if (loading) return <div>Loading…</div>;

  const pathnameLower = (location.pathname || "").toLowerCase();
  const showFixedBar =
    pathnameLower === "/customer-profile" ||
    pathnameLower.includes("/customer-profile");

  return (
    <div className="md:max-w-2xl md:mx-auto md:px-4 md:pt-4 md:pb-24">
      <Masthead
        title="My Profile"
        subtitle={
          <span className="text-sm text-gray-600">
            All fields marked with <span className="text-red-500">*</span> must be completed.
          </span>
        }
      />

      {error ? <div role="alert">{error}</div> : null}

      <form onSubmit={handleSave} className="md:mt-2">
        <div className="md:grid md:grid-cols-2 md:gap-4">

          <div>
            <label>
              First Name *
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </label>
          </div>

          <div>
            <label>
              Last Name *
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </label>
          </div>

          <div>
            <label>
              Phone *
              <PhoneInput
                value={phone}
                onChange={setPhone}
                includeCountryCode
                className="w-full bg-white"
                required
              />
            </label>
          </div>

          <div>
            <label>
              City
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </label>
          </div>

        </div>
      </form>

      {showFixedBar ? (
        <div
          className="fixed left-0 right-0 bottom-0 z-50"
          style={{
            background: "white",
            borderTop: "1px solid rgba(0,0,0,0.06)",
            padding: "0.75rem",
            minHeight: "var(--dd-bottom-bar-h, 80px)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
          }}
        >
          <div className="flex gap-3">
            <button type="button" onClick={(e) => handleSave(e as any)} disabled={saving}>
              {saving ? "Saving…" : "Save Profile"}
            </button>
            <button type="button" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CustomerProfile;