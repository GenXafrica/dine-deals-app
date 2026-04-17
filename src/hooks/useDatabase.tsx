import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Merchant, Deal } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { useDatabaseUtils } from './useDatabaseUtils';

export const useDatabase = () => {
  const [loading, setLoading] = useState(false);
  const utils = useDatabaseUtils();

  const validatePhoneNumber = (phone: string) => {
    if (!phone || phone === '') return true;
    if (!phone.startsWith('+')) return false;
    const digits = phone.substring(1);
    if (!/^\d+$/.test(digits)) return false;
    if (digits.length < 10) return false;
    return true;
  };

  const saveCustomer = async (userData: Omit<User, 'id' | 'createdAt'>) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      if (!userData.fullName || userData.fullName.trim() === '') {
        throw new Error('Full name is required and cannot be empty');
      }
      
      if (userData.mobileNumber && !validatePhoneNumber(userData.mobileNumber)) {
        throw new Error('Phone number must be in international format (e.g., +27815551234)');
      }
      
      console.log('🔍 RPC_CREATE_CUSTOMER - Calling RPC', {
        function: 'create_customer_profile',
        parameters: {
          p_full_name: userData.fullName.trim(),
          p_email: userData.email,
          p_phone: userData.mobileNumber || '',
          p_address: null,
          p_city: null,
          p_postal_code: null
        }
      });
      
      const { data, error } = await supabase.rpc('create_customer_profile', {
        p_full_name: userData.fullName.trim(),
        p_email: userData.email,
        p_phone: userData.mobileNumber || '',
        p_address: null,
        p_city: null,
        p_postal_code: null
      });

      // normalize returned data (rpc may return single row or array)
      const createdCustomer = Array.isArray(data) ? data[0] : data;

      console.log('📊 RPC_CREATE_CUSTOMER - Result', {
        function: 'create_customer_profile',
        success: !error,
        hasData: !!createdCustomer,
        error: error?.message,
        code: error?.code
      });

      if (error) {
        // handle unique constraint / duplicate user case: fallback to fetch existing customer
        if (error.code === '23505') {
          console.log('⚠️ RPC_CREATE_CUSTOMER - Duplicate, fetching existing', {
            table: 'customers',
            parameters: { user_id: user.id }
          });
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', user.id)
            // keep maybeSingle to avoid thrown errors from PostgREST
            .maybeSingle();

          return existingCustomer;
        }
        throw error;
      }
      
      console.log('✅ RPC_CREATE_CUSTOMER - Success', {
        function: 'create_customer_profile',
        customerId: createdCustomer?.id
      });
      
      return createdCustomer;
    } catch (error: any) {
      console.error('❌ RPC_CREATE_CUSTOMER - Error', error);
      const message = (error?.message || '').includes('full_name') ? 
        'Full name is required and cannot be empty' : 
        (error?.message || '').includes('Phone number') ?
        error.message :
        'Failed to create customer profile. Please try again.';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const saveMerchant = async (merchantData: Omit<Merchant, 'id' | 'createdAt'>) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Error', description: 'Please log in first.', variant: 'destructive' });
        throw new Error('User not authenticated');
      }
      
      if (!merchantData.ownerName || merchantData.ownerName.trim() === '') {
        throw new Error('Owner name is required and cannot be empty');
      }
      if (!merchantData.restaurantName || merchantData.restaurantName.trim() === '') {
        throw new Error('Restaurant name is required and cannot be empty');
      }
      
      if (merchantData.phone && !validatePhoneNumber(merchantData.phone)) {
        throw new Error('Phone number must be in international format (e.g., +27815551234)');
      }
      
      console.log('🔍 RPC_CREATE_MERCHANT - Calling RPC', {
        function: 'rpc_create_merchant',
        parameters: {
          p_name: merchantData.restaurantName.trim(),
          p_email: merchantData.email,
          p_phone_number: merchantData.phone || '',
          p_city: 'Not specified',
          p_street_address: 'Not specified'
        }
      });
      
      const { data: merchantRecord, error: merchantError } = await supabase.rpc('rpc_create_merchant', {
        p_name: merchantData.restaurantName.trim(),
        p_email: merchantData.email,
        p_phone_number: merchantData.phone || '',
        p_city: 'Not specified',
        p_street_address: 'Not specified'
      });

      console.log('📊 RPC_CREATE_MERCHANT - Result', {
        function: 'rpc_create_merchant',
        success: !merchantError,
        hasData: !!merchantRecord,
        error: merchantError?.message,
        code: merchantError?.code
      });

      if (merchantError) {
        toast({ title: 'Error', description: 'Merchant creation failed. Please try again.', variant: 'destructive' });
        throw merchantError;
      }
      
      // Store merchant_id in localStorage for plan selection
      if (merchantRecord) {
        localStorage.setItem('merchant_id', merchantRecord.toString());
      }
      
      console.log('✅ RPC_CREATE_MERCHANT - Success', {
        function: 'rpc_create_merchant',
        merchantId: merchantRecord
      });
      
      return { id: merchantRecord, ...merchantData };
    } catch (error: any) {
      console.error('❌ RPC_CREATE_MERCHANT - Error', error);
      throw new Error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading: loading || utils.loading,
    saveCustomer,
    saveMerchant,
    updateCustomer: utils.updateCustomer,
    findCustomerByEmail: utils.findCustomerByEmail,
    findMerchantByEmail: utils.findMerchantByEmail
  };
};
