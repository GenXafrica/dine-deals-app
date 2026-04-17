import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from '@/components/ui/use-toast';

export const useSubscriptionManagement = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  /**
   * Used by the Launch Promo / override toggle
   * IMPORTANT:
   * - Must NOT use Edge Functions
   * - Must NOT touch auth / signup
   * - Must be a direct RPC only
   */
  const handleSubscriptionChange = async (newPlanId: string, newPlanName: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive'
      });
      return { success: false };
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('rpc_upsert_subscription', {
        p_merchant_id: user.id,
        p_plan_id: newPlanId,
        p_status: 'active',
        p_billing_cycle: 'monthly'
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Launch promo updated successfully'
      });

      return { success: true };
    } catch (error) {
      console.error('Subscription override error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update launch promo',
        variant: 'destructive'
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Used by paid plan upgrades only
   * This remains unchanged
   */
  const upgradeSubscription = async (
    planId: string,
    tier: string,
    billingCycle: string = 'monthly'
  ) => {
    if (!user) return { success: false };

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      console.log('⏳ No active session, skipping upgrade');
      return { success: false, error: 'No active session' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('upgrade_subscription', {
        p_plan_id: planId,
        p_tier: tier,
        p_billing_cycle: billingCycle
      });

      if (error) {
        throw new Error(error.message || 'Failed to upgrade subscription');
      }

      toast({
        title: 'Success',
        description: `Upgraded to ${tier} (${billingCycle}) successfully!`
      });

      return { success: true, data };
    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: 'Error',
        description: 'Failed to upgrade subscription',
        variant: 'destructive'
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleSubscriptionChange,
    upgradeSubscription
  };
};

export default useSubscriptionManagement;
