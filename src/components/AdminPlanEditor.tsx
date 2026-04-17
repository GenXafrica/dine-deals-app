import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  deal_limit: number;
  monthly_price_cents: number;
  yearly_price_cents: number;
  features: string[];
  is_recommended: boolean;
  is_active: boolean;
  display_order: number;
}

export const AdminPlanEditor: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription plans',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async (plan: SubscriptionPlan) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          name: plan.name,
          deal_limit: plan.deal_limit,
          monthly_price_cents: plan.monthly_price_cents,
          yearly_price_cents: plan.yearly_price_cents,
          features: plan.features,
          is_recommended: plan.is_recommended,
          is_active: plan.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', plan.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Plan updated successfully'
      });

      setEditingPlan(null);
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to save plan',
        variant: 'destructive'
      });
    }
  };

  const formatPrice = (cents: number) => {
    return `R${(cents / 100).toFixed(0)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Plan Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading plans...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Subscription Plan Editor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {plans.map((plan) => (
          <div key={plan.id} className="border rounded-lg p-4">
            {editingPlan?.id === plan.id ? (
              <EditPlanForm
                plan={editingPlan}
                onSave={savePlan}
                onCancel={() => setEditingPlan(null)}
                onChange={setEditingPlan}
              />
            ) : (
              <PlanDisplay
                plan={plan}
                onEdit={() => setEditingPlan(plan)}
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

interface PlanDisplayProps {
  plan: SubscriptionPlan;
  onEdit: () => void;
}

const PlanDisplay: React.FC<PlanDisplayProps> = ({ plan, onEdit }) => {
  const formatPrice = (cents: number) => `R${(cents / 100).toFixed(0)}`;

  return (
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{plan.name}</h3>
          {plan.is_recommended && (
            <Badge className="bg-blue-500">Recommended</Badge>
          )}
          {!plan.is_active && (
            <Badge variant="secondary">Inactive</Badge>
          )}
        </div>
        <p className="text-sm text-gray-600">
          {plan.deal_limit} deals • {formatPrice(plan.monthly_price_cents)}/month • {formatPrice(plan.yearly_price_cents)}/year
        </p>
        <div className="text-sm">
          <strong>Features:</strong>
          <ul className="list-disc list-inside ml-2">
            {plan.features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </div>
      </div>
      <Button size="sm" onClick={onEdit}>
        <Edit className="h-4 w-4" />
      </Button>
    </div>
  );
};

interface EditPlanFormProps {
  plan: SubscriptionPlan;
  onSave: (plan: SubscriptionPlan) => void;
  onCancel: () => void;
  onChange: (plan: SubscriptionPlan) => void;
}

const EditPlanForm: React.FC<EditPlanFormProps> = ({ plan, onSave, onCancel, onChange }) => {
  const [featuresText, setFeaturesText] = useState(plan.features.join('\n'));

  const handleSave = () => {
    const updatedPlan = {
      ...plan,
      features: featuresText.split('\n').filter(f => f.trim())
    };
    onSave(updatedPlan);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Plan Name</Label>
          <Input
            value={plan.name}
            onChange={(e) => onChange({ ...plan, name: e.target.value })}
          />
        </div>
        <div>
          <Label>Deal Limit</Label>
          <Input
            type="number"
            value={plan.deal_limit}
            onChange={(e) => onChange({ ...plan, deal_limit: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Monthly Price (cents)</Label>
          <Input
            type="number"
            value={plan.monthly_price_cents}
            onChange={(e) => onChange({ ...plan, monthly_price_cents: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>Yearly Price (cents)</Label>
          <Input
            type="number"
            value={plan.yearly_price_cents}
            onChange={(e) => onChange({ ...plan, yearly_price_cents: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div>
        <Label>Features (one per line)</Label>
        <Textarea
          value={featuresText}
          onChange={(e) => setFeaturesText(e.target.value)}
          rows={4}
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={plan.is_recommended}
            onCheckedChange={(checked) => onChange({ ...plan, is_recommended: checked })}
          />
          <Label>Recommended</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={plan.is_active}
            onCheckedChange={(checked) => onChange({ ...plan, is_active: checked })}
          />
          <Label>Active</Label>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
};