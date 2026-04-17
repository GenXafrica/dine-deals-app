// src/components/CustomerProfileEdit.tsx
import React, { useEffect, useState, FormEvent, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AuthPopup } from '@/components/AuthPopup';
import Masthead from '@/components/Masthead';
import FooterButtons from '@/components/FooterButtons';
import { Eye, EyeOff } from 'lucide-react';
import { PhoneInput } from '@/components/PhoneInput';

const SESSION_REGISTRATION_KEY = 'dine_deals_pending_registration';

export function CustomerProfileEdit(): JSX.Element {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attemptedSave, setAttemptedSave] = useState(false); // ✅ NEW

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordVisibleNew, setPasswordVisibleNew] = useState(false);
  const [passwordVisibleConfirm, setPasswordVisibleConfirm] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    // internal storage: 9 local digits (no country code)
    lastName: '',
    phone: '',
    // keep a countryCode value so we can pass a sensible initial value to PhoneInput
    countryCode: '+27',
    // start empty so placeholder "Cape Town" is shown only
    city: '',
    email: '',
    marketing_email_opt_in: false,
    marketing_whatsapp_opt_in: false,
    birthday: '',
    anniversary: ''
  });

  const DBG = '[CPE]';

  const normaliseCustomerRecord = (maybe: any) => {
    if (!maybe) return null;
    if (Array.isArray(maybe)) return maybe.length ? maybe[0] : null;
    if (maybe.data && (Array.isArray(maybe.data) || typeof maybe.data === 'object')) {
      return normaliseCustomerRecord(maybe.data);
    }
    return maybe;
  };

  // Try to pick sensible country code from browser locale (fallback +27)
  const inferCountryCodeFromLocale = (): string => {
    try {
      const locale =
        (typeof navigator !== 'undefined' &&
          (navigator.language || (navigator as any).userLanguage)) ||
        'en-ZA';
      const region = locale.includes('-') ? locale.split('-')[1].toUpperCase() : '';
      const map: Record<string, string> = {
        ZA: '+27',
        NG: '+234',
        KE: '+254',
        GB: '+44',
        US: '+1',
        IN: '+91',
        AU: '+61',
        CA: '+1'
      };
      return region && map[region] ? map[region] : '+27';
    } catch {
      return '+27';
    }
  };

  const fetchAndFill = async (userId: string | null, mountedRef: { current: boolean }) => {
    if (!userId) return null;
    try {
      const { data: custRaw, error: rpcErr } = await supabase
        .rpc('get_current_customer', { user_uuid: userId })
        .maybeSingle();

      if (rpcErr) {
        // Important: do not throw; just surface a message and allow the page to render.
        if (mountedRef.current) {
          console.warn(DBG, 'get_current_customer failed', rpcErr);
          setErrorMessage('Could not load your profile details. Please try again.');
        }
        return null;
      }

      const cust = normaliseCustomerRecord(custRaw);
      if (!cust) return null;

      if (cust && mountedRef.current) {
        const firstName =
          cust.first_name ??
          cust.firstName ??
          (() => {
            const fn = (cust.full_name ?? cust.fullName ?? '').toString().trim();
            if (!fn) return '';
            if (fn.indexOf(' ') === -1) return fn;
            return fn.split(' ')[0];
          })();

        const lastName =
          cust.last_name ??
          cust.lastName ??
          (() => {
            const fn = (cust.full_name ?? cust.fullName ?? '').toString().trim();
            if (!fn) return '';
            if (fn.indexOf(' ') === -1) return '';
            return fn.replace(/^.*\s+/, '');
          })();

        // Phone: ensure digits-only and limited to 9 local digits
        const phone = (cust.phone ?? cust.mobile ?? '')
          .toString()
          .replace(/\D/g, '')
          .slice(0, 9);

        // City: do NOT default. Only use DB value when present and not the test placeholder.
        const fetchedCity = cust.city ?? '';
        const city = fetchedCity && fetchedCity !== 'UpdatedCity' ? fetchedCity : '';

        // country: if DB has a code prefer that, else infer from browser
        const dbCountry = (cust.country_code ?? cust.country ?? '') as string;
        const countryCode =
          dbCountry && dbCountry.startsWith('+') ? dbCountry : inferCountryCodeFromLocale();

        const email = cust.email ?? '';
        const marketing_email_opt_in = cust.marketing_email_opt_in ?? false;
        const marketing_whatsapp_opt_in = cust.marketing_whatsapp_opt_in ?? false;
        const birthday = cust.special_dates?.birthday ?? cust.birthday ?? '';
        const anniversary = cust.special_dates?.anniversary ?? cust.anniversary ?? '';

        setForm(f => ({
          ...f,
          firstName: firstName || '',
          lastName: lastName || '',
          phone,
          city,
          countryCode,
          email: f.email || email || '',
          marketing_email_opt_in,
          marketing_whatsapp_opt_in,
          birthday,
          anniversary
        }));

        setIsPhoneValid((phone || '').length === 9);
      }

      return cust;
    } catch (e) {
      if (mountedRef.current) {
        console.warn(DBG, 'fetchAndFill exception', e);
        setErrorMessage('Could not load your profile details. Please try again.');
      }
      return null;
    }
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const mountedRef = { current: true };

    async function loadCustomer() {
      try {
        setAuthLoading(true);

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if (!user) {
          setAuthLoading(false);
          navigate('/', { replace: true });
          return;
        }

        // ✅ Enforce verification-first flow: if not confirmed, send to verify page
        const emailConfirmedAt = (user as any)?.email_confirmed_at;
        if (!emailConfirmedAt) {
          setAuthLoading(false);
          window.location.replace('/verify-email');
          return;
        }

        setForm(f => ({
          ...f,
          email: user.email ?? '',
          countryCode: f.countryCode || inferCountryCodeFromLocale()
        }));

await fetchAndFill(user.id, mountedRef);

// ✅ Show verification success toast ONLY once
try {
  const justVerified = sessionStorage.getItem('just_verified');

  // ✅ ONLY show if just verified AND profile NOT complete
  if (justVerified === 'true' && !signinStatus?.profile_complete) {
    setTimeout(() => {
      toast({
        title: '✓ Email verified',
        description: 'Please complete your profile',
        className: 'bg-white text-green-600 border-green-600'
      });

      sessionStorage.removeItem('just_verified');

    }, 300);
  }
} catch {}

setAuthLoading(false);
      } catch {
        setAuthLoading(false);
        setErrorMessage('Could not load profile.');
      }
    }

    loadCustomer();

    return () => {
      mountedRef.current = false;
    };
  }, [navigate]);

  // Handler when PhoneInput calls onChange with raw 9 local digits
