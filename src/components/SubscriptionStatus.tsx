import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Star, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDateZA } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionStatusProps {
  onUpgrade?: () => void;
}

export const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ onUpgrade }) => {
  const [merchantData, setMerchantData] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [pendingPlanName, setPendingPlanName] = useState<string | null>(null);
  const [promoPlanName, setPromoPlanName] = useState<string | null>(null);
  const [dealLimit, setDealLimit] = useState<number | null>(null);
  const [cancellingDowngrade, setCancellingDowngrade] = useState(false);

  const { toast } = useToast();

  const init = useCallback(async () => {
    const { data: merchant } = await supabase.rpc('get_current_merchant');
    if (!merchant) {
      setMerchantData(null);
      setSubscription(null);
      setPlanName(null);
      setPendingPlanName(null);
      setPromoPlanName(null);
      setDealLimit(null);
      return;
    }

    const merchantRow = Array.isArray(merchant) ? merchant[0] : merchant;
    if (!merchantRow?.id) {
      setMerchantData(null);
      setSubscription(null);
      setPlanName(null);
      setPendingPlanName(null);
      setPromoPlanName(null);
      setDealLimit(null);
      return;
    }

    const { data: merchantLive } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', merchantRow.id)
      .maybeSingle();

    const resolvedMerchant = merchantLive ?? merchantRow;
    setMerchantData(resolvedMerchant);

    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('merchant_id', merchantRow.id)
      .eq('status', 'active')
      .limit(1);

    const sub = subs?.[0] ?? null;
    setSubscription(sub);

    const currentPlanId = sub?.plan_id ?? sub?.subscription_plan_id ?? null;

    if (currentPlanId) {
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('name')
        .eq('id', currentPlanId)
        .maybeSingle();

      setPlanName(plan?.name ?? null);
    } else {
      setPlanName(null);
    }

    if (resolvedMerchant?.promo_plan_id) {
      const { data: promoPlan } = await supabase
        .from('subscription_plans')
        .select('name')
        .eq('id', resolvedMerchant.promo_plan_id)
        .maybeSingle();

      setPromoPlanName(promoPlan?.name ?? null);
    } else {
      setPromoPlanName(null);
    }

    if (sub?.pending_plan_id) {
      const { data: pendingPlan } = await supabase
        .from('subscription_plans')
        .select('name')
        .eq('id', sub.pending_plan_id)
        .maybeSingle();

      setPendingPlanName(pendingPlan?.name ?? null);
    } else {
      setPendingPlanName(null);
    }

    const { data: limit } = await supabase.rpc('get_effective_deal_limit', {
      p_merchant_id: merchantRow.id,
    });

    setDealLimit(typeof limit === 'number' ? limit : 0);
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    let isMounted = true;
    let merchantChannel: ReturnType<typeof supabase.channel> | null = null;
    let subscriptionChannel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const { data: merchant } = await supabase.rpc('get_current_merchant');
      if (!isMounted || !merchant) return;

      const merchantRow = Array.isArray(merchant) ? merchant[0] : merchant;
      if (!merchantRow?.id) return;

      merchantChannel = supabase
        .channel(`subscription-status-merchants-${merchantRow.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'merchants',
            filter: `id=eq.${merchantRow.id}`,
          },
          async () => {
            await init();
          }
        )
        .subscribe();

      subscriptionChannel = supabase
        .channel(`subscription-status-subscriptions-${merchantRow.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subscriptions',
            filter: `merchant_id=eq.${merchantRow.id}`,
          },
          async () => {
            await init();
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      isMounted = false;
      if (merchantChannel) {
        supabase.removeChannel(merchantChannel);
      }
      if (subscriptionChannel) {
        supabase.removeChannel(subscriptionChannel);
      }
    };
  }, [init]);

  const handleCancelScheduledDowngrade = async () => {
    if (!subscription?.plan_id || !subscription?.billing_cycle) return;

    setCancellingDowngrade(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke(
        'create-paystack-transaction',
        {
          headers: {
            Authorization: `Bearer ${sessionData?.session?.access_token}`
          },
          body: {
            plan_id: subscription.plan_id,
            billing_cycle: subscription.billing_cycle
          }
        }
      );

      if (error) {
        toast({
          title: 'Cancel failed',
          description: error.message || 'Unable to cancel scheduled change',
          variant: 'destructive'
        });
        return;
      }

      if (data?.downgrade_cancelled || data?.action === 'no_change') {
        toast({
          title: 'Scheduled change cancelled',
          description: 'Your current plan will remain active.'
        });
        await init();
        return;
      }

      toast({
        title: 'Cancel failed',
        description: 'Unexpected server response.',
        variant: 'destructive'
      });
    } catch (err: any) {
      toast({
        title: 'Cancel failed',
        description: err?.message || 'Unable to cancel scheduled change',
        variant: 'destructive'
      });
    } finally {
      setCancellingDowngrade(false);
    }
  };

  if (!merchantData || dealLimit === null) return null;

  const isPromo =
    merchantData?.promo_enabled === true &&
    merchantData?.promo_used_at !== null &&
    merchantData?.promo_expires_at !== null;
  const planLabel = isPromo
    ? `${promoPlanName || planName || 'Promo'} Promo`
    : (planName || 'No active plan');

  const billingCycleLabel = subscription?.billing_cycle === 'annual'
    ? 'Annual'
    : subscription?.billing_cycle === 'monthly'
      ? 'Monthly'
      : null;

  const pendingBillingCycleLabel = subscription?.pending_billing_cycle === 'annual'
    ? 'Annual'
    : subscription?.pending_billing_cycle === 'monthly'
      ? 'Monthly'
      : null;

  const hasPendingPlanChange =
    !!subscription?.pending_plan_id ||
    subscription?.pending_change_type === 'cancellation' ||
    !!subscription?.pending_billing_cycle;

  const showPendingChange =
    !!subscription?.pending_switch_date &&
    hasPendingPlanChange;

  const isPendingCancellation =
    showPendingChange && subscription?.pending_change_type === 'cancellation';

  const isBillingCycleOnlyChange =
    showPendingChange &&
    !isPendingCancellation &&
    !subscription?.pending_plan_id &&
    !!subscription?.pending_billing_cycle;

  const showPromoExpiry =
    isPromo &&
    !!merchantData?.promo_expires_at;

  const getTierIcon = () => {
    if (isPromo) return <Star className="h-5 w-5 text-amber-500" />;
    if (!subscription) return <Lock className="h-5 w-5 text-gray-500" />;
    if (dealLimit === 5) return <Crown className="h-5 w-5 text-purple-500" />;
    if (dealLimit === 3) return <Star className="h-5 w-5 text-blue-500" />;
    return <Lock className="h-5 w-5 text-gray-500" />;
  };

  return (
    <Card className="bg-[#F3F4F6]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-start justify-between">
          <span className="flex items-center">
            {getTierIcon()}
            <span className="ml-2">Subscription</span>
          </span>

          <div className="flex flex-col items-center text-center">
            <Badge
              className={
                isPromo
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 text-sm font-bold'
                  : 'bg-gray-100 text-gray-800 text-sm font-bold'
              }
            >
              {planLabel}
            </Badge>

            {!isPromo && billingCycleLabel && (
              <span className="mt-1 text-xs font-normal text-gray-600 text-center w-full">
                {billingCycleLabel}
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 text-center">
        <p className="text-sm text-gray-600">
          Deal Allowance:{' '}
          <span className="font-semibold text-gray-900">{dealLimit}</span>
        </p>

        {showPromoExpiry && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
            <p className="text-sm text-amber-900 font-medium">
              Promo active
            </p>
            <p className="text-sm text-amber-800">
              Your promo ends on{' '}
              <span className="font-semibold">
                {formatDateZA(merchantData.promo_expires_at)}
              </span>
              .
            </p>
          </div>
        )}

        {showPendingChange && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 space-y-3">
            <div>
              <p className="text-sm text-amber-900 font-medium">
                {isPendingCancellation
                  ? 'Cancellation scheduled'
                  : 'Downgrade scheduled'}
              </p>
              <p className="text-sm text-amber-800">
                {isPendingCancellation ? (
                  <>
                    Your plan will change to an{' '}
                    <span className="font-semibold">inactive Starter</span> on{' '}
                    <span className="font-semibold">
                      {formatDateZA(subscription.pending_switch_date)}
                    </span>
                    .
                  </>
                ) : isBillingCycleOnlyChange ? (
                  <>
                    Your plan will change to{' '}
                    <span className="font-semibold">
                      {pendingBillingCycleLabel || 'the selected billing cycle'}
                    </span>{' '}
                    billing on{' '}
                    <span className="font-semibold">
                      {formatDateZA(subscription.pending_switch_date)}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Your plan will change to{' '}
                    <span className="font-semibold">
                      {pendingPlanName || 'the selected plan'}
                    </span>{' '}
                    {pendingBillingCycleLabel ? (
                      <>
                        on{' '}
                        <span className="font-semibold">
                          {pendingBillingCycleLabel}
                        </span>{' '}
                        billing{' '}
                      </>
                    ) : (
                      'on '
                    )}
                    <span className="font-semibold">
                      {formatDateZA(subscription.pending_switch_date)}
                    </span>
                    .
                  </>
                )}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleCancelScheduledDowngrade}
              disabled={cancellingDowngrade}
            >
              {cancellingDowngrade ? 'Cancelling...' : 'Cancel scheduled change'}
            </Button>
          </div>
        )}

        <div className="pt-2">
          <Button onClick={onUpgrade} size="sm" className="w-full">
            Manage subscription
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatus;
