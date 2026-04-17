import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export type DealFromRpc = {
  id: string;
  merchant_id?: string | null;
  title?: string | null;
  description?: string | null;
  price?: number | null;
  original_price?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  distance_km?: number | null;
  valid_until?: string | null;
  images?: string[] | null;
  merchants?: any;
  [key: string]: any;
};

type UseDealsReturn = {
  deals: DealFromRpc[];
  loading: boolean;
  error: string | null;
  radiusKm: number;
  setRadiusKm: (v: number) => void;
  refresh: () => void;
};

export function useDealsData(
  arg1?: string | number | null,
  arg2?: number | null,
  arg3?: number
): UseDealsReturn {

  let merchantId: string | null = null;
  let userLat: number | null = null;
  let userLng: number | null = null;

  const DEFAULT_RADIUS = typeof arg3 === "number" ? arg3 : 5;

  if (typeof arg1 === "string" || arg1 === null || typeof arg1 === "undefined") {
    merchantId = (arg1 as string) || null;
  } else if (typeof arg1 === "number") {
    userLat = arg1;
    userLng = typeof arg2 === "number" ? arg2 : null;
  }

  const initialRadius = typeof arg3 === "number" ? arg3 : DEFAULT_RADIUS;

  const [deals, setDeals] = useState<DealFromRpc[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(initialRadius);

  const inFlight = useRef<boolean>(false);
  const mounted = useRef<boolean>(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchDeals = useCallback(
    async (opts?: { force?: boolean }) => {

      const force = opts?.force === true;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (mounted.current) {
          setDeals([]);
          setError(null);
          setLoading(false);
        }
        return;
      }

      if (!merchantId && (userLat === null || userLng === null)) {
        if (mounted.current) {
          setDeals([]);
          setError("missing_location");
          setLoading(false);
        }
        return;
      }

      if (inFlight.current && !force) return;

      inFlight.current = true;
      if (mounted.current) setLoading(true);
      setError(null);

      try {

        let rpcRes: { data: any; error: any } | null = null;

        if (merchantId) {

          rpcRes = await supabase.rpc("get_deals_by_merchant", {
            merchant_id: merchantId,
            radius_km: Math.round(radiusKm),
          });

          if (rpcRes && !rpcRes.error && Array.isArray(rpcRes.data)) {
            if (!mounted.current) return;
            setDeals(rpcRes.data);
            return;
          }

          const { data, error: selectErr } = await supabase
            .from("deals")
            .select("*")
            .eq("merchant_id", merchantId)
            .order("created_at", { ascending: false });

          if (selectErr) throw selectErr;

          if (!mounted.current) return;

          setDeals(data || []);
          return;
        }

        if (userLat !== null && userLng !== null) {

          rpcRes = await supabase.rpc("get_deals_within_radius", {
            p_category: null,
            p_latitude: userLat,
            p_longitude: userLng,
            p_radius_km: Math.round(radiusKm),
          });

          console.log("RPC RAW RESPONSE", rpcRes);

          if (rpcRes && !rpcRes.error && Array.isArray(rpcRes.data)) {
            if (!mounted.current) return;

            // IMPORTANT: pass RPC data through unchanged
            setDeals(rpcRes.data);

            return;
          }

          if (!mounted.current) return;

          setDeals([]);
          setError(
            rpcRes?.error?.message
              ? String(rpcRes.error.message)
              : null
          );

          return;
        }

      } catch (err: any) {

        if (!mounted.current) return;

        setError(err?.message ? String(err.message) : String(err));
        setDeals([]);

      } finally {

        inFlight.current = false;

        if (mounted.current) setLoading(false);

      }

    },
    [merchantId, userLat, userLng, radiusKm]
  );

  useEffect(() => {

    fetchDeals();

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchDeals({ force: true });
      }
    });

    return () => {
      authSub?.subscription?.unsubscribe();
    };

  }, [merchantId, userLat, userLng, radiusKm, fetchDeals]);

  const refresh = useCallback(() => {
    fetchDeals({ force: true });
  }, [fetchDeals]);

  return {
    deals,
    loading,
    error,
    radiusKm,
    setRadiusKm,
    refresh,
  };
}

export default useDealsData;