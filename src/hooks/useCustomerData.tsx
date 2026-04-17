import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useSupabaseDebugger } from './useSupabaseDebugger';

export const useCustomerData = () => {
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { user } = useAuth();
  const { debugInfo } = useSupabaseDebugger();

  const fetchCustomer = async (retryAttempt = 0) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !user?.id) {
      console.log('[useCustomerData] No session or user, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 CUSTOMER DATA QUERY:', {
        table: 'customers',
        filterColumn: 'user_id',
        filterValue: user.id,
        retryAttempt,
        debugInfo
      });

      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('📊 CUSTOMER DATA RESULT:', {
        hasData: !!data,
        error: fetchError,
        retryAttempt
      });

      if (fetchError) {
        console.error('❌ CUSTOMER DATA ERROR:', fetchError);
        throw fetchError;
      }

      if (!data && retryAttempt < 3) {
        console.log('⚠️ NO CUSTOMER DATA - RETRYING:', { retryAttempt });
        const delay = Math.pow(2, retryAttempt) * 1000;
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchCustomer(retryAttempt + 1);
        }, delay);
        return;
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
        console.log('[useCustomerData] Auth state change:', event);
        fetchCustomer();
      }
    });
    return () => { authSub?.subscription?.unsubscribe(); };
  }, [user?.id, retryCount]);

  const refetch = () => { setRetryCount(prev => prev + 1); };
  return { customer, loading, error, refetch };
};
