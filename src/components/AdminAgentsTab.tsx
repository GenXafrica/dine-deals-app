import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2, RefreshCw, Save, Users } from 'lucide-react';

interface AgentRow {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email_address: string | null;
  telephone: string | null;
  whatsapp: string | null;
  province: string | null;
  agent_code: string | null;
  commission_percent: number | null;
  status: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface MerchantRow {
  id: string;
  name: string | null;
  email: string | null;
  province: string | null;
  agent_id: string | null;
  agent_code_used: string | null;
  agent_assigned_at: string | null;
  agent_assignment_locked: boolean | null;
  status: string | null;
  subscription_plan_id: string | null;
  promo_enabled: boolean | null;
  promo_started_at: string | null;
  promo_expires_at: string | null;
}

interface PlanRow {
  id: string;
  name: string | null;
}

interface SubscriptionRow {
  merchant_id: string | null;
  status: string | null;
  paid_until?: string | null;
  created_at?: string | null;
}

interface CommissionRow {
  id?: string;
  agent_id?: string | null;
  merchant_id?: string | null;
  commission_month?: string | null;
  commission_amount?: number | null;
  amount?: number | null;
  total_commission?: number | null;
  status?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  [key: string]: any;
}

interface AgentFormState {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email_address: string;
  telephone: string;
  whatsapp: string;
  province: string;
  agent_code: string;
  commission_percent: string;
  status: string;
}

const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

const emptyForm: AgentFormState = {
  id: '',
  user_id: '',
  first_name: '',
  last_name: '',
  email_address: '',
  telephone: '',
  whatsapp: '',
  province: '',
  agent_code: '',
  commission_percent: '20',
  status: 'active',
};

function cleanInternationalPhone(value: string) {
  return (value || '').replace(/\D/g, '');
}

function getCurrentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function formatMoney(value?: number | null) {
  const safeValue = Number(value ?? 0);
  return `R ${safeValue.toFixed(2).replace('.', ',')}`;
}

function getAgentName(agent?: AgentRow) {
  if (!agent) return '—';
  const name = `${agent.first_name || ''} ${agent.last_name || ''}`.trim();
  return name || agent.email_address || agent.agent_code || '—';
}

function getCommissionValue(row: CommissionRow) {
  return row.commission_amount ?? row.total_commission ?? row.amount ?? 0;
}

function isDateActive(startValue?: string | null, endValue?: string | null) {
  const now = Date.now();
  const startTime = startValue ? new Date(startValue).getTime() : null;
  const endTime = endValue ? new Date(endValue).getTime() : null;

  if (startTime !== null && Number.isNaN(startTime)) return false;
  if (endTime === null || Number.isNaN(endTime)) return false;

  return (startTime === null || startTime <= now) && endTime > now;
}

function isSubscriptionActive(subscription?: SubscriptionRow) {
  if (!subscription) return false;
  if ((subscription.status || '').toLowerCase() !== 'active') return false;

  if (!subscription.paid_until) return true;

  const paidUntilTime = new Date(subscription.paid_until).getTime();
  if (Number.isNaN(paidUntilTime)) return false;

  return paidUntilTime > Date.now();
}

function getEffectiveSubscriptionStatus(merchant: MerchantRow, subscription?: SubscriptionRow) {
  const hasActivePromo =
    merchant.promo_enabled === true &&
    isDateActive(merchant.promo_started_at, merchant.promo_expires_at);
  const hasActiveSubscription = isSubscriptionActive(subscription);

  if (hasActivePromo && hasActiveSubscription) return 'Cancelling';
  if (hasActivePromo) return 'Promo';
  if (hasActiveSubscription) return 'Active';
  if (subscription?.status) return 'Cancelling';

  return 'Inactive';
}


export const AdminAgentsTab: React.FC = () => {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [form, setForm] = useState<AgentFormState>(emptyForm);
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [commissionMonth, setCommissionMonth] = useState(getCurrentMonthValue());
  const [loading, setLoading] = useState(true);
  const [savingAgent, setSavingAgent] = useState(false);
  const [generatingAgentCode, setGeneratingAgentCode] = useState(false);
  const [assigningMerchant, setAssigningMerchant] = useState(false);
  const [calculatingCommission, setCalculatingCommission] = useState(false);
  const { toast } = useToast();

  const agentMap = useMemo(() => {
    return agents.reduce<Record<string, AgentRow>>((acc, agent) => {
      acc[agent.id] = agent;
      return acc;
    }, {});
  }, [agents]);

  const planMap = useMemo(() => {
    return plans.reduce<Record<string, string>>((acc, plan) => {
      acc[plan.id] = plan.name || '—';
      return acc;
    }, {});
  }, [plans]);

  const subscriptionMap = useMemo(() => {
    return subscriptions.reduce<Record<string, SubscriptionRow>>((acc, subscription) => {
      if (subscription.merchant_id && !acc[subscription.merchant_id]) {
        acc[subscription.merchant_id] = subscription;
      }
      return acc;
    }, {});
  }, [subscriptions]);

  const agentPerformance = useMemo(() => {
    return agents.map((agent) => {
      const assignedMerchants = merchants.filter((merchant) => merchant.agent_id === agent.id);
      const commissionTotal = commissions
        .filter((commission) => {
          return commission.agent_id === agent.id && (commission.status || '').toLowerCase() !== 'paid';
        })
        .reduce((total, commission) => total + Number(getCommissionValue(commission) || 0), 0);

      return {
        agent,
        assignedMerchantCount: assignedMerchants.length,
        commissionTotal,
      };
    });
  }, [agents, merchants, commissions]);

  const totalAssignedMerchants = useMemo(() => {
    return merchants.filter((merchant) => merchant.agent_id).length;
  }, [merchants]);

  const pendingCommissionTotal = useMemo(() => {
    return commissions
      .filter((commission) => (commission.status || '').toLowerCase() !== 'paid')
      .reduce((total, commission) => total + Number(getCommissionValue(commission) || 0), 0);
  }, [commissions]);

  const paidThisMonthTotal = useMemo(() => {
    const now = new Date();
    return commissions
      .filter((commission) => {
        if (!commission.paid_at) return false;
        const paidDate = new Date(commission.paid_at);
        if (Number.isNaN(paidDate.getTime())) return false;
        return paidDate.getFullYear() === now.getFullYear() && paidDate.getMonth() === now.getMonth();
      })
      .reduce((total, commission) => total + Number(getCommissionValue(commission) || 0), 0);
  }, [commissions]);

  const unlockedMerchants = useMemo(() => {
    return merchants.filter((merchant) => !merchant.agent_assignment_locked && !merchant.agent_id);
  }, [merchants]);

  const fetchData = async () => {
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setAgents([]);
        setMerchants([]);
        setPlans([]);
        setSubscriptions([]);
        setCommissions([]);
        return;
      }

      const [agentsResult, merchantsResult, plansResult, subscriptionsResult, commissionsResult] = await Promise.all([
        supabase
          .from('agents')
          .select('*')
          .order('province', { ascending: true }),
        supabase
          .from('merchants')
          .select('id, name, email, province, agent_id, agent_code_used, agent_assigned_at, agent_assignment_locked, status, subscription_plan_id, promo_enabled, promo_started_at, promo_expires_at')
          .order('name', { ascending: true }),
        supabase
          .from('subscription_plans')
          .select('id, name'),
        supabase
          .from('subscriptions')
          .select('merchant_id, status, paid_until, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('agent_commissions')
          .select('*')
          .order('commission_month', { ascending: false }),
      ]);

      if (agentsResult.error) throw agentsResult.error;
      if (merchantsResult.error) throw merchantsResult.error;
      if (plansResult.error) throw plansResult.error;
      if (subscriptionsResult.error) throw subscriptionsResult.error;
      if (commissionsResult.error) throw commissionsResult.error;

      setAgents((agentsResult.data || []) as AgentRow[]);
      setMerchants((merchantsResult.data || []) as MerchantRow[]);
      setPlans((plansResult.data || []) as PlanRow[]);
      setSubscriptions((subscriptionsResult.data || []) as SubscriptionRow[]);
      setCommissions((commissionsResult.data || []) as CommissionRow[]);
    } catch (error: any) {
      console.error('Failed to load agent admin data:', error);
      toast({
        title: 'Agents load failed',
        description: error?.message || 'Could not load agent admin data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'INITIAL_SESSION'
      ) {
        fetchData();
      }
    });

    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
  };

