// src/lib/ensureCustomerProfile.ts
import { supabase } from '@/lib/supabase';

export interface NormalizedCustomer {
  id: string;
  user_id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  postal_code?: string | null;
  date_of_birth?: string | null;
  preferences?: string | null;
  marketing_email_opt_in?: boolean | null;
  marketing_sms_opt_in?: boolean | null;
  marketing_whatsapp_opt_in?: boolean | null;
  special_dates?: any;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * READ-ONLY GUARARD
 * - Customer rows are created in Supabase AFTER email verification
 * - This function MUST NEVER insert or repair rows
 */
export async function ensureCustomerProfile(): Promise<NormalizedCustomer | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session?.user) return null;

    if (!session.user.email_confirmed_at) return null;

    const userId = session.user.id;

    const { data: row, error } = await supabase
      .from('customers')
      .select(
        `
        id,
        user_id,
        first_name,
        last_name,
        email,
        phone,
        city,
        address,
        postal_code,
        date_of_birth,
        preferences,
        marketing_email_opt_in,
        marketing_sms_opt_in,
        marketing_whatsapp_opt_in,
        special_dates,
        created_at,
        updated_at
        `
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !row) {
      console.error('[ensureCustomerProfile] Customer row missing', { userId });
      return null;
    }

    const firstName = (row.first_name ?? '').trim();
    const lastName = (row.last_name ?? '').trim();
    const fullName =
      firstName || lastName
        ? `${[firstName, lastName].filter(Boolean).join(' ')}`
        : '';

    return {
      id: row.id,
      user_id: row.user_id,
      firstName,
      lastName,
      fullName,
      email: row.email ?? null,
      phone: row.phone ?? null,
      city: row.city ?? null,
      address: row.address ?? null,
      postal_code: row.postal_code ?? null,
      date_of_birth: row.date_of_birth ?? null,
      preferences: row.preferences ?? null,
      marketing_email_opt_in: row.marketing_email_opt_in ?? null,
      marketing_sms_opt_in: row.marketing_sms_opt_in ?? null,
      marketing_whatsapp_opt_in: row.marketing_whatsapp_opt_in ?? null,
      special_dates: row.special_dates ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null
    };
  } catch (err) {
    console.error('[ensureCustomerProfile] Fatal error', err);
    return null;
  }
}

export default ensureCustomerProfile;
