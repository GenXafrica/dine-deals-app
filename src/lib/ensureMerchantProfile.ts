// src/lib/ensureMerchantProfile.ts
// READ-ONLY: Merchant rows are created in Supabase AFTER email verification.
// This file must NEVER insert, upsert, or repair merchant rows.

import { supabase } from "@/lib/supabase";

export async function ensureMerchantProfile(): Promise<{ id: string } | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (!session?.user) return null;

    const user = session.user;

    // Must be verified
    if (!user.email_confirmed_at && !user.confirmed_at) return null;

    const { data: merchant, error } = await supabase
      .from("merchants")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !merchant) return null;

    return { id: merchant.id };
  } catch (err) {
    console.error("[ensureMerchantProfile] Unexpected error:", err);
    return null;
  }
}

export default ensureMerchantProfile;
