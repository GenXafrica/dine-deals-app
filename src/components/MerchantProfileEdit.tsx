// VERSION: AGREEMENT-GUARD-TEST
import React, { useEffect, useRef, useState, FormEvent, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { PhoneInput } from '@/components/PhoneInput';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthPopup } from '@/components/AuthPopup';
import { loadGoogleMaps } from '@/lib/googleMapsLoader';
import Masthead from '@/components/Masthead';
import { Eye, EyeOff } from 'lucide-react';
import { useRoleBasedRouting } from '@/hooks/useRoleBasedRouting';
import FooterButtons from '@/components/FooterButtons';

type FormState = {
  firstName: string;
  lastName: string;
  roleType: 'owner' | 'manager' | '';
  restaurantName: string;
  phone: string; // digits-only full international number (e.g. 27611234567, 447911123456)
  whatsapp: string; // digits-only full international number (e.g. 27611234567, 447911123456)
  city: string;
  address: string;
  googleAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category: string;
  email: string;
  webAddress: string;
  logoUrl: string;
  parking: boolean;
  reservations: boolean;
  wifi: boolean;
};

const cleanLogoValue = (v: any): string => {
  const t = String(v ?? '').trim();
  if (!t) return '';
  if (!/^https?:\/\//i.test(t)) return '';
  if (/undefined|null/i.test(t)) return '';

  const lower = t.toLowerCase();

  // Only block the logo placeholder image
  if (lower.includes('placeholder')) return '';

  return t;
};

const PROVINCE_OPTIONS = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape'
];

function MerchantProfileEdit(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { redirectByRole } = useRoleBasedRouting();

  // Deal terms agreement (optional until accepted)
  const [dealTermsAccepted, setDealTermsAccepted] = useState(false);

  // Allow explicit user actions (Save / Cancel) to route even if post-login redirect guards were set
  const clearPostLoginRedirectGuards = () => {
    try {
      sessionStorage.removeItem('skipProfileRedirectOnce');
    } catch {}
    try {
      (window as any).__dinedeals_skip_postlogin_redirect = false;
    } catch {}
  };

  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    roleType: '',
    restaurantName: '',
    phone: '',
    whatsapp: '',
    city: '',
    address: '',
    googleAddress: null,
    latitude: null,
    longitude: null,
    category: '',
    email: '',
    webAddress: '',
    logoUrl: '',
    parking: false,
    reservations: false,
    wifi: false
  });

  const [merchant, setMerchant] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const [mapsReady, setMapsReady] = useState(false);
  const [showLogoHelp, setShowLogoHelp] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Track whether the current address was selected from Google Places dropdown
  const [isGoogleConfirmed, setIsGoogleConfirmed] = useState(false);

  // Helper message: only show after a Save attempt when Save is blocked
  const [saveBlockedMessage, setSaveBlockedMessage] = useState('');
  const saveBlockedTimerRef = useRef<number | null>(null);

  const clearSaveBlockedMessage = () => {
    setSaveBlockedMessage('');
    if (saveBlockedTimerRef.current) {
      window.clearTimeout(saveBlockedTimerRef.current);
      saveBlockedTimerRef.current = null;
    }
  };

  const triggerSaveBlockedMessage = (msg: string) => {
    setSaveBlockedMessage(msg);
    if (saveBlockedTimerRef.current) {
      window.clearTimeout(saveBlockedTimerRef.current);
      saveBlockedTimerRef.current = null;
    }
    saveBlockedTimerRef.current = window.setTimeout(() => {
      setSaveBlockedMessage('');
      saveBlockedTimerRef.current = null;
    }, 3500);
  };

  // Password block
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordVisibleNew, setPasswordVisibleNew] = useState(false);
  const [passwordVisibleConfirm, setPasswordVisibleConfirm] = useState(false);

  const addressRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  const isLeavingRef = useRef(false);

  // Only show logo after it loads successfully
  const [logoDisplayUrl, setLogoDisplayUrl] = useState('');
  const [logoReady, setLogoReady] = useState(false);

  // FooterButtons wiring (final):
  // - Save Profile: submit the real form (keeps validation + disabled state)
  // - Cancel: let Supabase decide destination via redirectByRole
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

