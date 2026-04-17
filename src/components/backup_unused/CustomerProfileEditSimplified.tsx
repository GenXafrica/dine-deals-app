// Simplified CustomerProfileEdit without bundle-specific logic
import React, { useEffect, useState, FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { PhoneInput } from '@/components/PhoneInput';
import { useNavigate } from 'react-router-dom';
import { AuthPopup } from '@/components/AuthPopup';

export function CustomerProfileEditSimplified(): JSX.Element {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    city: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    let mounted = true;

    async function loadCustomer() {
      try {
        setAuthLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        setAuthLoading(false);

        if (!user) {
          navigate('/', { replace: true });
          return;
        }
        if (mounted) setForm(f => ({ ...f, email: user.email ?? '' }));

        const { data: cust, error: rpcErr } = await supabase.rpc('get_current_customer', { user_uuid: user.id }).maybeSingle();
        if (rpcErr) {
          console.warn('get_current_customer rpc error:', rpcErr);
        } else if (cust && mounted) {
          setForm(f => ({
            ...f,
            fullName: cust.full_name || '',
            phone: cust.phone || '',
            city: cust.city || '',
          }));
          validatePhone(cust.phone || '');
        }
      } catch (e) {
        console.error('loadCustomer error:', e);
        if (mounted) setErrorMessage('Could not load profile.');
      }
    }

    loadCustomer();
    return () => { mounted = false; };
  }, [navigate]);

  const validatePhone = (v: string) => {
    const digits = (v || '').toString().replace(/\D/g, '');
    const ok = digits.length >= 9 && digits.length <= 13;
    setIsPhoneValid(ok);
    setForm(f => ({ ...f, phone: digits }));
    return ok;
  };

  const handlePhoneChange = (v: string) => {
    validatePhone(v);
  };

  const isFormValid = () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      form.fullName.trim() &&
      form.phone.trim() &&
      form.city.trim() &&
      form.email.trim() &&
      emailRe.test(form.email) &&
      isPhoneValid
    );
  };

  const onCancel = () => {
    if (authLoading) return;
    navigate('/', { replace: true });
  };

  const onSaveSubmit = async (e?: FormEvent) => {
    if (e && typeof (e as FormEvent).preventDefault === 'function') {
      (e as FormEvent).preventDefault();
    }

    if (!isFormValid()) {
      setErrorMessage('Please complete all required fields correctly.');
      return;
    }

    await handleSave();
  };

  const handleSave = async () => {
    setErrorMessage('');

    if (!navigator.onLine) {
      setErrorMessage('You are offline. Please check your internet connection.');
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      
      if (!user) {
        setSaving(false);
        setShowAuthPopup(true);
        return;
      }

      const { data, error } = await supabase.rpc('update_customer_profile', {
        p_full_name: form.fullName,
        p_mobile_number: form.phone,
        p_city: form.city,
      });

      if (error) {
        console.error('Profile save error:', error);
        const msg = error.message || 'Save failed — please try again.';
        toast({ title: 'Save failed', description: msg });
        setErrorMessage(msg);
        setSaving(false);
        return;
      }

      console.log('Profile saved successfully');
      toast({ title: 'Success', description: 'Profile saved.' });

      // Simple navigation - no complex fallback logic
      navigate('/customer-dashboard', { replace: true });

    } catch (err: any) {
      console.error('Unexpected error saving profile:', err);
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

  return (
    <>
      <form onSubmit={onSaveSubmit} className="p-0">
        <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto">
          <h2 className="text-2xl font-semibold mb-4">Complete Your Profile</h2>
          <p className="text-sm text-gray-600 mb-4">Please complete your profile below.</p>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errorMessage}
            </div>
          )}

          <Label>Full Name <span className="text-red-500">*</span></Label>
          <Input
            value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
            placeholder="Your full name"
            required
          />

          <div className="mt-4">
            <PhoneInput
              value={form.phone}
              onChange={handlePhoneChange}
              placeholder="12 345 6789"
              required
            />
          </div>

          <Label className="mt-4">City <span className="text-red-500">*</span></Label>
          <Input
            value={form.city}
            onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
            placeholder="City"
            required
          />

          <Label className="mt-4">Email address <span className="text-red-500">*</span></Label>
          <Input
            type="email"
            value={form.email}
            disabled
            className="bg-gray-100"
          />

          <Label className="mt-4">Password <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-2 p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              type="submit"
              disabled={saving || !isFormValid()}
              className="flex-1"
            >
              {saving ? 'Saving…' : 'Save Profile'}
            </Button>
            <Button
              variant="destructive"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>

      <AuthPopup
        isOpen={showAuthPopup}
        onClose={() => setShowAuthPopup(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}

export default CustomerProfileEditSimplified;