import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, RefreshCw, Users, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AgentMerchant {
  id?: string;
  merchant_id?: string;
  name?: string;
  merchant_name?: string;
  email?: string;
  merchant_email?: string;
  province?: string;
  merchant_province?: string;
  assigned_province?: string;
  agent_province?: string;
  plan_name?: string;
  subscription_plan?: string;
  status?: string;
  expected_commission?: number;
  expected_commission_amount?: number;
  commission?: number;
  commission_amount?: number;
  created_at?: string;
  assigned_at?: string;
  assigned_date?: string;
  agent_assigned_at?: string;
  agent_assignment_date?: string;
}

interface AgentDashboardData {
  total_merchants: number;
  expected_commission: number;
  merchants: AgentMerchant[];
}

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(value || 0);
};

const formatDate = (value?: string): string => {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const normaliseDashboardData = (data: unknown): AgentDashboardData => {
  const rows = Array.isArray(data) ? data : [];
  const root = rows.length === 1 ? rows[0] : data;
  const dashboard =
    root && typeof root === "object" ? (root as Record<string, unknown>) : {};

  const merchantsSource = dashboard.merchants;
  const merchants = Array.isArray(merchantsSource)
    ? (merchantsSource as AgentMerchant[])
    : rows.length > 1
      ? (rows as AgentMerchant[])
      : [];

  const merchantCommissionTotal = merchants.reduce((total, merchant) => {
    return (
      total +
      toNumber(
        merchant.expected_commission ??
          merchant.expected_commission_amount ??
          merchant.commission ??
          merchant.commission_amount,
      )
    );
  }, 0);

  return {
    total_merchants: toNumber(
      dashboard.total_merchants ??
        dashboard.total_merchant_count ??
        dashboard.merchant_count ??
        merchants.length,
    ),
    expected_commission: toNumber(
      dashboard.expected_commission ??
        dashboard.expected_commission_amount ??
        dashboard.total_expected_commission ??
        dashboard.total_commission ??
        merchantCommissionTotal,
    ),
    merchants,
  };
};

export const AgentDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<AgentDashboardData>({
    total_merchants: 0,
    expected_commission: 0,
    merchants: [],
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchAgentDashboard = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData?.session) {
        setDashboardData({
          total_merchants: 0,
          expected_commission: 0,
          merchants: [],
        });
        setErrorMessage("Please sign in to view your agent dashboard.");
        return;
      }

      const { data, error } = await supabase.rpc("get_agent_dashboard");

      if (error) {
        throw error;
      }

      setDashboardData(normaliseDashboardData(data));
    } catch (error) {
      console.error("Error loading agent dashboard:", error);
      setErrorMessage("Agent dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  useEffect(() => {
    fetchAgentDashboard();
  }, []);

  const merchantRows = useMemo(
    () => dashboardData.merchants || [],
    [dashboardData.merchants],
  );

  if (loading) {
    return <div className="text-center py-4">Loading agent dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <div className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold">Agent Dashboard</h1>
            <p className="text-sm text-slate-300">
              Track your assigned merchants and expected commission.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAgentDashboard}
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {errorMessage ? (
          <Card className="bg-white">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">{errorMessage}</p>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Merchants</p>
                  <p className="text-2xl font-bold">
                    {dashboardData.total_merchants}
                  </p>
                </div>
                <Users className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Expected Commission</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(dashboardData.expected_commission)}
                  </p>
                </div>
                <Wallet className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Assigned Merchants
            </CardTitle>
          </CardHeader>
          <CardContent>
            {merchantRows.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No assigned merchants yet.
              </p>
            ) : (
              <div className="space-y-3">
                {merchantRows.map((merchant, index) => {
                  const merchantId =
                    merchant.id || merchant.merchant_id || String(index);
                  const merchantName =
                    merchant.name || merchant.merchant_name || "Merchant";
                  const merchantEmail =
                    merchant.email || merchant.merchant_email || "";
                  const planName =
                    merchant.plan_name ||
                    merchant.subscription_plan ||
                    "No active plan";
                  const status = merchant.status || "active";
                  const assignedAt =
                    merchant.agent_assigned_at ||
                    merchant.agent_assignment_date ||
                    merchant.assigned_at ||
                    merchant.assigned_date ||
                    merchant.created_at;
                  const province =
                    merchant.province ||
                    merchant.merchant_province ||
                    merchant.assigned_province ||
                    merchant.agent_province;
                  const commission = toNumber(
                    merchant.expected_commission ??
                      merchant.expected_commission_amount ??
                      merchant.commission ??
                      merchant.commission_amount,
                  );

                  return (
                    <div
                      key={merchantId}
                      className="rounded-lg border bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {merchantName}
                          </p>
                          {merchantEmail ? (
                            <p className="text-xs text-gray-500 truncate">
                              {merchantEmail}
                            </p>
                          ) : null}
                          <p className="text-xs text-gray-500">
                            Assigned {formatDate(assignedAt)}
                          </p>
                        </div>
                        <Badge variant="secondary">{status}</Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                        <div>
                          <p className="text-xs text-gray-500">Province</p>
                          <p>{province || "Not available"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Plan</p>
                          <p>{planName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Commission</p>
                          <p>{formatCurrency(commission)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentDashboard;