const handleCancel = useCallback(async () => {
  if (authLoading) return;

  isLeavingRef.current = true;
  clearPostLoginRedirectGuards();

  try {
    const { data: merchantData } = await supabase.rpc('get_current_merchant').maybeSingle();

    if (!merchantData?.profile_complete) {
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
      return;
    }

    navigate('/merchant-dashboard', { replace: true });

  } catch {
    navigate('/login', { replace: true });
  }
}, [authLoading, navigate]);

  // Phone handler: now receives digits-only full international number
  const handlePhoneChange = (v: string) => {
    const cleaned = (v || '').replace(/\D/g, '');
    setForm(f => ({ ...f, phone: cleaned }));
    setIsPhoneValid(cleaned.length >= 6 && cleaned.length <= 15);
  };

const isFormValid = () => {
  const emailOk = /^\S+@\S+\.\S+$/.test(form.email || '');

  const phoneDigits = (form.phone || '').replace(/\D/g, '');
  const phoneValid =
    phoneDigits.length >= 6 &&
    phoneDigits.length <= 15 &&
    isPhoneValid;

  const logoOk = !!cleanLogoValue(form.logoUrl);

  return (
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.roleType &&
    form.restaurantName.trim() &&
    form.city.trim() &&
    form.address.trim() &&
    form.category.trim() &&
    phoneValid &&
    emailOk &&
    logoOk
  );
};


  // Keep Save disabled (grey) until required fields are valid
  const saveDisabled =
    !isFormValid() || saving || uploading || (form.address.trim() && !isGoogleConfirmed);

  useEffect(() => {
    // If user fixes the form (or an error appears), remove the helper message
    if (!saveDisabled || saving || !!errorMessage) {
      clearSaveBlockedMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveDisabled, saving, errorMessage]);

  useEffect(() => {
    const onFooterAction = async (ev: Event) => {
  console.log('FOOTER EVENT:', (ev as CustomEvent).detail);
      try {
        const side = (ev as CustomEvent).detail;

        if (side === 'left') {
          // If Save is blocked, show helper message ONLY when user tries to Save
          if (saveDisabled && !saving && !errorMessage) {
            if (form.address.trim() && !isGoogleConfirmed) {
              triggerSaveBlockedMessage('Select your address from the Google dropdown.');
            } else {
              triggerSaveBlockedMessage('Required field incomplete.');
            }
            return;
          }

          const formEl = document.getElementById('merchant-profile-form') as HTMLFormElement | null;
          formEl?.requestSubmit();
          return;
        }

        if (side === 'right') {
          await handleCancel();
          return;
        }
      } catch {}
    };

    window.addEventListener('dinedeals:footer-action', onFooterAction as EventListener);

    return () => {
      window.removeEventListener('dinedeals:footer-action', onFooterAction as EventListener);
    };
  }, [handleCancel, saveDisabled, saving, errorMessage, form.address, isGoogleConfirmed]);

  // Initial auth + merchant hydrate:
  // - Stop blocking render once auth is confirmed
  // - Hydrate the form when merchant data arrives
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setAuthLoading(true);

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (!session?.user) {
          setAuthLoading(false);
          navigate('/login', { replace: true });
          return;
        }

        // Auth confirmed — allow the page to render immediately (merchant data can load after)
        if (mounted) setAuthLoading(false);

        // ✅ Show verification success toast ONLY once (same as customer)
try {
  const justVerified = sessionStorage.getItem('just_verified');

  if (justVerified === 'true' && merchantData?.profile_complete !== true) {
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

        const userEmail = session.user.email ?? '';
        if (mounted && userEmail) {
          setForm(f => ({ ...f, email: userEmail }));
        }

        const { data: merchantData, error } = await supabase.rpc('get_current_merchant').maybeSingle();
// Only redirect during login flow, not when user explicitly opens profile
const fromDashboard = location.state?.fromDashboard === true;

// ❌ Only redirect on FIRST login, never during normal navigation
if (
  !isLeavingRef.current &&
  merchantData?.profile_complete === true &&
  !fromDashboard
) {
  clearPostLoginRedirectGuards();
  navigate('/merchant-dashboard', { replace: true });
  return;
}
        if (error || !merchantData) return;

        const merchant: any = merchantData;
        setMerchant(merchantData);
        setDealTermsAccepted(Boolean(merchant.deal_terms_accepted));

        const loadedPhone = (merchant.phone || '').toString().replace(/\D/g, '');
        const loadedWhatsapp = (merchant.whatsapp_number || '').toString().replace(/\D/g, '');

        let roleType: 'owner' | 'manager' | '' = '';
        if (merchant.isowner === true) roleType = 'owner';
        else if (merchant.ismanager === true) roleType = 'manager';

        const rawLogo = merchant.logo || merchant.logo_url || '';
const loadedLogoUrl = cleanLogoValue(rawLogo);

        const hasValidCoords =
          typeof merchant.latitude === 'number' &&
          typeof merchant.longitude === 'number' &&
          merchant.latitude !== 0 &&
          merchant.longitude !== 0;

        if (mounted && hasValidCoords) {
          setIsGoogleConfirmed(true);
        }

        if (mounted) {
          setForm(f => ({
            ...f,
            firstName: merchant.first_name || '',
            lastName: merchant.last_name || '',
            roleType,
            restaurantName: merchant.name || merchant.restaurant_name || '',
            phone: loadedPhone,
            whatsapp: loadedWhatsapp,
            city: merchant.city || '',
            province: merchant.province || '',
            agentCode: merchant.agent_code_used || '',
            address: merchant.address || '',
            googleAddress: merchant.google_address ?? null,
            latitude: merchant.latitude ?? null,
            longitude: merchant.longitude ?? null,
            category: merchant.category || '',
            // ✅ FIX: use merchants.website (fallback kept for older payloads)
            webAddress: merchant.website || merchant.web_address || '',
            logoUrl: loadedLogoUrl,
            parking: Boolean(merchant.parking),
            reservations: Boolean(merchant.reservations),
            wifi: Boolean(merchant.wifi)
          }));

          // Light validity: at least 6 digits, at most 15 digits (E.164)
          if (loadedPhone) {
            setIsPhoneValid(loadedPhone.length >= 6 && loadedPhone.length <= 15);
          } else {
            setIsPhoneValid(false);
          }
        }
      } catch {
        // Never block render indefinitely
        if (mounted) setAuthLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  // Load Google Maps (non-blocking)
  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const g = (window as any).google;
    const input = addressRef.current;
    if (!mapsReady || !g?.maps?.places || !input) return;
    if (autocompleteRef.current) return;

    try {
      const ac = new g.maps.places.Autocomplete(input, {
        types: ['establishment', 'geocode'],
        fields: ['formatted_address', 'address_components', 'geometry'],
        location: new g.maps.LatLng(form.latitude ?? 0, form.longitude ?? 0),
        radius: 50000
      });
      autocompleteRef.current = ac;

      ac.addListener('place_changed', () => {
        try {
          const place = ac.getPlace();
          if (place?.formatted_address) {
            // Set isGoogleConfirmed = true when a Google address is selected
            setIsGoogleConfirmed(true);
            setForm(f => ({
              ...f,
              address: place.formatted_address,
              googleAddress: place.formatted_address,
              latitude: place?.geometry?.location ? place.geometry.location.lat() : f.latitude,
              longitude: place?.geometry?.location ? place.geometry.location.lng() : f.longitude
            }));
          }
        } catch {}
      });
    } catch {}
  }, [mapsReady, authLoading, form.latitude, form.longitude]);

  useEffect(() => {
    let cancelled = false;

    const url = cleanLogoValue(form.logoUrl);

    setLogoReady(false);
    setLogoDisplayUrl('');

    if (!url) return;

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setLogoDisplayUrl(url);
      setLogoReady(true);
    };
    img.onerror = () => {
      if (cancelled) return;
      setLogoReady(false);
      setLogoDisplayUrl('');
      setForm(f => ({ ...f, logoUrl: '' }));
    };
    img.src = url;

    return () => {
      cancelled = true;
    };
  }, [form.logoUrl]);

  const isEmptyUnsavedProfile = () => {
    return (
      (form.firstName || '').trim() === '' &&
      (form.lastName || '').trim() === '' &&
      (form.roleType || '').trim() === '' &&
      (form.restaurantName || '').trim() === '' &&
      (form.phone || '').trim() === '' &&
      (form.city || '').trim() === '' &&
      (form.address || '').trim() === '' &&
      (form.category || '').trim() === '' &&
      (form.webAddress || '').trim() === '' &&
      (form.logoUrl || '').trim() === '' &&
      !form.parking &&
      !form.reservations &&
      !form.wifi
    );
  };

  const handleLogoFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        toast({ title: 'Invalid file', description: 'Only JPG or PNG allowed.', variant: 'destructive' });
        return;
      }

      const MAX_BYTES = 100 * 1024;
      if (file.size > MAX_BYTES) {
        toast({ title: 'File too large', description: 'Maximum size 100 KB.', variant: 'destructive' });
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          const w = img.width,
            h = img.height;
          URL.revokeObjectURL(objectUrl);
          if (w !== h) return reject(new Error('Logo must be square.'));
          if (w > 512 || h > 512) return reject(new Error('Logo must be max 512×512 pixels.'));
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Invalid image file.'));
        };
      });

      setUploading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) throw new Error('Not authenticated.');

      const bucket = 'merchant-images';
      const ext = file.type === 'image/png' ? 'png' : 'jpg';
      const timestamp = Date.now();
      const path = `logos/merchant_${user.id}_${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        cacheControl: '3600'
      });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
      const url = cleanLogoValue(publicData?.publicUrl || '');
      setForm(f => ({ ...f, logoUrl: url }));
      toast({ title: 'Logo uploaded', description: 'Your logo was uploaded successfully.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setUploading(false);
      try {
        (event.target as HTMLInputElement).value = '';
      } catch {}
    }
  };

  const handleWebAddressBlur = () => {
    const v = (form.webAddress || '').trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) setForm(f => ({ ...f, webAddress: `https://${v}` }));
  };

  const handleSave = async (e?: FormEvent) => {
    try {
      e?.preventDefault();
    } catch {}

    // Validate BEFORE setting saving
if (!isFormValid()) {
  setValidationMessage('Required fields incomplete.');
  return;
}

if (form.address.trim() && !isGoogleConfirmed) {
  setValidationMessage('Select your address from the Google dropdown.');
  return;
}


    if (!navigator.onLine) {
      setErrorMessage('You are offline. Please check your connection.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    clearSaveBlockedMessage();

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        setShowAuthPopup(true);
        return;
      }

      const firstName = form.firstName.trim() || null;
      const lastName = form.lastName.trim() || null;
      const restaurantName = form.restaurantName.trim() || null;
      const address = form.address.trim() || null;
      const city = form.city.trim() || null;
      const province = form.province.trim() || null;
      const agentCode = form.agentCode.trim().toUpperCase() || null;
      const category = form.category.trim() || null;

      const isowner = form.roleType === 'owner';
      const ismanager = form.roleType === 'manager';

      const ownerName = [firstName, lastName].filter(Boolean).join(' ') || null;

      let webAddress = form.webAddress.trim() || null;
      if (webAddress && !/^https?:\/\//i.test(webAddress)) {
        webAddress = `https://${webAddress}`;
      }

      // digits-only full international number, no "+"
      const normalizedPhone = (form.phone || '').replace(/\D/g, '') || null;

      const logoToSave = cleanLogoValue(form.logoUrl) || null;

      const { error } = await supabase.rpc('save_merchant_profile_final', {
        _owner_name: ownerName,
        _restaurant_name: restaurantName,
        _phone: normalizedPhone,
        _city: city,
        _address: address,
        _category: category,
        _web_address: webAddress,
        _logo_url: logoToSave,
        _google_address: form.googleAddress || null,
        _latitude: form.latitude ?? null,
        _longitude: form.longitude ?? null
      });

      if (error) {
        toast({
          title: 'Save failed',
          description: error.message || 'Unable to save your profile.',
          variant: 'destructive'
        });
        return;
      }

      // Keep UI in sync with DB after save
      setForm(f => ({
        ...f,
        restaurantName: restaurantName || f.restaurantName
      }));

      // Secondary update must NEVER break a successful save
      try {
        const normalizedWhatsapp = (form.whatsapp || '').replace(/\D/g, '') || null;

        const shouldAcceptDealTerms = !merchant?.deal_terms_accepted && dealTermsAccepted;

        // ✅ FIX: also persist website into public.merchants.website
        const { error: updateError } = await supabase
          .from('merchants')
          .update({
            first_name: firstName,
            last_name: lastName,
            isowner,
            ismanager,
            logo: logoToSave,
            whatsapp_number: normalizedWhatsapp,
            website: webAddress,
            province,
            ...(shouldAcceptDealTerms ? { deal_terms_accepted: true } : {})
          })
          .eq('user_id', user.id);

        if (!updateError && shouldAcceptDealTerms) {
          setDealTermsAccepted(true);
          setMerchant((prev: any) => (prev ? { ...prev, deal_terms_accepted: true } : prev));
        }

        if (shouldAcceptDealTerms) {
          try {
            setMerchant((prev: any) => (prev ? { ...prev, deal_terms_accepted: true } : prev));
          } catch {}
        }

        if (updateError) {
          toast({
            title: 'Saved, but check some fields',
            description: updateError.message || 'Some profile fields may not have updated.',
            variant: 'destructive'
          });
        }
      } catch {
        // Non-blocking
      }

      // Agent assignment must NEVER block a successful profile save
      if (agentCode) {
        try {
          const { data: savedMerchant } = await supabase
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (savedMerchant?.id) {
            await supabase.rpc('apply_agent_code_to_merchant', {
              p_merchant_id: savedMerchant.id,
              p_agent_code: agentCode
            });
          }
        } catch {
          // Silent fail by design: invalid or mismatched agent codes must not show an error
        }
      }

      toast({
        title: 'Profile saved',
        description: 'Your merchant profile has been updated.'
      });

      // Give the toast a moment to render before route change unmounts this screen
      await new Promise(resolve => setTimeout(resolve, 300));

      // Navigate after successful save (explicit user action)
      const { data: refreshed } = await supabase
        .from('merchants')
        .select('profile_complete')
        .eq('user_id', user.id)
        .maybeSingle();

      clearPostLoginRedirectGuards();

      if (refreshed?.profile_complete === true) {
        navigate('/merchant-dashboard', { replace: true });
      }
    } catch (err: any) {
      toast({
        title: 'Save failed',
        description: err?.message || 'Unexpected error saving profile.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAuthSuccess = async () => {
    setShowAuthPopup(false);
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) {
      setErrorMessage('Authentication failed.');
      return;
    }
    setSaving(true);
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

  useEffect(() => {
    if (isLeavingRef.current) return;
    try {
      const disabled = saving || uploading;

      // IMPORTANT: keep cursor as pointer (desktop), but still "disabled" visually via FooterButtons logic
      window.dispatchEvent(
        new CustomEvent('footer-update', {
          detail: {
            left: {
              text: saving ? 'Saving…' : 'Save Profile',
              disabled,
              cursor: 'pointer'
            },
            right: { text: 'Cancel', disabled: false }
          }
        })
      );
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, isPhoneValid, saving, uploading, isGoogleConfirmed]);

  if (authLoading) return <div>Loading…</div>;

  const pathname = (location?.pathname || '').toLowerCase();
  const showFixedBar = pathname.includes('/profile') || pathname.endsWith('profile');

  const showLogoImage = logoReady && !!logoDisplayUrl;

  return (
    <>
      <form id="merchant-profile-form" onSubmit={handleSave} className="p-0">
        <div
          className="p-4 sm:p-6 rounded-lg shadow-md h-[calc(100vh-96px)] overflow-y-auto pb-24 pb-24 w-full max-w-6xl mx-auto md:max-w-none md:mx-0 md:rounded-none md:shadow-none"
          style={{
            paddingBottom: 'calc(0px + 0.75rem)',
            backgroundColor: '#F3F4F6'
          }}
        >
          <div className="flex items-center gap-2">
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`relative w-24 h-24 rounded-md overflow-hidden flex items-center justify-center ${
                  showLogoImage ? '' : 'border-2 border-dashed border-gray-300 bg-gray-50'
                }`}
                aria-label="Upload logo"
              >
                {!showLogoImage && (
                  <>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setShowLogoHelp(true);
                      }}
                      aria-label="Logo requirements"
                      title="Logo requirements"
                      className="absolute right-1 top-1 w-5 h-5 rounded-full flex items-center justify-center text-xs bg-blue-600 text-white border border-blue-600 z-20"
                    >
                      i
                    </button>
                    <div className="flex flex-col items-center justify-center text-xs text-gray-500 pointer-events-none">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="mb-0"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <path d="M12 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path
                          d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="text-[10px] flex items-center gap-1 [&>span:last-child]:text-sm">
                        <span>Logo</span>
                        <span className="text-red-600">*</span>
                      </div>
                    </div>
                  </>
                )}

                {showLogoImage && (
                  <>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setForm(f => ({ ...f, logoUrl: '' }));
                      }}
                      aria-label="Remove logo"
                      className="absolute right-1 top-1 w-5 h-5 rounded-full flex items-center justify-center text-xs bg-white/95 border text-gray-600 z-20"
                    >
                      ×
                    </button>
                    <img src={logoDisplayUrl} alt="Logo preview" className="w-full h-full object-cover" />
                  </>
                )}
              </div>

              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handleLogoFile} className="hidden" />
            </div>

            <div className="flex-1">
              <Masthead
                title="My Profile"
                showNotifications={false}
                containerClassName="p-0"
                showLogoUploader={false}
                logoSrc={undefined}
                logoClassName="w-14 h-14 object-cover rounded-md"
                forMerchantProfile
              />
              <div className="text-sm text-gray-600 mt-1">
                All fields marked with <span className="text-red-600">*</span> must be completed.
              </div>
            </div>
          </div>

          <div className="mt-3">
            {errorMessage && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{errorMessage}</div>}
{validationMessage && !errorMessage && (
  <div className="mb-3 text-sm text-red-600">
    {validationMessage}
  </div>
)}