const handlePhoneInputChange = (raw9Digits: string) => {
  const digits = (raw9Digits || '').replace(/\D/g, '').slice(0, 9);
  setForm(f => ({ ...f, phone: digits }));

  // ✅ Only validate when user has finished typing
  if (digits.length === 9) {
    setIsPhoneValid(true);
  } else {
    setIsPhoneValid(digits.length === 0);
  }
};
    // ✅ If user fixes fields after a failed attempt, hide helper automatically when valid
    // (helper is already gated by !isFormValid(), so no extra code needed)

  const isFormValid = () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cityValue = form.city && form.city.trim() ? form.city.trim() : '';
    return (
      form.firstName.trim() &&
      form.lastName.trim() &&
      form.phone.trim() &&
      cityValue &&
      form.email.trim() &&
      emailRe.test(form.email) &&
      isPhoneValid
    );
  };

  const clearPendingRegistration = () => {
    try {
      sessionStorage.removeItem(SESSION_REGISTRATION_KEY);
    } catch {}
  };

  // Cancel behaviour:
  // - If profile is empty/unsaved -> go Home and stay there (NO sign out)
  // - Otherwise -> go to customer dashboard
  const onCancel = () => {
    const isEmptyUnsaved =
      form.firstName.trim() === '' &&
      form.lastName.trim() === '' &&
      form.phone.trim() === '' &&
      form.city.trim() === '' &&
      !form.marketing_email_opt_in &&
      !form.marketing_whatsapp_opt_in &&
      (form.birthday || '').trim() === '' &&
      (form.anniversary || '').trim() === '';

    if (isEmptyUnsaved) {
      clearPendingRegistration();
      try {
        window.location.replace('/');
      } catch {
        navigate('/', { replace: true });
      }
      return;
    }
    navigate('/customer-dashboard', { replace: true });
  };

  const onSaveSubmit = async (e?: FormEvent) => {
    e?.preventDefault?.();

    if (!isFormValid()) {
      // ✅ Show helper only after attempted Save (no blocking error pop-up)
      setAttemptedSave(true);
      return;
    }

    setAttemptedSave(false);
    await handleSave();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        setSaving(false);
        setShowAuthPopup(true);
        return;
      }

      const combinedFullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

      const { error } = await supabase.rpc('update_customer_profile', {
        p_user_id: user.id,
        p_full_name: combinedFullName,
        p_first_name: form.firstName,
        p_last_name: form.lastName,
        p_mobile_number: form.phone,
        p_city: form.city.trim(),
        p_marketing_email_opt_in: form.marketing_email_opt_in,
        p_marketing_sms_opt_in: false,
        p_marketing_whatsapp_opt_in: form.marketing_whatsapp_opt_in,
        p_birthday: form.birthday || null,
        p_anniversary: form.anniversary || null
      });

      if (error) throw error;

      // Fallback: ensure both possible phone columns updated
      try {
await supabase
  .from('customers')
  .update({
    phone: form.phone || null
  })
  .eq('user_id', user.id);
      } catch (updErr) {
        console.warn(DBG, 'fallback phone update failed', updErr);
      }

      toast({ title: 'Success', description: 'Profile saved.' });

      navigate('/customer-dashboard', { replace: true });
    } catch (err: any) {
      const msg = err?.message || 'Error saving profile.';
      toast({ title: 'Save failed', description: msg });
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAuthSuccess = async () => {
    setShowAuthPopup(false);
    await handleSave();
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password changed', description: 'Your password was updated.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to change password.');
    } finally {
      setPasswordChanging(false);
    }
  };

  const footerSaveRef = useRef<(() => Promise<void> | void) | null>(null);
  const footerCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    footerSaveRef.current = onSaveSubmit;
    footerCancelRef.current = onCancel;
  }, [onSaveSubmit, onCancel]);

  // ✅ FIX: FooterButtons dispatches 'dinedeals:footer-action' with detail 'left' | 'right'
  useEffect(() => {
    const onFooterAction = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail;
        if (detail === 'left') {
          footerSaveRef.current?.();
        }
        if (detail === 'right') {
          footerCancelRef.current?.();
        }
      } catch {}
    };

    window.addEventListener('dinedeals:footer-action', onFooterAction as EventListener);

    return () => {
      window.removeEventListener('dinedeals:footer-action', onFooterAction as EventListener);
    };
  }, []);

  useEffect(() => {
    try {
      window.dispatchEvent(
        new CustomEvent('ensure-footer-fixed', { detail: { route: '/customer-profile' } })
      );
    } catch {}

    const updateFooter = () => {
      try {
        const valid = isFormValid();

        // ✅ IMPORTANT CHANGE:
        // Keep Save clickable so we can show a helper message on invalid attempts.
        // Only disable while saving.
        const disabled = saving;

        window.dispatchEvent(
          new CustomEvent('footer-update', {
            detail: {
              left: {
                text: saving ? 'Saving…' : 'Save Profile',
                disabled,
                cursor: disabled ? 'not-allowed' : 'pointer'
              },
              right: { text: 'Cancel', disabled: false }
            }
          })
        );

        // Note: we intentionally do NOT disable when invalid.
        // Validation is enforced inside onSaveSubmit, which shows the helper message.
        void valid;
      } catch {}
    };

    updateFooter();
  }, [form.firstName, form.lastName, form.phone, form.city, form.email, isPhoneValid, saving]);

