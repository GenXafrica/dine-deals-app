// src/components/AdminStats.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Users, Store, Mail } from 'lucide-react';

type MinimalUser = { email_verified?: boolean };

function toCount(value: unknown, fallbackArray?: unknown[]): number {
  try {
    if (typeof value === 'number') return value;
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
    return Array.isArray(fallbackArray) ? fallbackArray.length : 0;
  } catch {
    return Array.isArray(fallbackArray) ? fallbackArray.length : 0;
  }
}

export default function AdminStats({
  customersCount,
  merchantsCount,
  verifiedCount,
  customers,
  merchants,
  loading,
}: {
  customersCount?: number | string;
  merchantsCount?: number | string;
  verifiedCount?: number | string;
  customers?: MinimalUser[];
  merchants?: MinimalUser[];
  loading?: boolean;
}) {
  // default safe values
  let totalCustomers = 0;
  let totalMerchants = 0;
  let verified = 0;

  try {
    // Coerce bigint-as-string -> number; fall back to array lengths
    totalCustomers = loading ? 0 : toCount(customersCount, customers);
    totalMerchants = loading ? 0 : toCount(merchantsCount, merchants);

    // Verified count from arrays (safe if undefined)
    const verifiedFromArrays =
      (Array.isArray(customers) ? customers.filter((c) => !!c?.email_verified).length : 0) +
      (Array.isArray(merchants) ? merchants.filter((m) => !!m?.email_verified).length : 0);

    // Prefer RPC-provided verifiedCount when available; otherwise use arrays.
    verified = loading
      ? 0
      : verifiedCount !== undefined
      ? toCount(verifiedCount)
      : verifiedFromArrays;

    // final guards: ensure numeric
    if (!Number.isFinite(totalCustomers)) totalCustomers = 0;
    if (!Number.isFinite(totalMerchants)) totalMerchants = 0;
    if (!Number.isFinite(verified)) verified = 0;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[AdminStats] render error', err);
    totalCustomers = 0;
    totalMerchants = 0;
    verified = 0;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900">{totalCustomers}</p>
            </div>
            <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Merchants</p>
              <p className="text-3xl font-bold text-gray-900">{totalMerchants}</p>
            </div>
            <div className="bg-green-50 p-2 sm:p-3 rounded-lg">
              <Store className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Verified Users</p>
              <p className="text-3xl font-bold text-gray-900">{verified}</p>
            </div>
            <div className="bg-purple-50 p-2 sm:p-3 rounded-lg">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