{!errorMessage && !saving && !!saveBlockedMessage && (
  <div className="mb-3 text-sm text-red-600">
    {saveBlockedMessage}
  </div>
)}


<div className="flex flex-col md:flex-row gap-4 mt-3">
  <div className="w-full md:w-[38%]">
    <Label className="mb-1">
      Owner / Manager Name <span className="text-red-600 ml-1">*</span>
    </Label>
    <Input
      value={form.firstName}
      onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
      placeholder="First Name"
      required
      className="w-full bg-white"
    />
  </div>

  <div className="w-full md:w-[38%]">
    <Label className="mb-1">&nbsp;</Label>
    <Input
      value={form.lastName}
      onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
      placeholder="Last Name"
      required
      className="w-full bg-white"
    />
  </div>

  <div className="w-full md:w-[24%]">
    <Label className="mb-1">
      Role <span className="text-red-600 ml-1">*</span>
    </Label>
    <select
      value={form.roleType}
      onChange={e => setForm(f => ({ ...f, roleType: e.target.value as 'owner' | 'manager' | '' }))}
      required
      className="w-full border rounded p-2 bg-white h-10"
    >
      <option value="">Select role</option>
      <option value="owner">Owner</option>
      <option value="manager">Manager</option>
    </select>
  </div>
</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="space-y-4">
                <div>
                  <Label className="mb-1">
                    Restaurant Name <span className="text-red-600 ml-1">*</span>
                  </Label>
                  <Input
                    id="merchant-restaurant-name"
                    name="merchant-restaurant-name"
                    autoComplete="organization"
                    value={form.restaurantName}
                    onChange={e => setForm(f => ({ ...f, restaurantName: e.target.value }))}
                    onFocus={() => {
                      setForm(f => {
                        const current = (f.restaurantName || '').trim();
                        const email = (f.email || '').trim();
                        const looksLikeEmail = !!current && /^\S+@\S+\.\S+$/.test(current);

                        if ((email && current.toLowerCase() === email.toLowerCase()) || looksLikeEmail) {
                          return { ...f, restaurantName: '' };
                        }
                        return f;
                      });
                    }}
                    placeholder="Restaurant, coffee shop or fast-food name"
                    required
                    className="w-full bg-white"
                  />
                </div>

                <div>
                  <Label className="mb-1">
                    Category <span className="text-red-600 ml-1">*</span>
                  </Label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    required
                    className="w-full border rounded p-2 bg-white"
                  >
                    <option value="">Select category</option>
                    <option>American</option>
                    <option>Chinese</option>
                    <option>Coffee Shop</option>
                    <option>Fast Food</option>
                    <option>Greek</option>
                    <option>Indian</option>
                    <option>International</option>
                    <option>Italian</option>
                    <option>Japanese</option>
                    <option>Mediterranean</option>
                    <option>Mexican</option>
                    <option>Portuguese</option>
                    <option>Seafood</option>
                    <option>Steakhouse</option>
                    <option>Thai</option>
                    <option>Vegetarian</option>
                  </select>
                </div>

                <div>
                  <Label className="mb-1">
                    Phone Number <span className="text-red-600 ml-1">*</span>
                  </Label>
                  <PhoneInput value={form.phone} onChange={handlePhoneChange} includeCountryCode className="w-full bg-white" />
                </div>

                <div>
                  <Label className="mb-1">WhatsApp Number</Label>
                  <PhoneInput
                    value={form.whatsapp}
                    onChange={(v: string) => setForm(f => ({ ...f, whatsapp: (v || '').replace(/\D/g, '') }))}
                    includeCountryCode
                    className="w-full bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-1">
                      City <span className="text-red-600 ml-1">*</span>
                    </Label>
                    <Input
                      value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="Nearest town / city"
                      required
                      className="w-full bg-white"
                    />
                  </div>

                  <div>
                    <Label className="mb-1">Province (optional)</Label>
                    <select
                      value={form.province}
                      onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
                      className="w-full border rounded p-2 bg-white h-10"
                    >
                      <option value="">Select province</option>
                      {PROVINCE_OPTIONS.map(province => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="mb-1">Agent Code (optional)</Label>
                    <Input
                      value={form.agentCode}
                      onChange={e => setForm(f => ({ ...f, agentCode: e.target.value.toUpperCase() }))}
                      placeholder="Only enter if provided by your province partner"
                      className="w-full bg-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-1">
                    Street Address <span className="text-red-600 ml-1">*</span>
                  </Label>
                  <Input
                    ref={addressRef as any}
                    value={form.address}
                    onChange={e => {
                      const value = e.target.value;
                      // Set isGoogleConfirmed = false when user manually types (address no longer Google-confirmed)
                      setIsGoogleConfirmed(false);
                      setForm(f => ({
                        ...f,
                        address: value,
                        googleAddress: value || null
                        // IMPORTANT: do NOT clear latitude / longitude here
                      }));
                    }}
                    placeholder="Start typing your address..."
                    autoComplete="off"
                    required
                    className="w-full bg-white"
                  />
                  {/* Deal Terms Confirmation */}
                  <div className="mt-4">
                    <label className="flex items-start gap-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={dealTermsAccepted}
                        onChange={e => {
                          if (!merchant?.deal_terms_accepted) {
                            setDealTermsAccepted(e.target.checked);
                          }
                        }}
                        disabled={merchant?.deal_terms_accepted === true}
                        className={`mt-1 h-4 w-4 accent-blue-600 ${merchant?.deal_terms_accepted ? 'opacity-100 cursor-not-allowed' : ''}`}
                      />

                      <span>I confirm that all deals I publish are accurate, clearly stated, and include all key terms and conditions.</span>
                    </label>
                    <div className="mt-1 text-sm text-blue-600 underline">
                      <a
                        href="https://cexezutizzchdpsspghx.supabase.co/storage/v1/object/public/documents/merchant-agreement.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Merchant Deal Content Agreement
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="mb-1">Website Address</Label>
                  <Input
                    value={form.webAddress}
                    onChange={e => setForm(f => ({ ...f, webAddress: e.target.value }))}
                    onBlur={handleWebAddressBlur}
                    placeholder="Website or social media address (optional)"
                    className="w-full bg-white"
                  />
                </div>

                <div>
                  <Label className="mb-1">
                    Email Address <span className="text-red-600 ml-1">*</span>
                  </Label>
                  <Input type="email" value={form.email} required className="w-full bg-gray-100" disabled />
                </div>

                <div>
                  <Label className="mb-1">Change Password</Label>
                  <div className="mt-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="relative">
                          <Input
                            className="w-full pr-10 bg-white"
                            type={passwordVisibleNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="New password (min 8 characters)"
                            aria-label="New password"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setPasswordVisibleNew(!passwordVisibleNew)}>
                            {passwordVisibleNew ? <EyeOff /> : <Eye />}
                          </div>
                        </div>

                        <div className="relative">
                          <Input
                            className="w-full pr-10 bg-white"
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

      {showAuthPopup && <AuthPopup isOpen={showAuthPopup} onClose={() => setShowAuthPopup(false)} onSuccess={handleAuthSuccess} />}

      {showLogoHelp && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center bg-black/40 pt-24">
          <div className="bg-white rounded-lg shadow-lg w-80 max-w-[90%] p-4 relative">
            <button type="button" className="absolute right-3 top-3 text-gray-500 text-sm leading-none" onClick={() => setShowLogoHelp(false)} aria-label="Close">
              ×
            </button>
            <h2 className="text-sm font-semibold mb-3">Logo requirements</h2>
            <ul className="text-xs space-y-1">
              <li>Max 512 × 512 pixels</li>
              <li>Square image</li>
              <li>JPG or PNG format</li>
              <li>Maximum file size 100KB</li>
            </ul>
          </div>
        </div>
      )}
      <FooterButtons />
    </>
  );
}

export default MerchantProfileEdit;
export { MerchantProfileEdit };
