import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

interface Row {
  id: string;
  user_id: string;
  merchant_id: string;
  restaurant_name: string;
  plan_name: string;
  billing_cycle?: string;
  status?: string;
  created_at?: string;
  active_deals_count?: number;
  promo_enabled?: boolean;
  promo_expires_at?: string | null;
}

interface PlanOption {
  id: string;
  name: string;
  slug?: string;
  promo_enabled?: boolean;
  promo_duration_days?: number | null;
}

interface DealCountRow {
  merchant_id: string;
  count: number;
}

export default function AdminSubscriptionsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [promoEnabled, setPromoEnabled] = useState<boolean | null>(null);
  const [promoDuration, setPromoDuration] = useState<number>(90);
  const [promoPlanId, setPromoPlanId] = useState<string>('');
  const [promoLoading, setPromoLoading] = useState(false);

  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchInFlightRef = useRef(false);

  const formatDate = (iso?: string) => {
    if (!iso) return '';

    const normalized = iso
      .replace(' ', 'T')
      .replace(/\.(\d{3})\d+/, '.$1')
      .replace(/([+-]\d{2})$/, '$1:00');

    const d = new Date(normalized);

    if (Number.isNaN(d.getTime())) return '';

    return `${String(d.getDate()).padStart(2, '0')}/${String(
      d.getMonth() + 1
    ).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const fetchData = async () => {
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      setLoading(false);
      fetchInFlightRef.current = false;
      return;
    }

    setLoading(true);

    try {
      const { data: merchants, error: merchantsError } = await supabase
        .from('merchants')
        .select('id, user_id, name, promo_enabled, promo_expires_at');

      if (merchantsError) throw merchantsError;

      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .rpc('admin_get_subscriptions');

      if (subscriptionsError) throw subscriptionsError;

      const { data: entitlementData, error: entitlementError } = await supabase
        .from('admin_merchant_entitlement')
        .select('merchant_id, active_plan_id, entitlement_source, promo_expires_at, start_date');

      if (entitlementError) throw entitlementError;

      const { data: planRows, error: plansError } = await supabase
        .from('subscription_plans')
        .select('id, name, slug, promo_enabled, promo_duration_days')
        .order('display_order', { ascending: true });

      if (plansError) throw plansError;

      const { data: globalSettings, error: globalSettingsError } = await supabase
        .from('global_settings')
        .select('promo_enabled, promo_duration_days, promo_plan_id')
        .eq('id', 1)
        .maybeSingle();

      if (globalSettingsError) {
        console.error('Failed to load global promo settings:', globalSettingsError);
      }

      const merchantIds = (merchants || []).map((m: any) => m.id);

      let dealCountsMap: Record<string, number> = {};

      if (merchantIds.length > 0) {
        const { data: dealCounts, error: dealCountsError } = await supabase
          .from('deals')
          .select('merchant_id, count:id')
          .eq('is_active', true)
          .in('merchant_id', merchantIds);

        if (dealCountsError) throw dealCountsError;

        dealCountsMap = (dealCounts || []).reduce(
          (acc: Record<string, number>, row: any) => {
            const merchantId = row.merchant_id;
            acc[merchantId] = (acc[merchantId] || 0) + 1;
            return acc;
          },
          {}
        );
      }

      const safePlans: PlanOption[] = (planRows || []).map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        promo_enabled: !!plan.promo_enabled,
        promo_duration_days: plan.promo_duration_days ?? null,
      }));

      const planMap: Record<string, string> = {};
      (planRows || []).forEach((plan: any) => {
        planMap[plan.id] = plan.name;
      });

      setPlans(safePlans);

      const activePromoPlan = safePlans.find((plan) => plan.promo_enabled);

      if (globalSettings) {
        const savedPromoEnabled =
          !!globalSettings.promo_enabled || !!activePromoPlan;

        setPromoEnabled(savedPromoEnabled);
        setPromoDuration(
          globalSettings.promo_duration_days ??
            activePromoPlan?.promo_duration_days ??
            90
        );
        setPromoPlanId(globalSettings.promo_plan_id ?? activePromoPlan?.id ?? '');
      } else if (activePromoPlan) {
        setPromoEnabled(true);
        setPromoDuration(activePromoPlan.promo_duration_days ?? 90);
        setPromoPlanId(activePromoPlan.id);
      } else {
        setPromoEnabled(false);
        setPromoDuration(90);
        setPromoPlanId('');
      }

      const result: Row[] =
        merchants?.map((m: any) => {
          const sub = subscriptionsData
            ?.filter((s: any) => s.merchant_id === m.id)
            ?.sort(
              (a: any, b: any) =>
                new Date(b.start_date).getTime() -
                new Date(a.start_date).getTime()
            )[0];

          const entitlement = entitlementData?.find(
            (e: any) => e.merchant_id === m.id
          );

          const activePlanId = entitlement?.active_plan_id;

          return {
            id: sub?.merchant_id || m.user_id,
            user_id: m.user_id,
            merchant_id: m.id,
            restaurant_name: m.name || 'Unknown',
            plan_name: activePlanId
              ? planMap[activePlanId] || sub?.plan_name || 'Starter'
              : sub?.plan_name || 'Starter',
            billing_cycle: sub?.billing_cycle,
            status: sub?.status,
            created_at: sub?.start_date || null,
            active_deals_count: dealCountsMap[m.id] ?? 0,
            promo_enabled: !!m.promo_enabled,
            promo_expires_at: m.promo_expires_at ?? null,
          };
        }) || [];

      setRows(result);
    } catch (error) {
      console.error('Failed to load admin subscriptions:', error);
      setRows([]);
      setPromoEnabled((current) => (current === null ? false : current));
    } finally {
      setLoading(false);
      fetchInFlightRef.current = false;
    }
  };

  const handleSync = async (merchantId: string) => {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) return;
    if (!merchantId) return;

    setSyncingId(merchantId);

    try {
      await supabase.rpc('admin_force_subscription_sync', {
        p_merchant_id: merchantId,
      });

      await fetchData();
    } finally {
      setSyncingId(null);
    }
  };

  
  const handleExtendPromo = async (merchantId: string) => {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) return;
    if (!merchantId) return;
    try {
      await supabase.rpc('admin_extend_promo_30_days', {
        p_merchant_id: merchantId,
      });
      await fetchData();
    } catch (error) {
      console.error('Failed to extend promo:', error);
    }
  };

const updatePromoDuration = async (value: number) => {
    const previousDuration = promoDuration;
    setPromoDuration(value);

    if (promoEnabled && promoPlanId) {
      setPromoLoading(true);

      try {
        const { error } = await supabase.rpc('admin_toggle_promo', {
          p_plan_id: promoPlanId,
          p_enabled: true,
          p_duration_days: value,
        });

        if (error) {
          throw error;
        }

        await fetchData().catch((reloadError) => {
          console.error('Failed to reload admin subscriptions:', reloadError);
        });
      } catch (error) {
        console.error('Failed to update promo duration:', error);
        setPromoDuration(previousDuration);
        await fetchData().catch((reloadError) => {
          console.error('Failed to reload admin subscriptions:', reloadError);
        });
      } finally {
        setPromoLoading(false);
      }
    }
  };

  const updatePromoPlan = async (value: string) => {
    const previousPlanId = promoPlanId;
    setPromoPlanId(value);

    if (promoEnabled && value) {
      setPromoLoading(true);

      try {
        const { error } = await supabase.rpc('admin_toggle_promo', {
          p_plan_id: value,
          p_enabled: true,
          p_duration_days: promoDuration,
        });

        if (error) {
          throw error;
        }

        await fetchData().catch((reloadError) => {
          console.error('Failed to reload admin subscriptions:', reloadError);
        });
      } catch (error) {
        console.error('Failed to update promo plan:', error);
        setPromoPlanId(previousPlanId);
        await fetchData().catch((reloadError) => {
          console.error('Failed to reload admin subscriptions:', reloadError);
        });
      } finally {
        setPromoLoading(false);
      }
    }
  };

  const togglePromo = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) return;
    if (promoLoading || promoEnabled === null) return;

    const next = !promoEnabled;

    if (next && !promoPlanId) {
      return;
    }

    const previousEnabled = promoEnabled;
    setPromoLoading(true);
    setPromoEnabled(next);

    try {
      const { error } = await supabase.rpc('admin_toggle_promo', {
        p_plan_id: next ? promoPlanId : null,
        p_enabled: next,
        p_duration_days: next ? promoDuration : null,
      });

      if (error) {
        throw error;
      }

      setPromoEnabled(next);

      await fetchData().catch((reloadError) => {
        console.error('Failed to reload admin subscriptions:', reloadError);
      });
    } catch (error) {
      console.error('Failed to toggle promo:', error);
      setPromoEnabled(previousEnabled);
      await fetchData().catch((reloadError) => {
        console.error('Failed to reload admin subscriptions:', reloadError);
      });
    } finally {
      setPromoLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        fetchData();
      }
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'INITIAL_SESSION'
      ) {
        fetchData();
      }
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <div className="space-y-4">
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <CardTitle className="text-xl font-semibold text-gray-900">
            Subscriptions
          </CardTitle>

          <div className="flex justify-end mt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Promo</span>

              <button
                type="button"
                onClick={togglePromo}
                disabled={promoLoading || promoEnabled === null}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  promoEnabled === true
                    ? 'bg-[#2463EB]'
                    : promoEnabled === false
                    ? 'bg-gray-300'
                    : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    promoEnabled === true ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>

              {(promoEnabled === null || promoLoading) && (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              )}

              <select
                value={promoPlanId}
                onChange={(e) => updatePromoPlan(e.target.value)}
                disabled={promoLoading}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">Select plan</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>

              <select
                value={promoDuration}
                onChange={(e) => updatePromoDuration(Number(e.target.value))}
                disabled={promoLoading}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Promo Expiry</TableHead>
                    <TableHead>Extend Promo</TableHead>
                    <TableHead>Active Deals</TableHead>
                    <TableHead>Paid Subscription</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.restaurant_name}</TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{row.plan_name}</span>
                          {row.promo_enabled && row.promo_expires_at ? (
                            <span className="inline-flex items-center rounded-md bg-[#2463EB] px-2 py-1 text-xs font-medium text-white">
                              PROMO
                            </span>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell>
                        {row.promo_enabled && row.promo_expires_at ? (
                          formatDate(row.promo_expires_at)
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleExtendPromo(row.merchant_id)}
                          className={`${
                            row.promo_enabled ? 'bg-green-500' : 'bg-gray-300'
                          } text-white`}
                        >
                          Extend
                        </Button>
                      </TableCell>

                      <TableCell>
                        {String(row.active_deals_count ?? 0)}
                      </TableCell>

                      <TableCell>{formatDate(row.created_at)}</TableCell>

                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleSync(row.user_id)}
                          disabled={syncingId === row.user_id}
                          className="bg-gray-100 hover:bg-gray-200 text-[#2463EB]"
                        >
                          {syncingId === row.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
