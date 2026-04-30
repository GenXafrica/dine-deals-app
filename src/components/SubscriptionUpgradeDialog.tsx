import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Utensils, ChefHat, Salad } from 'lucide-react';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface SubscriptionUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPlan: (
    planSlug: string,
    amount: number,
    billingCycle: 'monthly' | 'annual'
  ) => void;
  subscription?: any;
  onRefetchSubscription?: () => Promise<void> | void;
}

type PendingPlanType = 'upgrade' | 'downgrade' | 'new';

export const SubscriptionUpgradeDialog: React.FC<SubscriptionUpgradeDialogProps> =
  ({
    open,
    onOpenChange,
    onSelectPlan,
    subscription: parentSubscription,
    onRefetchSubscription,
  }) => {
    const { plans, activePromoPlan } = useSubscriptionPlans();
    const { subscription: hookSubscription, refetch } = useSubscription();
    const { toast } = useToast();

    const subscription = parentSubscription ?? hookSubscription;
    const refreshSubscription = onRefetchSubscription ?? refetch;

    const [billingCycle, setBillingCycle] =
      useState<'monthly' | 'annual'>('monthly');
    const hasInitializedCycleRef = useRef(false);

    const [selectedPlanSlug, setSelectedPlanSlug] = useState<string | null>(null);
    const [showPlanConfirm, setShowPlanConfirm] = useState(false);

    const [pendingPlan, setPendingPlan] = useState<{
      slug: string;
      amount: number;
      displayAmount?: number;
      billingCycle: 'monthly' | 'annual';
      type: PendingPlanType;
      isPromo?: boolean;
      promoDurationDays?: number | null;
    } | null>(null);
    const [merchantPromoActive, setMerchantPromoActive] = useState(false);

    const tier =
      (subscription as any)?.tier ||
      (subscription as any)?.plan_slug ||
      (subscription as any)?.plan ||
      '';

    const normalizePlanSlug = (value: string) => {
      const normalized = String(value || '').toLowerCase().trim();

      if (
        normalized === 'main course' ||
        normalized === 'main-course' ||
        normalized === 'maincourse'
      ) {
        return 'main';
      }

      if (
        normalized === "chef's table" ||
        normalized === 'chefs table' ||
        normalized === 'chef-table' ||
        normalized === 'cheftable'
      ) {
        return 'chef';
      }

      if (
        normalized === 'starter course' ||
        normalized === 'starter-course' ||
        normalized === 'startercourse'
      ) {
        return 'starter';
      }

      return normalized;
    };

    const normalizedTier = normalizePlanSlug(tier);
    const normalizedBillingCycle = String(
      (subscription as any)?.billing_cycle || ''
    ).toLowerCase().trim();

    useEffect(() => {
      if (!open) {
        hasInitializedCycleRef.current = false;
        return;
      }

      const loadDialogState = async () => {
        refreshSubscription?.();

        setSelectedPlanSlug(null);

        if (!hasInitializedCycleRef.current) {
          if (
            normalizedBillingCycle === 'monthly' ||
            normalizedBillingCycle === 'annual'
          ) {
            setBillingCycle(normalizedBillingCycle);
          }

          hasInitializedCycleRef.current = true;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
          setMerchantPromoActive(false);
          return;
        }

        const { data: merchantData } = await supabase
          .from('merchants')
          .select('promo_enabled, promo_used_at, promo_expires_at')
          .eq('user_id', user.id)
          .maybeSingle();

        const promoActive =
          merchantData?.promo_enabled === true &&
          merchantData?.promo_used_at !== null &&
          merchantData?.promo_expires_at !== null &&
          new Date(merchantData.promo_expires_at) > new Date();

        setMerchantPromoActive(promoActive);
      };

      loadDialogState();
    }, [open, normalizedBillingCycle, refreshSubscription]);

    const isPaidUser = subscription?.status === 'active';
    const effectiveMerchantPromoActive = !isPaidUser && merchantPromoActive;

    const isCurrentPlanAndCycle = (plan: any) => {
      const slugMatches = plan.slug === normalizedTier;
      const cycleMatches = billingCycle === normalizedBillingCycle;
      const promoPlanMatches = effectiveMerchantPromoActive && slugMatches;
      const activeWithoutCycle =
        subscription?.status === 'active' &&
        !normalizedBillingCycle &&
        slugMatches;

      return (slugMatches && cycleMatches) || promoPlanMatches || activeWithoutCycle;
    };

    const showPromoUi =
      !isPaidUser &&
      billingCycle === 'monthly' &&
      !!activePromoPlan &&
      Number(activePromoPlan.promo_duration_days || 0) > 0;
    const showPromoActivationBanner =
      showPromoUi && !effectiveMerchantPromoActive;

    const formatZAR = (amount: number) => {
      if (!amount || amount === 0) return 'Free';
      return `R${amount.toLocaleString('en-ZA')}`;
    };

    const isPromoPlan = (plan: any) =>
      showPromoUi && !!activePromoPlan && activePromoPlan.slug === plan.slug;

    const isPromoAlreadyActive = (plan: any) =>
      effectiveMerchantPromoActive && isPromoPlan(plan);

    const getPromoDurationText = (plan: any) => {
      const days = Number(plan?.promo_duration_days || 0);
      if (!days) return '';
      return `Free for ${days} days`;
    };

    const getPlanAmountForCycle = (
      plan: any,
      cycle: 'monthly' | 'annual'
    ) => {
      if (!plan) return 0;

      if (plan.slug === 'starter') return 75;

      return cycle === 'annual'
        ? Number(plan.yearly_price || 0)
        : Number(plan.monthly_price || 0);
    };

    const calculateProratedUpgradeDisplayAmount = (
      selectedPlan: any,
      selectedAmount: number,
      changeType: PendingPlanType
    ) => {
      if (changeType !== 'upgrade') return selectedAmount;
      if (normalizedBillingCycle !== billingCycle) return selectedAmount;

      const paidUntilValue = (subscription as any)?.paid_until;
      const currentPlan = plans.find(plan => plan.slug === normalizedTier);

      if (!paidUntilValue || !currentPlan) return selectedAmount;

      const paidUntil = new Date(paidUntilValue).getTime();
      const now = Date.now();

      if (!Number.isFinite(paidUntil) || paidUntil <= now) return selectedAmount;

      const cycleLengthMs =
        billingCycle === 'annual'
          ? 365 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

      const remainingRatio = Math.min(
        Math.max((paidUntil - now) / cycleLengthMs, 0),
        1
      );
      const currentAmount = getPlanAmountForCycle(currentPlan, billingCycle);
      const priceDifference = selectedAmount - currentAmount;

      if (priceDifference <= 0) return selectedAmount;

      return Math.round(priceDifference * remainingRatio * 100) / 100;
    };

    const orderedPlans = [...plans].sort((a, b) => {
      const aIsPromo = isPromoPlan(a) ? 1 : 0;
      const bIsPromo = isPromoPlan(b) ? 1 : 0;

      if (aIsPromo !== bIsPromo) {
        return bIsPromo - aIsPromo;
      }

      return (a.display_order || 0) - (b.display_order || 0);
    });

    const visiblePlans =
      billingCycle === 'annual'
        ? orderedPlans.filter(p => p.slug !== 'starter')
        : orderedPlans;

    const startPayment = (plan: any) => {
      if (isCurrentPlanAndCycle(plan) || isPromoAlreadyActive(plan)) {
        return;
      }

      try {
        const planIsPromo = isPromoPlan(plan);
        const amount = planIsPromo
          ? 0
          : plan.slug === 'starter'
          ? 75
          : billingCycle === 'annual'
          ? plan.yearly_price
          : plan.monthly_price;

        const currentTier = String((subscription as any)?.tier ?? normalizedTier)
          .toLowerCase()
          .trim();

        const selectedSlug = plan.slug;

        const planRank: Record<string, number> = {
          starter: 0,
          main: 1,
          chef: 2,
        };

        const currentRank = planRank[currentTier] ?? 0;
        const selectedRank = planRank[selectedSlug] ?? 0;

        const isDowngrade = selectedRank < currentRank;
        const isUpgrade = selectedRank > currentRank;

        let type: PendingPlanType;

        if (selectedSlug === 'starter') {
          if (subscription?.status === 'active') {
            type = 'downgrade';
          } else {
            type = 'new';
          }
        } else {
          type = isDowngrade
            ? 'downgrade'
            : isUpgrade
            ? 'upgrade'
            : 'upgrade';
        }

        const displayAmount = calculateProratedUpgradeDisplayAmount(
          plan,
          amount,
          type
        );

        setPendingPlan({
          slug: selectedSlug,
          amount,
          displayAmount,
          billingCycle,
          type,
          isPromo: planIsPromo,
          promoDurationDays: plan?.promo_duration_days ?? null,
        });

        setShowPlanConfirm(true);
      } catch {
        toast({
          title: 'Error',
          description: 'Unable to start payment',
          variant: 'destructive',
        });
      }
    };

    const confirmPlanChange = async () => {
      if (!pendingPlan) return;

      setShowPlanConfirm(false);

      try {
        if (pendingPlan.isPromo) {
          const { data: merchantData } = await supabase
        .from("merchants")
        .select("id")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();

      if (!merchantData?.id) {
        throw new Error("Merchant not found");
      }

      const { error } = await supabase.rpc("start_promo_for_merchant", {
        p_merchant_id: merchantData.id,
      });

      if (error) {
        throw error;
      }

      await refreshSubscription?.();

      onOpenChange(false);
          return;
        }

        if (pendingPlan.type === 'downgrade') {
          const { data: sessionData } = await supabase.auth.getSession();

          if (!sessionData?.session) {
            toast({
              title: 'Sign in required',
              description: 'Please sign in and try again.',
              variant: 'destructive',
            });
            return;
          }

          const { data: selectedPlan, error: selectedPlanError } = await supabase
            .from('subscription_plans')
            .select('id')
            .eq('slug', pendingPlan.slug)
            .maybeSingle();

          if (selectedPlanError || !selectedPlan?.id) {
            throw new Error('Selected plan not found');
          }

          const { error } = await supabase.functions.invoke(
            'create-paystack-transaction',
            {
              body: {
                plan_id: selectedPlan.id,
                billing_cycle: pendingPlan.billingCycle,
                mode: 'downgrade_schedule',
              },
            }
          );

          if (error) throw error;

          toast({
            title: 'Downgrade scheduled',
            description:
              'Your plan will downgrade at the end of your billing period.',
            duration: 5000,
          });

          await refreshSubscription?.();
          onOpenChange(false);
          return;
        }

        onSelectPlan(
          pendingPlan.slug,
          pendingPlan.amount,
          pendingPlan.billingCycle
        );
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err?.message || 'Unable to process plan change',
          variant: 'destructive',
        });
      }
    };

    const handleCancelPaidSubscription = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData?.session) {
          toast({
            title: 'Sign in required',
            description: 'Please sign in and try again.',
            variant: 'destructive',
          });
          return;
        }

        const { data: starterPlan, error: starterPlanError } = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('slug', 'starter')
          .maybeSingle();

        if (starterPlanError || !starterPlan?.id) {
          throw new Error('Starter plan not found');
        }

        const currentCycle =
          normalizedBillingCycle === 'annual' ? 'annual' : 'monthly';

        const { error } = await supabase.functions.invoke(
          'create-paystack-transaction',
          {
            body: {
              plan_id: starterPlan.id,
              billing_cycle: currentCycle,
              mode: 'cancel_subscription',
            },
          }
        );

        if (error) throw error;

        toast({
          title: 'Cancellation scheduled',
          description:
            'Your paid subscription will cancel at the end of your billing period.',
          duration: 5000,
        });

        await refreshSubscription?.();
        onOpenChange(false);
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err?.message || 'Unable to process cancellation',
          variant: 'destructive',
        });
      }
    };

    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-6xl mx-auto flex flex-col text-base overflow-hidden md:overflow-visible">
            <DialogHeader>
              <DialogTitle>Choose Your Plan</DialogTitle>
            </DialogHeader>

            <div
              className="flex-1 pr-2 overflow-y-auto max-h-[70vh]"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {showPromoActivationBanner && (
                <div className="mb-4 rounded-xl border border-[#FBB345] bg-[#FFF8EF] px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-[#B7791F]">
                    Select the promo plan below to activate your free offer
                  </p>
                </div>
              )}

              <div className="flex justify-center mb-6">
                <div className="flex rounded-lg overflow-hidden border border-gray-200">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-2 text-sm font-semibold transition ${
                      billingCycle === 'monthly'
                        ? 'bg-[#FBB345] text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('annual')}
                    className={`px-6 py-2 text-sm font-semibold transition ${
                      billingCycle === 'annual'
                        ? 'bg-[#FBB345] text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    Annual
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 pb-2 md:flex md:flex-nowrap md:gap-4 md:justify-center md:pb-4">
                {visiblePlans.map(plan => {
                  const planIsPromo = isPromoPlan(plan);
                  const promoDurationText = getPromoDurationText(plan);

                  const price = planIsPromo
                    ? 0
                    : plan.slug === 'starter'
                    ? 75
                    : billingCycle === 'annual'
                    ? plan.yearly_price
                    : plan.monthly_price;

                  const isSelected = selectedPlanSlug === plan.slug;
                  const isPopular = plan.slug === 'main' && !planIsPromo;
                  const borderColor = planIsPromo
                    ? 'border-[#FBB345]'
                    : 'border-gray-200';
                  const bgTint = planIsPromo ? 'bg-[#FFF8EF]' : 'bg-[#FFF4E3]';

                  const customFeatures =
                    plan.slug === 'starter'
                      ? ['Add up to 1 Deal.', 'Three media files per deal.']
                      : plan.slug === 'main'
                      ? ['Add up to 3 Deals.', 'Five media files per deal.']
                      : [
                          'Add up to 5 Deals.',
                          'Seven media files per deal.',
                          'Customer deal notifications',
                        ];

                  const savings =
                    plan.slug === 'main'
                      ? 'Save 15%'
                      : plan.slug === 'chef'
                      ? 'Save 27%'
                      : null;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanSlug(plan.slug)}
                      className={`relative border rounded-xl p-5 pt-8 cursor-pointer transition-all md:min-w-[320px] md:max-w-[320px] md:flex-shrink-0 ${
                        planIsPromo
                          ? 'shadow-lg bg-[#FFF8EF]'
                          : isPopular
                          ? 'scale-[1.02] shadow-lg bg-[#FFF8EF]'
                          : ''
                      } ${
                        isSelected
                          ? `${borderColor} shadow-lg ${bgTint}`
                          : `${borderColor}`
                      }`}
                    >
                      {planIsPromo && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                          <span className="bg-[#FBB345] text-white text-sm font-semibold px-4 py-1 rounded-full shadow-sm">
                            On Promotion
                          </span>
                        </div>
                      )}

                      {!planIsPromo && isPopular && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                          <span className="bg-[#FBB345] text-white text-sm font-semibold px-4 py-1 rounded-full shadow-sm">
                            Most Popular
                          </span>
                        </div>
                      )}

                      <div className="text-center mb-4">
                        <h3 className="font-bold text-lg flex items-center justify-center gap-2">
                          {plan.slug === 'starter' && (
                            <Salad className="h-5 w-5 text-[#FBB345]" />
                          )}
                          {plan.slug === 'main' && (
                            <Utensils className="h-5 w-5 text-[#FBB345]" />
                          )}
                          {plan.slug === 'chef' && (
                            <ChefHat className="h-5 w-5 text-[#FBB345]" />
                          )}
                          {plan.name}
                        </h3>

                        {planIsPromo && promoDurationText && (
                          <div className="mt-2 text-sm font-semibold text-[#B7791F]">
                            {promoDurationText}
                          </div>
                        )}

                        <div className="text-3xl font-bold mt-2 flex items-center justify-center gap-2 text-[#E09A2D]">
                          {formatZAR(price)}
                          <span className="text-sm font-normal text-gray-500">
                            /{billingCycle === 'annual' ? 'year' : 'month'}
                          </span>

                          {!planIsPromo && billingCycle === 'annual' && savings && (
                            <span className="bg-[#E09A2D] text-white text-xs font-semibold px-2 py-1 rounded-full ml-2">
                              {savings}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-[#F4E2C2] mb-4" />

                      <ul className="space-y-3 mb-5">
                        {customFeatures.map((feature, index) => (
                          <li
                            key={index}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Check className="h-4 w-4 text-[#FBB345] shrink-0" />
                            <span>
                              {feature.includes('3 Deals') ? (
                                <>
                                  Add up to <strong>3 Deals</strong>.
                                </>
                              ) : feature.includes('5 Deals') ? (
                                <>
                                  Add up to <strong>5 Deals</strong>.
                                </>
                              ) : (
                                feature
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        disabled={
                          isCurrentPlanAndCycle(plan) || isPromoAlreadyActive(plan)
                        }
                        onClick={e => {
                          e.stopPropagation();
                          if (
                            !isCurrentPlanAndCycle(plan) &&
                            !isPromoAlreadyActive(plan)
                          ) {
                            startPayment(plan);
                          }
                        }}
                        className={`w-full py-3 shadow-md ${
                          isCurrentPlanAndCycle(plan) || isPromoAlreadyActive(plan)
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-[#FBB345] hover:bg-[#E09A2D] text-white'
                        }`}
                        variant="default"
                      >
                        {isCurrentPlanAndCycle(plan)
                          ? 'Current Plan'
                          : isPromoAlreadyActive(plan)
                          ? 'Promo Active'
                          : planIsPromo
                          ? 'Activate Free Promo'
                          : isSelected
                          ? 'Continue'
                          : 'Select Plan'}
                      </Button>

                      <div className="mt-2 text-center text-xs text-gray-500">
                        {plan.slug === 'starter'
                          ? 'Great to get started'
                          : plan.slug === 'main'
                          ? 'Expand visibility and attract more diners'
                          : 'Best for maximum visibility'}
                      </div>

                      <div className="mt-2 text-center text-xs text-gray-400">
                        Cancel anytime
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {isPaidUser && (
              <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                <button
                  type="button"
                  onClick={handleCancelPaidSubscription}
                  className="text-sm text-gray-400 hover:text-gray-600 hover:underline transition"
                >
                  Cancel paid subscription
                </button>
              </div>
            )}

          </DialogContent>
        </Dialog>

        <Dialog open={showPlanConfirm} onOpenChange={setShowPlanConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {pendingPlan?.isPromo
                  ? 'Confirm Free Promo'
                  : pendingPlan?.type === 'upgrade'
                  ? 'Confirm Upgrade'
                  : pendingPlan?.type === 'downgrade'
                  ? 'Confirm Downgrade'
                  : 'Confirm Subscription'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-sm text-gray-700">
              <p>
                You are selecting the{' '}
                <strong>
                  {pendingPlan?.slug === 'chef'
                    ? "Chef’s Table"
                    : pendingPlan?.slug === 'main'
                    ? 'Main Course'
                    : 'Starter'}
                </strong>{' '}
                plan.
              </p>

              {pendingPlan?.isPromo && pendingPlan?.promoDurationDays ? (
                <p>
                  This promo will activate free access for{' '}
                  <strong>{pendingPlan.promoDurationDays} days</strong>.
                </p>
              ) : pendingPlan?.amount > 0 ? (
                <p>
                  You will be billed{' '}
                  <strong>
                    {formatZAR(
                      pendingPlan.displayAmount ?? pendingPlan.amount
                    )}/
                    {pendingPlan.billingCycle === 'annual'
                      ? 'year'
                      : 'month'}
                  </strong>.
                </p>
              ) : null}

              {pendingPlan?.type === 'downgrade' && !pendingPlan?.isPromo && (
                <p>
                  Your current benefits remain active until the end of your
                  billing cycle.
                </p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowPlanConfirm(false)}
              >
                Cancel
              </Button>
              <Button className="w-full" onClick={confirmPlanChange}>
                {pendingPlan?.isPromo ? 'Activate Promo' : 'Confirm & Continue'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  };

export default SubscriptionUpgradeDialog;