if (authLoading) {
  return null;
}

  return (
    <>
      <form onSubmit={onSaveSubmit} className="p-0">
        <div
          className="p-3 sm:p-4 rounded-lg shadow-md h-[calc(100vh-96px)] overflow-y-auto pb-16 max-w-md mx-auto md:max-w-none md:mx-0 md:px-10 md:pt-6 w-full"
          style={{ backgroundColor: '#F3F4F6' }}
        >
          <Masthead
            logoSrc="https://cexezutizzchdpsspghx.supabase.co/storage/v1/object/public/assets/icon-192.png"
            headingTag="h2"
            title="My Profile"
            showNotifications={false}
            subtitle={
              <span className="text-sm text-gray-600">
                All fields marked with <span className="text-red-500">*</span> must be completed.
              </span>
            }
            titleClassName="text-2xl font-semibold mb-0"
            subtitleClassName="text-sm text-gray-600"
            containerClassName="flex items-center gap-3 mb-4 mt-2"
          />

          {errorMessage && (
            <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {errorMessage}
            </div>
          )}

          {/* ✅ NEW: helper shown only after attempted Save */}
          {attemptedSave && !isFormValid() && (
            <div className="mb-3 text-sm text-red-600 text-center">
              Required field incomplete.
            </div>
          )}

          <div className="md:grid md:grid-cols-2 md:gap-6">
            <div className="space-y-3 md:col-span-1">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="rounded-md bg-white"
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="First name"
                    required
                  />
                </div>
                <div className="flex-1">
                  <Label>
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="rounded-md bg-white"
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

              <div className="mt-1">
                <Label className="mb-0">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <div className="mt-1">
                  <PhoneInput
                    value={form.phone}
                    onChange={raw9Digits => {
                      handlePhoneInputChange(raw9Digits);
                    }}
                    placeholder="12 345 6789"
                    className="rounded-md bg-white"
                    required={true}
                  />
                </div>
              </div>

              <div className="mt-1">
                <Label>
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  className="rounded-md bg-white"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Nearest town / city"
                  required
                />
              </div>

              <div className="mt-2 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="marketing_email"
                    checked={form.marketing_email_opt_in}
                    onCheckedChange={checked =>
                      setForm(f => ({
                        ...f,
                        marketing_email_opt_in: checked === true
                      }))
                    }
                  />
                  <Label htmlFor="marketing_email" className="text-sm font-normal cursor-pointer">
                    Marketing opt-in (Email)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="marketing_whatsapp"
                    checked={form.marketing_whatsapp_opt_in}
                    onCheckedChange={checked =>
                      setForm(f => ({
                        ...f,
                        marketing_whatsapp_opt_in: checked === true
                      }))
                    }
                  />
                  <Label htmlFor="marketing_whatsapp" className="text-sm font-normal cursor-pointer">
                    Marketing opt-in (WhatsApp)
                  </Label>
                </div>
              </div>

              <div className="mt-2">
                <Label htmlFor="birthday">Birthday (Optional)</Label>
                <Input
                  id="birthday"
                  className="rounded-md bg-white"
                  type="date"
                  value={form.birthday}
                  onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))}
                />
              </div>

              <div className="mt-2">
                <Label htmlFor="anniversary">Anniversary (Optional)</Label>
                <Input
                  id="anniversary"
                  className="rounded-md bg-white"
                  type="date"
                  value={form.anniversary}
                  onChange={e => setForm(f => ({ ...f, anniversary: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4 md:mt-0 md:col-span-1">
              <div className="mt-0 md:pl-2">
                <div className="mb-3">
                  <Label>
                    {' '}
                    Email address <span className="text-red-500">*</span>
                  </Label>
                  <Input type="email" className="bg-gray-100 rounded-md" value={form.email} disabled />
                </div>

                <div className="mt-4">
                  <Label>Change password</Label>
                  <div className="mt-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="relative">
                          <Input
                            className="rounded-md pr-10 bg-white"
                            type={passwordVisibleNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="New password (min 8 characters)"
                            aria-label="New password"
                          />
                          <div
                            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                            onClick={() => setPasswordVisibleNew(!passwordVisibleNew)}
                          >
                            {passwordVisibleNew ? <EyeOff /> : <Eye />}
                          </div>
                        </div>

                        <div className="relative">
                          <Input
                            className="rounded-md pr-10 bg:white bg-white"
                            type={passwordVisibleConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            aria-label="Confirm new password"
                          />
                          <div
                            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                            onClick={() => setPasswordVisibleConfirm(!passwordVisibleConfirm)}
                          >
                            {passwordVisibleConfirm ? <EyeOff /> : <Eye />}
                          </div>
                        </div>

                        {passwordError && <div className="text-sm text-red-600">{passwordError}</div>}
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={handleChangePassword}
                          disabled={passwordChanging}
                          className="px-3 py-1.5 rounded-md border text-sm bg-green-500 text-white"
                          aria-label="Enter new password"
                        >
                          {passwordChanging ? 'Updating…' : '✓'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setNewPassword('');
                            setConfirmPassword('');
                            setPasswordError('');
                          }}
                          className="px-3 py-1.5 rounded-md border text-sm bg-gray-400 text-white"
                          aria-label="Cancel password change"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </form>

      <AuthPopup
        isOpen={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        onSuccess={handleAuthSuccess}
      />

      <FooterButtons />
    </>
  );
}

export default CustomerProfileEdit;
