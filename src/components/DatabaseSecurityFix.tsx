import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

export const DatabaseSecurityFix: React.FC = () => {
  const [isFixing, setIsFixing] = useState(false);
  const [fixStatus, setFixStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState('');

  const applySecurityFix = async () => {
    setIsFixing(true);
    setErrorMessage('');
    
    try {
      // Fix assign_default_subscription_plan function
      const assignPlanQuery = `
        CREATE OR REPLACE FUNCTION public.assign_default_subscription_plan(user_id uuid)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        BEGIN
          INSERT INTO public.subscriptions (
            user_id,
            plan_name,
            status,
            created_at,
            updated_at
          )
          VALUES (
            user_id,
            'free',
            'active',
            NOW(),
            NOW()
          )
          ON CONFLICT (user_id) DO NOTHING;
        END;
        $$;
      `;
      
      const { error: assignError } = await supabase.rpc('exec_sql', { sql: assignPlanQuery });
      if (assignError) throw assignError;
      
      // Fix increment_promo_usage function
      const promoQuery = `
        CREATE OR REPLACE FUNCTION public.increment_promo_usage(promo_code text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        BEGIN
          UPDATE public.promo_codes
          SET usage_count = COALESCE(usage_count, 0) + 1,
              updated_at = NOW()
          WHERE code = promo_code
            AND (max_usage IS NULL OR COALESCE(usage_count, 0) < max_usage)
            AND (expires_at IS NULL OR expires_at > NOW())
            AND is_active = true;
        END;
        $$;
      `;
      
      const { error: promoError } = await supabase.rpc('exec_sql', { sql: promoQuery });
      if (promoError) throw promoError;
      
      setFixStatus('success');
      toast({
        title: 'Security Fix Applied',
        description: 'Database functions updated with secure search_path settings'
      });
      
    } catch (error: any) {
      console.error('Security fix error:', error);
      setFixStatus('error');
      setErrorMessage(error.message || 'Failed to apply security fix');
      toast({
        title: 'Security Fix Failed',
        description: error.message || 'Failed to apply security fix',
        variant: 'destructive'
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Database Security Fix
        </CardTitle>
        <CardDescription>
          Apply security fixes to Postgres functions to prevent search_path injection risks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This will update the following functions with secure search_path settings:
            <ul className="mt-2 ml-4 list-disc">
              <li>public.assign_default_subscription_plan</li>
              <li>public.increment_promo_usage</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        {fixStatus === 'success' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-600">
              Security fix applied successfully! Functions now use immutable search_path.
            </AlertDescription>
          </Alert>
        )}
        
        {fixStatus === 'error' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Error applying security fix: {errorMessage}
            </AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={applySecurityFix}
          disabled={isFixing || fixStatus === 'success'}
          className="w-full"
        >
          {isFixing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {fixStatus === 'success' ? 'Security Fix Applied' : 'Apply Security Fix'}
        </Button>
      </CardContent>
    </Card>
  );
};
