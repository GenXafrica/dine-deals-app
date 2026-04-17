import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { Mail, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentConfirmationEmailProps {
  userId: string;
  tier: string;
  billingCycle: string;
  amountPaid: number;
  renewalDate: string;
}

export const PaymentConfirmationEmail: React.FC<PaymentConfirmationEmailProps> = ({
  userId,
  tier,
  billingCycle,
  amountPaid,
  renewalDate
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const { toast } = useToast();

  const sendConfirmationEmail = async (email?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-payment-confirmation', {
        body: {
          userId,
          tier,
          billingCycle,
          amountPaid,
          renewalDate,
          testEmail: email
        }
      });

      if (error) throw error;

      toast({
        title: 'Email Sent',
        description: 'Payment confirmation email sent successfully!',
      });
    } catch (error) {
      console.error('Email error:', error);
      toast({
        title: 'Email Failed',
        description: 'Failed to send confirmation email.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestEmail = () => {
    if (!testEmail) {
      toast({
        title: 'Email Required',
        description: 'Please enter an email address.',
        variant: 'destructive'
      });
      return;
    }
    sendConfirmationEmail(testEmail);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Payment Confirmation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Email Details</h3>
          <p><strong>Plan:</strong> {tier}</p>
          <p><strong>Amount:</strong> R{amountPaid}</p>
          <p><strong>Billing:</strong> {billingCycle}</p>
          <p><strong>Next Renewal:</strong> {new Date(renewalDate).toLocaleDateString()}</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="test-email">Send Test Email</Label>
          <div className="flex gap-2">
            <Input
              id="test-email"
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <Button 
              onClick={sendTestEmail} 
              disabled={isLoading}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Button 
          onClick={() => sendConfirmationEmail()} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Sending...' : 'Resend Confirmation'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PaymentConfirmationEmail;