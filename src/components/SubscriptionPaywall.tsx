// src/components/SubscriptionPaywall.tsx

import React, { useEffect, useState } from 'react';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useSubscription } from '@/hooks/useSubscription';
import SubscriptionUpgradeDialog from '@/components/SubscriptionUpgradeDialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface SubscriptionPaywallProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const SubscriptionPaywall: React.FC<SubscriptionPaywallProps> = ({
  isOpen,
  onClose,
}) => {
  const { plans } = useSubscriptionPlans();
  const { subscription, refetch } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();

  const [showUpgradeDialog, setShowUpgradeDialog] = useState(
    typeof isOpen === 'undefined' ? true : Boolean(isOpen)
  );

  useEffect(() => {
    if (typeof isOpen !== 'undefined') {
      setShowUpgradeDialog(Boolean(isOpen));
    }
  }, [isOpen]);

  const loadPaystackScript = () => {
    return new Promise<void>((resolve) => {
      if (window.PaystackPop) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  };

  const handlePaystackPayment = async (
    planSlug: string,
    _amount: number,
    billingCycle: 'monthly' | 'annual'
  ) => {
    if (!user?.email) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }

    try {
      const plan = plans.find((p) => p.slug === planSlug);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      const currentTier = subscription?.tier?.toLowerCase();
      const selectedTier = planSlug.toLowerCase();

      const tierRank: Record<string, number> = {
        starter: 1,
        main: 2,
        chef: 3,
      };

      let mode: 'new_subscription' | 'upgrade' | 'downgrade_schedule' = 'new_subscription';

      if (currentTier && tierRank[currentTier] && tierRank[selectedTier]) {
        if (tierRank[selectedTier] > tierRank[currentTier]) {
          mode = 'upgrade';
        } else if (tierRank[selectedTier] < tierRank[currentTier]) {
          mode = 'downgrade_schedule';
        }
      }

      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('id, name')
        .eq('slug', planSlug)
        .maybeSingle();

      if (planError || !planData?.id) {
        throw new Error('Subscription plan not found');
      }

      const { data, error } = await supabase.functions.invoke(
        'create-paystack-transaction',
        {
          body: {
            plan_id: planData.id,
            billing_cycle: billingCycle,
            mode,
            origin: window.location.origin,
          },
        }
      );

      if (error) {
        throw error;
      }

      const action = data?.action;

      const isNoPaymentResponse =
        action === 'downgrade_scheduled' ||
        action === 'downgrade_cancelled' ||
        action === 'downgrade_already_scheduled' ||
        action === 'no_change' ||
        action === 'upgrade_no_charge' ||
        data?.downgrade_scheduled === true ||
        data?.downgrade_cancelled === true;

      if (isNoPaymentResponse) {
        if (action === 'downgrade_scheduled') {
          toast({
            title: 'Downgrade Scheduled',
            description: 'Your plan will change at the end of the current billing period.',
          });
        } else if (action === 'downgrade_cancelled') {
          toast({
            title: 'Downgrade Cancelled',
            description: 'Your current plan will remain active.',
          });
        } else if (action === 'downgrade_already_scheduled') {
          toast({
            title: 'Downgrade Already Scheduled',
            description: 'A downgrade is already scheduled for the end of your billing period.',
          });
        } else if (action === 'no_change') {
          toast({
            title: 'No Change',
            description: 'This plan is already active.',
          });
        } else if (action === 'upgrade_no_charge') {
          toast({
            title: 'Plan Updated',
            description: data?.message || 'Your subscription was updated successfully.',
          });
        }

        await refetch?.();

        setShowUpgradeDialog(false);
        onClose?.();
        return;
      }

      if (!data?.reference || data?.amount == null) {
        throw new Error('Invalid payment response');
      }

      setShowUpgradeDialog(false);
      onClose?.();

      await loadPaystackScript();

      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: Number(data.amount),
        ref: data.reference,
        currency: 'ZAR',

        callback: function () {
          handler.close();
          window.location.href = '/merchant-dashboard?payment=success';
        },

        onClose: function () {
          toast({
            title: 'Payment Cancelled',
            description: 'You closed the payment window.',
          });
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error('Payment init error:', error);
      toast({
        title: 'Payment Error',
        description: 'Unable to start payment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <SubscriptionUpgradeDialog
      open={showUpgradeDialog}
      onOpenChange={(nextOpen) => {
        setShowUpgradeDialog(nextOpen);
        if (!nextOpen) onClose?.();
      }}
      subscription={subscription}
      onRefetchSubscription={refetch}
      onSelectPlan={handlePaystackPayment}
    />
  );
};

export default SubscriptionPaywall;