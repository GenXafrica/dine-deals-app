import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export const useCustomerDataEnhanced = () => {
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { user } = useAuth();

  const fetchCustomer = async (retryAttempt = 0) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !user?.id) {
      console.log('[useCustomerDataEnhanced] No session or user, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔐 AUTH SESSION STATE:', {
        hasSession: !!session,
        userId: session?.user?.id,
        accessToken: session?.access_token ? 'present' : 'missing',
      });

      const selectFields = [
        'id', 'user_id', 'full_name', 'email', 'phone', 'mobile_number',
        'address', 'city', 'postal_code', 'date_of_birth', 'preferences',
        'email_verified', 'created_at', 'updated_at', 'google_address', 'google_place_id'
      ];
      const selectString = selectFields.join(', ');

      console.log('🔍 CUSTOMER QUERY:', {
        table: 'customers',
        selectString,
        userId: user.id,
        retryAttempt
      });

      const { data, error: fetchError } = await supabase
        .from('customers')
        .select(selectString)
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('📊 CUSTOMER RESULT:', {
        hasData: !!data,
        error: fetchError,
        retryAttempt
      });

      if (fetchError) {
        console.error('❌ CUSTOMER ERROR:', fetchError);
        throw fetchError;
      }

      setCustomer(data);
    } catch (err: any) {
      console.error('❌ CUSTOMER FETCH ERROR:', err);
      setError(err.message);
      if (retryAttempt < 3) {
        const delay = Math.pow(2, retryAttempt) * 1000;
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchCustomer(retryAttempt + 1);
        }, delay);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('[useCustomerDataEnhanced] Auth state change:', event);
        fetchCustomer();
      }
    });
    return () => { authSub?.subscription?.unsubscribe(); };
  }, [user?.id, retryCount]);

  const refetch = () => { setRetryCount(prev => prev + 1); };
  return { customer, loading, error, refetch };
};
