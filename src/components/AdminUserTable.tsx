import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Trash2, Mail } from 'lucide-react';

type UnifiedUser = {
  id: string;
  db_id: string;
  type: 'customer' | 'merchant' | 'unassigned';
  name: string;
  email: string;
  created_at?: string;
  verified?: boolean;
  welcomeEmailSent?: boolean;
  raw?: any;
};

interface AdminUserTableProps {
  customers?: any[];
  merchants?: any[];
  unassigned?: any[];
}

function getCustomerDisplayName(customer: any): string {
  const fullName =
    customer?.full_name ||
    customer?.name ||
    customer?.raw?.full_name ||
    customer?.raw?.name ||
    '';

  return String(fullName).trim();
}

function getMerchantDisplayName(merchant: any): string {
  const merchantName =
    merchant?.name ||
    merchant?.merchant_name ||
    merchant?.business_name ||
    merchant?.restaurant_name ||
    merchant?.raw?.name ||
    merchant?.raw?.merchant_name ||
    merchant?.raw?.business_name ||
    merchant?.raw?.restaurant_name ||
    '';

  return String(merchantName).trim();
}

export default function AdminUserTable({
  customers,
  merchants,
  unassigned,
}: AdminUserTableProps) {
  const [allUsers, setAllUsers] = useState<UnifiedUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'customer' | 'merchant' | 'unassigned'
  >('all');
  const [filterVerified, setFilterVerified] =
    useState<'all' | 'verified' | 'unverified'>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UnifiedUser | null>(null);

  const combined = useMemo(() => {
    const mappedCustomers =
      customers?.map((c) => ({
        id: c.user_id || c.raw?.user_id || c.id,
        db_id: c.id || c.raw?.id || c.user_id,
        type: 'customer' as const,
        name: getCustomerDisplayName(c),
        email: c.email || c.raw?.email || '',
        created_at: c.created_at || c.raw?.created_at,
        verified: !!(c.email_verified || c.verified || c.raw?.email_confirmed_at),
        welcomeEmailSent: !!(
          c.welcome_email_sent_at ||
          c.welcomeEmailSent ||
          c.raw?.welcome_email_sent_at ||
          c.raw?.welcomeEmailSent
        ),
        raw: c,
      })) || [];

    const mappedMerchants =
      merchants?.map((m) => ({
        id: m.user_id || m.raw?.user_id || m.id,
        db_id: m.id || m.raw?.id || m.user_id,
        type: 'merchant' as const,
        name: getMerchantDisplayName(m),
        email: m.email || m.raw?.email || '',
        created_at: m.created_at || m.raw?.created_at,
        verified: !!(m.email_verified || m.verified || m.raw?.email_confirmed_at),
        welcomeEmailSent: !!(
          m.welcome_email_sent_at ||
          m.welcomeEmailSent ||
          m.raw?.welcome_email_sent_at ||
          m.raw?.welcomeEmailSent
        ),
        raw: m,
      })) || [];

    const mappedUnassigned =
      unassigned?.map((u) => ({
        id: u.user_id || u.id || u.raw?.user_id || u.raw?.id,
        db_id: u.id || u.raw?.id || u.user_id,
        type: 'unassigned' as const,
        name: '',
        email: u.email || u.raw?.email || '',
        created_at: u.created_at || u.raw?.created_at,
        verified: !!(u.email_verified || u.verified || u.raw?.email_confirmed_at),
        welcomeEmailSent: !!(
          u.welcome_email_sent_at ||
          u.welcomeEmailSent ||
          u.raw?.welcome_email_sent_at ||
          u.raw?.welcomeEmailSent
        ),
        raw: u,
      })) || [];

    return [...mappedCustomers, ...mappedMerchants, ...mappedUnassigned];
  }, [customers, merchants, unassigned]);

  useEffect(() => {
    setAllUsers(combined);
  }, [combined]);

  const filtered = allUsers
    .filter((u) => {
      const matchesSearch =
        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === 'all' || u.type === filterType;

      const matchesVerified =
        filterVerified === 'all' ||
        (filterVerified === 'verified' && u.verified === true) ||
        (filterVerified === 'unverified' && u.verified === false);

      return matchesSearch && matchesType && matchesVerified;
    })
    .sort((a, b) => {
      const d1 = a.created_at ? new Date(a.created_at).getTime() : 0;
      const d2 = b.created_at ? new Date(b.created_at).getTime() : 0;
      return d2 - d1;
    });

  const handleResend = async (u: UnifiedUser) => {
    const rowKey = `${u.type}-${u.id}`;
    setSavingId(rowKey);

    try {
      await supabase.auth.resend({
        type: 'signup',
        email: u.email,
      });

      toast({
        title: 'Verification sent',
        description: `Email resent to ${u.email}`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to resend email',
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;

    const u = deleteTarget;

    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-users', {
        body: {
          action: 'delete',
          userId: u.id || u.raw?.user_id || u.raw?.id,
        },
      });

      if (error || !data?.success) {
        toast({
          title: 'Delete failed',
          description: error?.message || data?.error || 'Unknown error',
          variant: 'destructive',
        });
        return;
      }

      setAllUsers((prev) => prev.filter((user) => user.id !== u.id));
      window.location.reload();

      toast({
        title: 'Deleted',
        description: `${u.email} has been deleted.`,
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <CardTitle className="text-xl font-semibold text-gray-900">
            User Management
          </CardTitle>
          <CardDescription>
            Manage customers, merchants and unassigned users
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
                <SelectItem value="merchant">Merchants</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterVerified} onValueChange={(v) => setFilterVerified(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Welcome</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((u) => (
                <TableRow key={`${u.type}-${u.id}`}>
                  <TableCell>{u.type}</TableCell>
                  <TableCell>{u.name || '—'}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.verified ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{u.welcomeEmailSent ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString('en-GB')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(u)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>

                      {!u.verified && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-gray-100 hover:bg-gray-200 text-blue-600"
                          onClick={() => handleResend(u)}
                          disabled={savingId === `${u.type}-${u.id}`}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="text-sm text-gray-600 mt-4">
            Showing {filtered.length} users
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Permanently delete {deleteTarget?.email}?
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-600">
            This action cannot be undone.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteConfirmed}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}