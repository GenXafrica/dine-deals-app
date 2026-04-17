import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export const useSupabaseDebugger = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { user } = useAuth();

  const debugCustomersQuery = async () => {
    if (!user?.id) return;

    try {
      console.log('🔧 SUPABASE DEBUG - Client Configuration:', {
        url: supabase.supabaseUrl,
        key: supabase.supabaseKey?.substring(0, 20) + '...',
        schema: 'public',
        headers: supabase.rest.headers
      });

      // Test basic connection
      const { data: testData, error: testError } = await supabase
        .from('customers')
        .select('count(*)', { count: 'exact' });

      console.log('🔧 SUPABASE DEBUG - Connection Test:', {
        testData,
        testError,
        status: testError ? 'FAILED' : 'SUCCESS'
      });

      // Test specific query
      const selectString = '*';
      console.log('🔧 SUPABASE DEBUG - Query Details:', {
        table: 'customers',
        selectString: selectString,
        filterColumn: 'user_id',
        filterValue: user.id,
        method: 'maybeSingle()'
      });

      const { data, error } = await supabase
        .from('customers')
        .select(selectString)
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('🔧 SUPABASE DEBUG - Query Result:', {
        data,
        error,
        httpStatus: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint
      });

      setDebugInfo({
        clientConfig: {
          url: supabase.supabaseUrl,
          hasKey: !!supabase.supabaseKey,
          schema: 'public'
        },
        connectionTest: {
          success: !testError,
          error: testError
        },
        queryTest: {
          selectString,
          data,
          error,
          success: !error
        }
      });

    } catch (err) {
      console.error('🔧 SUPABASE DEBUG - Exception:', err);
      setDebugInfo({
        exception: err,
        message: 'Debug failed with exception'
      });
    }
  };

  useEffect(() => {
    debugCustomersQuery();
  }, [user?.id]);

  return {
    debugInfo,
    debugCustomersQuery
  };
};