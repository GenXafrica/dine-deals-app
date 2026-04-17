import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Customer } from '@/types';
import { toast } from '@/components/ui/use-toast';

type Props = {
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (updated: Customer) => void;
};

export const EditCustomerDialog: React.FC<Props> = ({ customer, open, onClose, onSaved }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setFullName(customer.full_name || '');
      setEmail(customer.email || '');
      setMobileNumber(customer.mobile_number || '');
      setAddress(customer.address || '');
      setCity(customer.city || '');
      setPostalCode(customer.postal_code || '');
    }
  }, [customer, open]);

  const validatePhoneNumber = (phone: string) => {
    if (!phone || phone === '') return true;
    if (!phone.startsWith('+')) return false;
    const digits = phone.substring(1);
    if (!/^\d+$/.test(digits)) return false;
    if (digits.length < 10) return false;
    return true;
  };

  const handleSave = async () => {
    if (!customer) return;
    if (!fullName || fullName.trim() === '') {
      toast({ title: 'Validation', description: 'Full name is required.', variant: 'destructive' });
      return;
    }
    if (mobileNumber && !validatePhoneNumber(mobileNumber)) {
      toast({ title: 'Validation', description: 'Phone must be in international format (e.g., +27815551234).', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 RPC_UPDATE_CUSTOMER - Calling RPC', {
        function: 'update_customer_profile',
        parameters: {
          p_customer_id: customer.id,
          p_full_name: fullName.trim(),
          p_email: email,
          p_phone: mobileNumber || null,
          p_address: address || null,
          p_city: city || null,
          p_postal_code: postalCode || null
        }
      });

      const { data, error } = await supabase.rpc('update_customer_profile', {
        p_customer_id: customer.id,
        p_full_name: fullName.trim(),
        p_email: email || null,
        p_phone: mobileNumber || null,
        p_address: address || null,
        p_city: city || null,
        p_postal_code: postalCode || null
      });

      // rpc may return single row or array
      const updated = Array.isArray(data) ? data[0] : data;

      console.log('📊 RPC_UPDATE_CUSTOMER - Result', {
        function: 'update_customer_profile',
        success: !error,
        hasData: !!updated,
        error: error?.message,
        code: error?.code
      });

      if (error) {
        // handle errors (forbidden / not_found etc.)
        const message = error.message || 'Failed to update profile.';
        toast({ title: 'Error', description: message, variant: 'destructive' });
        throw error;
      }

      toast({ title: 'Saved', description: 'Profile updated.' });
      if (onSaved && updated) onSaved(updated as Customer);
      onClose();
    } catch (err: any) {
      console.error('❌ RPC_UPDATE_CUSTOMER - Error', err);
      const message = err?.message || 'Failed to update profile. Please try again.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Edit profile</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Phone (international)</label>
            <input
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="+27815551234"
              className="mt-1 block w-full rounded-md border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 block w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 block w-full rounded-md border px-3 py-2"
              />
            </div>

            <div style={{ width: 140 }}>
              <label className="block text-sm font-medium">Postal code</label>
              <input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="mt-1 block w-full rounded-md border px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 border"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-md px-4 py-2 bg-blue-600 text-white"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCustomerDialog;
