import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Merchant } from '@/types';

export const useDatabaseUtils = () => {
  const [loading, setLoading] = useState(false);

  const validatePhoneNumber = (phone: string) => {
    if (!phone || phone === '') return true;
    if (!phone.startsWith('+')) return false;
    const digits = phone.substring(1);
    if (!/^\d+$/.test(digits)) return false;
    if (digits.length < 10) return false;
    return true;
  };

  const updateCustomer = async (id: string, updates: Partial<User>) => {
    setLoading(true);
    try {
      if (updates.fullName !== undefined && (!updates.fullName || updates.fullName.trim() === '')) {
        throw new Error('Full name is required and cannot be empty');
      }
      
      if (updates.mobileNumber && !validatePhoneNumber(updates.mobileNumber)) {
        throw new Error('Phone number must be in international format (e.g., +27815551234)');
      }
      
      // prepare RPC params (nulls mean "no change")
      const params: any = {
        p_customer_id: id,
        p_full_name: updates.fullName !== undefined ? updates.fullName.trim() : null,
        p_email: updates.email !== undefined ? updates.email : null,
        p_phone: updates.mobileNumber !== undefined ? updates.mobileNumber : null,
        p_address: updates.address !== undefined ? updates.address : null,
        p_city: updates.city !== undefined ? updates.city : null,
        p_postal_code: updates.postalCode !== undefined ? updates.postalCode : null
      };

      console.log('🔍 RPC_UPDATE_CUSTOMER - Calling RPC', { function: 'update_customer_profile', params });

      const { data, error } = await supabase.rpc('update_customer_profile', params);

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
        console.error('Database error (RPC):', error);
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!updated) {
        throw new Error('No data returned from update');
      }
      
      return updated;
    } catch (error: any) {
      console.error('Update customer error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateMerchant = async (id: string, updates: any) => {
    setLoading(true);
    try {
      if (updates.ownerName !== undefined && (!updates.ownerName || updates.ownerName.trim() === '')) {
        throw new Error('Owner name is required and cannot be empty');
      }
      if (updates.restaurantName !== undefined && (!updates.restaurantName || updates.restaurantName.trim() === '')) {
        throw new Error('Restaurant name is required and cannot be empty');
      }
      
      if (updates.phone && !validatePhoneNumber(updates.phone)) {
        throw new Error('Phone number must be in international format (e.g., +27815551234)');
      }
      
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.ownerName !== undefined) updateData.owner_name = updates.ownerName.trim();
      if (updates.restaurantName !== undefined) {
        updateData.restaurant_name = updates.restaurantName.trim();
        updateData.name = updates.restaurantName.trim();
      }
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.category !== undefined) {
        updateData.cuisine_type = updates.category;
      }
      if (updates.website !== undefined) updateData.website = updates.website;
      if (updates.logo !== undefined) {
        updateData.logo = updates.logo;
        updateData.logo_url = updates.logo;
      }

      const { data, error } = await supabase
        .from('merchants')
        .update(updateData)
        .eq('id', id)
        .select('*')
        // changed single -> maybeSingle to avoid PGRST116
        .maybeSingle();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return data;
    } catch (error: any) {
      console.error('Update merchant error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const findCustomerByEmail = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*') // Explicitly select all columns including address
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('Error finding customer:', error);
        return null;
      }
      return data;
    } catch (error: any) {
      console.error('findCustomerByEmail error:', error);
      return null;
    }
  };

  const findMerchantByEmail = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('Error finding merchant:', error);
        return null;
      }
      return data;
    } catch (error: any) {
      console.error('findMerchantByEmail error:', error);
      return null;
    }
  };

  return {
    loading,
    updateCustomer,
    updateMerchant,
    findCustomerByEmail,
    findMerchantByEmail
  };
};
