import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

import { toast } from '@/hooks/use-toast';
import AdminHeader from './AdminHeader';
import AdminStats from './AdminStats';
import AdminUserTable from './AdminUserTable';
import AdminUserManagement from './AdminUserManagement';
import EditCustomerDialog from './EditCustomerDialog';
import EditMerchantDialog from './EditMerchantDialog';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import AdminEmailSettings from './AdminEmailSettings';
import AdminSubscriptionManagement from './AdminSubscriptionManagement';
import { HomeButton } from './HomeButton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, AlertCircle } from 'lucide-react';

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => supabase.removeAllChannels());
}

export default function AdminDashboard({ onLogout }: any) {
  const [customers, setCustomers] = useState<any[]>();
  const [merchants, setMerchants] = useState<any[]>();
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'admins' | 'emails' | 'subscriptions'>('users');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: rpcData } = await supabase.rpc('admin_get_customers_and_merchants');

      const customersData = rpcData?.[0]?.customers || [];
      const merchantsData = rpcData?.[0]?.merchants || [];

      setCustomers(customersData);
      setMerchants(merchantsData);

      // ✅ fetch auth.users via edge function
      const { data: authUsersData, error: authError } = await supabase.functions.invoke('admin-list-users');

console.log('AUTH USERS DATA:', authUsersData);
console.log('AUTH USERS ERROR:', authError);

      // 🔍 DEBUG
      console.log('AUTH USERS DEBUG:', authUsersData);

      if (authUsersData?.users) {
        const customerIds = new Set(customersData.map((c: any) => c.user_id || c.id));
        const merchantIds = new Set(merchantsData.map((m: any) => m.user_id || m.id));

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
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const customersPropToPass = Array.isArray(customers) ? customers : [];
  const merchantsPropToPass = Array.isArray(merchants) ? merchants : [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <AdminHeader onLogout={onLogout} />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <AdminUserTable
            customers={customersPropToPass}
            merchants={merchantsPropToPass}
            unassigned={unassigned}
          />
        </TabsContent>

        <TabsContent value="admins">
          <AdminUserManagement />
        </TabsContent>

        <TabsContent value="emails">
          <AdminEmailSettings />
        </TabsContent>

        <TabsContent value="subscriptions">
          <AdminSubscriptionManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}