// src/lib/getAdminTotals.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type AdminTotals = {
  total_customers: number;
  total_merchants: number;
  total_verified_users: number; // counts every verified row (customers + merchants)
};

export async function getAdminTotals(client: SupabaseClient = supabase): Promise<AdminTotals> {
  // Basic totals
  const [cTotal, mTotal] = await Promise.all([
    client.from('customers').select('id', { head: true, count: 'exact' }).is('deleted_at', null),
    client.from('merchants').select('id', { head: true, count: 'exact' }).is('deleted_at', null),
  ]);

  let total_customers = Number(cTotal?.count ?? 0);
  let total_merchants  = Number(mTotal?.count ?? 0);

  // Verified rows (no dedupe; add both sides)
  const [cVer, mVer] = await Promise.all([
    client.from('customers').select('id', { head: true, count: 'exact' }).is('deleted_at', null).eq('email_verified', true),
    client.from('merchants').select('id', { head: true, count: 'exact' }).is('deleted_at', null).eq('email_verified', true),
  ]);

  let verifiedCustomers = Number(cVer?.count ?? 0);
  let verifiedMerchants = Number(mVer?.count ?? 0);

  // Fallback if some clients don’t return count with head:true
  if (!verifiedCustomers) {
    const r = await client.from('customers').select('id').is('deleted_at', null).eq('email_verified', true);
    verifiedCustomers = Array.isArray(r.data) ? r.data.length : 0;
  }
  if (!verifiedMerchants) {
    const r = await client.from('merchants').select('id').is('deleted_at', null).eq('email_verified', true);
    verifiedMerchants = Array.isArray(r.data) ? r.data.length : 0;
  }

  return {
    total_customers,
    total_merchants,
    total_verified_users: verifiedCustomers + verifiedMerchants,
  };
}
