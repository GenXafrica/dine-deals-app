// src/components/AdminUsersTab.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AdminUserTable from './AdminUserTable';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

async function waitForSession(maxMs = 8000): Promise<null | any> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data?.session) return data.session;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

function normalizeEmail(email: any): string {
  return String(email || '').trim().toLowerCase();
}

function mergeWelcomeEmailSentAt(users: any[], welcomeRows: any[]): any[] {
  const byUserId = new Map<string, any>();
  const byEmail = new Map<string, any>();

  welcomeRows.forEach((row) => {
    if (row?.user_id) byUserId.set(String(row.user_id), row);
    const email = normalizeEmail(row?.email);
    if (email) byEmail.set(email, row);
  });

  return users.map((user) => {
    const matchByUserId = user?.user_id ? byUserId.get(String(user.user_id)) : null;
    const matchByEmail = byEmail.get(normalizeEmail(user?.email));
    const match = matchByUserId || matchByEmail;

    if (!match?.welcome_email_sent_at) return user;

    return {
      ...user,
      welcome_email_sent_at: match.welcome_email_sent_at,
    };
  });
}

export default function AdminUsersTab() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchManagedUsers = useCallback(async () => {
    setLoading(true);

    try {
      const session = await waitForSession(8000);

      if (!session) {
        if (!mountedRef.current) return;
        setCustomers([]);
        setMerchants([]);
        setUnassigned([]);
        return;
      }

      // ✅ USE EDGE FUNCTION (NOT adminRpc)
      const { data, error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'list' },
      });

      if (!mountedRef.current) return;

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to fetch users');
      }

      let customersData = data.customers || [];
      let merchantsData = data.merchants || [];

      const [customerWelcomeResult, merchantWelcomeResult] = await Promise.all([
        supabase
          .from('customers')
          .select('id,user_id,email,welcome_email_sent_at'),
        supabase
          .from('merchants')
          .select('id,user_id,email,welcome_email_sent_at'),
      ]);

      if (customerWelcomeResult.error) {
        console.warn(
          '[AdminUsersTab] customer welcome status fetch failed',
          customerWelcomeResult.error
        );
      } else {
        customersData = mergeWelcomeEmailSentAt(
          customersData,
          customerWelcomeResult.data || []
        );
      }

      if (merchantWelcomeResult.error) {
        console.warn(
          '[AdminUsersTab] merchant welcome status fetch failed',
          merchantWelcomeResult.error
        );
      } else {
        merchantsData = mergeWelcomeEmailSentAt(
          merchantsData,
          merchantWelcomeResult.data || []
        );
      }

      setCustomers(customersData);
      setMerchants(merchantsData);

      // ✅ derive unassigned from auth
      const { data: authUsersData } = await supabase.auth.admin.listUsers();

      if (authUsersData?.users) {
        const customerIds = new Set(customersData.map((c: any) => c.user_id));
        const merchantIds = new Set(merchantsData.map((m: any) => m.user_id));

        const unassignedUsers = authUsersData.users
          .filter((u: any) => {
            return !customerIds.has(u.id) && !merchantIds.has(u.id);
          })
          .map((u: any) => ({
            user_id: u.id,
            email: u.email,
            name: '',
            created_at: u.created_at,
            verified: !!u.email_confirmed_at,
            type: 'unassigned',
          }));

        setUnassigned(unassignedUsers);
      } else {
        setUnassigned([]);
      }
    } catch (err: any) {
      console.error('[AdminUsersTab] fetch error', err);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
      if (!mountedRef.current) return;
      setCustomers([]);
      setMerchants([]);
      setUnassigned([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagedUsers();
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchManagedUsers();
      }
      if (event === 'SIGNED_OUT') {
        setCustomers([]);
        setMerchants([]);
        setUnassigned([]);
      }
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, [fetchManagedUsers]);

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle>Manage Users</CardTitle>
      </CardHeader>

      <CardContent>
        <AdminUserTable
          customers={customers}
          merchants={merchants}
          unassigned={unassigned}
        />

        <div className="mt-3 text-sm text-gray-600">
          {loading
            ? 'Loading users…'
            : `Customers: ${customers.length} | Merchants: ${merchants.length} | Unassigned: ${unassigned.length}`}
        </div>
      </CardContent>
    </Card>
  );
}