  const handleProvinceChange = async (province: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      province,
      agent_code: currentForm.id ? currentForm.agent_code : '',
    }));

    if (!province || form.id) return;

    setGeneratingAgentCode(true);

    try {
      const { data, error } = await supabase.rpc('admin_get_next_agent_code', {
        p_province: province,
      });

      if (error) throw error;

      setForm((currentForm) => ({
        ...currentForm,
        province,
        agent_code: String(data || ''),
      }));
    } catch (error: any) {
      console.error('Failed to generate agent code:', error);
      toast({
        title: 'Agent code generation failed',
        description: error?.message || 'Could not generate the next agent code.',
        variant: 'destructive',
      });
    } finally {
      setGeneratingAgentCode(false);
    }
  };

  const editAgent = (agent: AgentRow) => {
    setForm({
      id: agent.id,
      user_id: agent.user_id || '',
      first_name: agent.first_name || '',
      last_name: agent.last_name || '',
      email_address: agent.email_address || '',
      telephone: cleanInternationalPhone(agent.telephone || ''),
      whatsapp: cleanInternationalPhone(agent.whatsapp || ''),
      province: agent.province || '',
      agent_code: agent.agent_code || '',
      commission_percent: String(agent.commission_percent ?? 20),
      status: agent.status || 'active',
    });
  };

  const saveAgent = async () => {
    if (!form.user_id || !form.email_address || !form.province || !form.agent_code) {
      toast({
        title: 'Missing agent details',
        description: 'User ID, email, province and agent code are required.',
        variant: 'destructive',
      });
      return;
    }

    setSavingAgent(true);

    try {
      const payload = {
        user_id: form.user_id.trim(),
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        email_address: form.email_address.trim().toLowerCase(),
        telephone: cleanInternationalPhone(form.telephone) || null,
        whatsapp: cleanInternationalPhone(form.whatsapp) || null,
        province: form.province,
        agent_code: form.agent_code.trim().toUpperCase(),
        commission_percent: Number(form.commission_percent || 20),
        status: form.status,
      };

      if (form.id) {
        const { error } = await supabase
          .from('agents')
          .update(payload)
          .eq('id', form.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase.rpc('admin_save_agent', {
          p_user_id: payload.user_id,
          p_first_name: payload.first_name,
          p_last_name: payload.last_name,
          p_email_address: payload.email_address,
          p_telephone: payload.telephone,
          p_whatsapp: payload.whatsapp,
          p_province: payload.province,
          p_agent_code: payload.agent_code,
          p_commission_percent: payload.commission_percent,
          p_status: payload.status,
        });

        if (error) throw error;

        if (!data?.ok) {
          throw new Error(data?.error || 'The agent was not saved.');
        }
      }

      toast({
        title: 'Agent saved',
        description: 'Agent details were saved successfully.',
      });

      resetForm();
      await fetchData();
    } catch (error: any) {
      console.error('Failed to save agent:', error);
      toast({
        title: 'Agent save failed',
        description: error?.message || 'Could not save agent details.',
        variant: 'destructive',
      });
    } finally {
      setSavingAgent(false);
    }
  };

  const assignMerchant = async () => {
    if (!selectedMerchantId || !selectedAgentId) {
      toast({
        title: 'Select merchant and agent',
        description: 'Both fields are required before assigning.',
        variant: 'destructive',
      });
      return;
    }

    setAssigningMerchant(true);

    try {
      const { data, error } = await supabase.rpc('admin_assign_merchant_to_agent', {
        p_merchant_id: selectedMerchantId,
        p_agent_id: selectedAgentId,
      });

      if (error) throw error;

      if (!data?.ok) {
        throw new Error(data?.error || 'The merchant was not assigned.');
      }

      toast({
        title: 'Merchant assigned',
        description: 'The merchant was assigned and locked to the selected agent.',
      });

      setSelectedMerchantId('');
      setSelectedAgentId('');
      await fetchData();
    } catch (error: any) {
      console.error('Failed to assign merchant:', error);
      toast({
        title: 'Assignment failed',
        description: error?.message || 'Could not assign merchant to agent.',
        variant: 'destructive',
      });
    } finally {
      setAssigningMerchant(false);
    }
  };

  const calculateCommissions = async () => {
    if (!commissionMonth) return;

    setCalculatingCommission(true);

    try {
      const { error } = await supabase.rpc('calculate_agent_commissions_for_month', {
        p_commission_month: commissionMonth,
      });

      if (error) throw error;

      toast({
        title: 'Commissions calculated',
        description: 'Monthly agent commissions were recalculated.',
      });

      await fetchData();
    } catch (error: any) {
      console.error('Failed to calculate commissions:', error);
      toast({
        title: 'Commission calculation failed',
        description: error?.message || 'Could not calculate commissions.',
        variant: 'destructive',
      });
    } finally {
      setCalculatingCommission(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-6">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agents
            </CardTitle>

            <Button
              type="button"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 text-[#2463EB]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Total Agents</div>
              <div className="text-2xl font-semibold text-gray-900">{agents.length}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Assigned Merchants</div>
              <div className="text-2xl font-semibold text-gray-900">{totalAssignedMerchants}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Pending Commission</div>
              <div className="text-2xl font-semibold text-gray-900">{formatMoney(pendingCommissionTotal)}</div>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600">Paid This Month</div>
              <div className="text-2xl font-semibold text-gray-900">{formatMoney(paidThisMonthTotal)}</div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-4">
            <div className="font-semibold text-gray-900">
              {form.id ? `Edit agent: ${form.first_name || form.email_address || form.agent_code}` : 'Add agent'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>User ID</Label>
                <Input
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                  placeholder="Auth user ID"
                />
              </div>
              <div>
                <Label>First name</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Last name</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={form.email_address}
                  onChange={(e) => setForm({ ...form, email_address: e.target.value })}
                />
              </div>
              <div>
                <Label>Telephone</Label>
                <Input type="tel"
                  value={form.telephone}
                  onChange={(value) => setForm({ ...form, telephone: cleanInternationalPhone(value) })}
                  includeCountryCode
                />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input type="tel"
                  value={form.whatsapp}
                  onChange={(value) => setForm({ ...form, whatsapp: cleanInternationalPhone(value) })}
                  includeCountryCode
                />
              </div>
              <div>
                <Label>Province</Label>
                <select
                  value={form.province}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select province</option>
                  {PROVINCES.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Agent code</Label>
                <Input
                  value={generatingAgentCode ? 'Generating…' : form.agent_code}
                  readOnly
                  placeholder="Auto-generated from province"
                />
              </div>
              <div>
                <Label>Commission %</Label>
                <Input
                  type="number"
                  value={form.commission_percent}
                  onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveAgent} disabled={savingAgent || generatingAgentCode}>
                {savingAgent ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {form.id ? 'Update agent' : 'Save agent'}
              </Button>
              {form.id ? (
                <Button variant="outline" onClick={resetForm} disabled={savingAgent}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-4">
            <div className="font-semibold text-gray-900">Manual merchant assignment</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Unlocked merchant</Label>
                <select
                  value={selectedMerchantId}
                  onChange={(e) => setSelectedMerchantId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select merchant</option>
                  {unlockedMerchants.map((merchant) => (
                    <option key={merchant.id} value={merchant.id}>
                      {merchant.name || merchant.email || merchant.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Agent</Label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {getAgentName(agent)} - {agent.agent_code || 'No code'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={assignMerchant} disabled={assigningMerchant}>
                  {assigningMerchant ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Assign merchant
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 space-y-4">
            <div className="font-semibold text-gray-900">Commission operations</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Commission month</Label>
                <Input
                  type="date"
                  value={commissionMonth}
                  onChange={(e) => setCommissionMonth(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={calculateCommissions} disabled={calculatingCommission}>
                  {calculatingCommission ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Calculate month
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div>
                  <div className="font-semibold text-gray-900">Agents Overview</div>
                  <div className="text-sm text-gray-600">Agent-level status, merchant count and pending commission total.</div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent Name</TableHead>
                        <TableHead>Province</TableHead>
                        <TableHead>Agent Code</TableHead>
                        <TableHead>Agent Status</TableHead>
                        <TableHead>Assigned Merchants</TableHead>
                        <TableHead>Pending Commission</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentPerformance.map(({ agent, assignedMerchantCount, commissionTotal }) => (
                      <TableRow key={agent.id}>
                        <TableCell>{getAgentName(agent)}</TableCell>
                        <TableCell>{agent.province || '—'}</TableCell>
                        <TableCell>{agent.agent_code || '—'}</TableCell>
                        <TableCell>{agent.status || '—'}</TableCell>
                        <TableCell>{assignedMerchantCount}</TableCell>
                        <TableCell>{formatMoney(commissionTotal)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => editAgent(agent)}
                            className="bg-[#2463EB] hover:bg-[#1D4ED8] text-white"
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div>
                  <div className="font-semibold text-gray-900">Merchant Assignments</div>
                  <div className="text-sm text-gray-600">Merchant plan, subscription status and agent assignment lock details.</div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Province</TableHead>
                        <TableHead>Assigned Agent</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Subscription Status</TableHead>
                        <TableHead>Assigned Date</TableHead>
                        <TableHead>Assignment Locked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {merchants.map((merchant) => (
                      <TableRow key={merchant.id}>
                        <TableCell>{merchant.name || merchant.email || '—'}</TableCell>
                        <TableCell>{merchant.province || '—'}</TableCell>
                        <TableCell>{getAgentName(agentMap[merchant.agent_id || ''])}</TableCell>
                        <TableCell>{merchant.subscription_plan_id ? planMap[merchant.subscription_plan_id] || '—' : '—'}</TableCell>
                        <TableCell>{getEffectiveSubscriptionStatus(merchant, subscriptionMap[merchant.id])}</TableCell>
                        <TableCell>{formatDate(merchant.agent_assigned_at)}</TableCell>
                        <TableCell>{merchant.agent_assignment_locked ? 'Yes' : 'No'}</TableCell>
                      </TableRow>
                    ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div>
                  <div className="font-semibold text-gray-900">Commission Payouts</div>
                  <div className="text-sm text-gray-600">Commission amount, payout status and paid date.</div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Commission Amount</TableHead>
                        <TableHead>Payout Status</TableHead>
                        <TableHead>Paid Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((commission, index) => (
                      <TableRow key={commission.id || `${commission.agent_id}-${commission.commission_month}-${index}`}>
                        <TableCell>{formatDate(commission.commission_month)}</TableCell>
                        <TableCell>{getAgentName(agentMap[commission.agent_id || ''])}</TableCell>
                        <TableCell>{formatMoney(getCommissionValue(commission))}</TableCell>
                        <TableCell>{commission.status || '—'}</TableCell>
                        <TableCell>{formatDate(commission.paid_at)}</TableCell>
                      </TableRow>
                    ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAgentsTab;
