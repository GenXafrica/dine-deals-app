import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import AdminHeader from './AdminHeader';
import AdminStats from './AdminStats';
import AdminUserTable from './AdminUserTable';
import AdminSubscriptionsTab from './AdminSubscriptionsTab';
import AdminUserManagement from './AdminUserManagement';
import AdminEmailSettings from './AdminEmailSettings';
import { HomeButton } from './HomeButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdminUser {
  id: string;
  type: string;
  name: string;
  email: string;
  created_at: string;
  phone: string;
  verified: boolean;
  raw: any;
}

const ADMIN_LOGGED_OUT_KEY = 'dinedeals:admin_logged_out';

async function getStableSession(maxMs = 8000): Promise<any | null> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const { data } = await supabase.auth.getSession();
    if (data?.session) return data.session;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
}

function formatCsvDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

function downloadCsvFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    document.body.removeChild(link);
  }

  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
}

export default function ModernAdminDashboard() {
  const [activeTab, setActiveTab] =
    useState<'users' | 'subscriptions' | 'admins' | 'emails'>('users');

  const [customers, setCustomers] = useState<AdminUser[]>([]);
  const [merchants, setMerchants] = useState<AdminUser[]>([]);
  const [unassigned, setUnassigned] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const sessionRef = useRef<any>(null);

  const fetchData = useCallback(async () => {
    setUsersLoading(true);
    try {
      const session = await getStableSession();
      sessionRef.current = session;
      if (!session) return;

      const { data, error } = await supabase.rpc('admin_get_all_users_with_type');

      if (error) {
        toast({
          title: 'Users load failed',
          description: error.message || 'Could not load admin users.',
          variant: 'destructive',
        });
        return;
      }

      const safeData = Array.isArray(data) ? data : [];

      const customersData =
        safeData.filter((u: any) => u.user_type === 'Customer') || [];

      const merchantsData =
        safeData.filter((u: any) => u.user_type === 'Merchant') || [];

      const unassignedData =
        safeData.filter((u: any) => u.user_type === 'Unassigned') || [];

      setCustomers(
        customersData.map((u: any) => ({
          id: u.id,
          type: 'Customer',
          name: u.display_name || '',
          email: u.email || '',
          created_at: u.created_at || '',
          phone: u.phone || '',
          verified: !!u.email_confirmed_at,
          raw: u,
        }))
      );

      setMerchants(
        merchantsData.map((u: any) => ({
          id: u.id,
          type: 'Merchant',
          name: u.display_name || '',
          email: u.email || '',
          created_at: u.created_at || '',
          phone: u.phone || '',
          verified: !!u.email_confirmed_at,
          raw: u,
        }))
      );

      setUnassigned(
        unassignedData.map((u: any) => ({
          id: u.id,
          type: 'Unassigned',
          name: '',
          email: u.email || '',
          created_at: u.created_at || '',
          phone: u.phone || '',
          verified: !!u.email_confirmed_at,
          raw: u,
        }))
      );
    } catch (error: any) {
      toast({
        title: 'Users load failed',
        description: error?.message || 'Unexpected admin dashboard error.',
        variant: 'destructive',
      });
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGoHome = () => {
    window.location.assign('/');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    sessionRef.current = null;
    sessionStorage.setItem(ADMIN_LOGGED_OUT_KEY, '1');
    window.location.assign('/login');
  };

  const handleDownloadCSV = () => {
    const allUsers = [...customers, ...merchants, ...unassigned];

    if (!allUsers.length) {
      toast({
        title: 'Export CSV',
        description: 'No users available to export.',
        duration: 3000,
      });
      return;
    }

    const headers = [
      'id',
      'type',
      'email',
      'verified',
      'created_at',
      'name',
      'phone',
      'customer_first_name',
      'customer_last_name',
      'customer_full_name',
      'customer_mobile_number',
      'customer_city',
      'customer_profile_complete',
      'customer_profile_completed',
      'customer_marketing_email_opt_in',
      'customer_marketing_sms_opt_in',
      'customer_marketing_whatsapp_opt_in',
      'merchant_name',
      'merchant_restaurant_name',
      'merchant_phone',
      'merchant_phone_number',
      'merchant_whatsapp_number',
      'merchant_city',
      'merchant_town_city',
      'merchant_address',
      'merchant_google_address',
      'merchant_category',
      'merchant_website',
      'merchant_web_address',
      'merchant_status',
      'merchant_profile_complete',
    ];

    const rows = allUsers.map((user) => [
      escapeCsvValue(user.id),
      escapeCsvValue(user.type),
      escapeCsvValue(user.email),
      escapeCsvValue(user.verified ? 'Yes' : 'No'),
      escapeCsvValue(formatCsvDate(user.created_at)),
      escapeCsvValue(user.name || ''),
      escapeCsvValue(user.phone || ''),
      escapeCsvValue(user.raw?.customer_first_name ?? ''),
      escapeCsvValue(user.raw?.customer_last_name ?? ''),
      escapeCsvValue(user.raw?.customer_full_name ?? ''),
      escapeCsvValue(user.raw?.customer_mobile_number ?? ''),
      escapeCsvValue(user.raw?.customer_city ?? ''),
      escapeCsvValue(user.raw?.customer_profile_complete ?? ''),
      escapeCsvValue(user.raw?.customer_profile_completed ?? ''),
      escapeCsvValue(user.raw?.customer_marketing_email_opt_in ?? ''),
      escapeCsvValue(user.raw?.customer_marketing_sms_opt_in ?? ''),
      escapeCsvValue(user.raw?.customer_marketing_whatsapp_opt_in ?? ''),
      escapeCsvValue(user.raw?.merchant_name ?? ''),
      escapeCsvValue(user.raw?.merchant_restaurant_name ?? ''),
      escapeCsvValue(user.raw?.merchant_phone ?? ''),
      escapeCsvValue(user.raw?.merchant_phone_number ?? ''),
      escapeCsvValue(user.raw?.merchant_whatsapp_number ?? ''),
      escapeCsvValue(user.raw?.merchant_city ?? ''),
      escapeCsvValue(user.raw?.merchant_town_city ?? ''),
      escapeCsvValue(user.raw?.merchant_address ?? ''),
      escapeCsvValue(user.raw?.merchant_google_address ?? ''),
      escapeCsvValue(user.raw?.merchant_category ?? ''),
      escapeCsvValue(user.raw?.merchant_website ?? ''),
      escapeCsvValue(user.raw?.merchant_web_address ?? ''),
      escapeCsvValue(user.raw?.merchant_status ?? ''),
      escapeCsvValue(user.raw?.merchant_profile_complete ?? ''),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `dinedeals-admin-users-${dateStamp}.csv`;

    downloadCsvFile(filename, csvContent);

    toast({
      title: 'Export CSV ready',
      description: 'CSV downloaded successfully.',
      duration: 3000,
    });
  };

  const totalCustomers = customers.length;
  const totalMerchants = merchants.length;
  const totalVerified =
    customers.filter((c) => c.verified === true).length +
    merchants.filter((m) => m.verified === true).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="absolute top-4 right-4 z-20">
        <HomeButton onClick={handleGoHome} />
      </div>

      <AdminHeader
        onDownloadCSV={handleDownloadCSV}
        onLogout={handleLogout}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <AdminStats
          customersCount={totalCustomers}
          merchantsCount={totalMerchants}
          verifiedCount={totalVerified}
          customers={customers}
          merchants={merchants}
          loading={usersLoading}
        />

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4 bg-white border shadow-sm">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
            <TabsTrigger value="emails">Emails</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            {usersLoading ? (
              <div className="bg-white border rounded-lg p-6 text-sm">
                Loading users…
              </div>
            ) : (
              <AdminUserTable
                customers={customers}
                merchants={merchants}
                unassigned={unassigned}
              />
            )}
          </TabsContent>

          <TabsContent value="subscriptions">
            <AdminSubscriptionsTab />
          </TabsContent>

          <TabsContent value="admins">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="emails">
            <AdminEmailSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}