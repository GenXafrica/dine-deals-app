import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Loader2, Send } from 'lucide-react';
import { saveTemplate } from './AdminEmailSettingsPart2Functions';
import { adminFunctionInvoke } from '@/lib/adminRpc';
import { toast } from '@/hooks/use-toast';


interface EmailTemplate {
  id?: string;
  type: string;
  subject: string;
  content: string;
}

interface EmailTemplatesProps {
  customerTemplate: EmailTemplate;
  setCustomerTemplate: (template: EmailTemplate) => void;
  merchantTemplate: EmailTemplate;
  setMerchantTemplate: (template: EmailTemplate) => void;
  savingTemplate: string | null;
  setSavingTemplate: (template: string | null) => void;
}

const AdminEmailSettingsTemplates: React.FC<EmailTemplatesProps> = ({
  customerTemplate,
  setCustomerTemplate,
  merchantTemplate,
  setMerchantTemplate,
  savingTemplate,
  setSavingTemplate
}) => {
  const [resendingTemplate, setResendingTemplate] = useState<string | null>(null);
  const [testEmails, setTestEmails] = useState({
    customer: '',
    merchant: ''
  });

  const resendTemplateEmail = async (templateType: string, template: EmailTemplate) => {
    const testEmail = testEmails[templateType as keyof typeof testEmails];

    if (!testEmail || testEmail.trim() === '') {
      toast({
        title: 'EMAIL ADDRESS REQUIRED',
        description: 'Please enter an email address in the "Send to:" field before sending the test email',
        variant: 'destructive'
      });
      return;
    }

    setResendingTemplate(templateType);
    try {
      let functionName = '';
      let emailData = {};

      if (templateType === 'customer') {
        functionName = 'send-customer-welcome-email';
        emailData = {
          email: testEmail,
          customer_name: 'Test Customer',
          signup_date: new Date().toLocaleDateString()
        };
      } else if (templateType === 'merchant') {
        functionName = 'send-merchant-welcome-email';
        emailData = {
          email: testEmail,
          merchant_name: 'Test Merchant',
          restaurant_name: 'Test Restaurant',
          signup_date: new Date().toLocaleDateString()
        };
      }

      const response = await adminFunctionInvoke(functionName, emailData);

      if (!response) throw new Error('Not authorized or session expired');

      toast({
        title: 'Email Sent Successfully',
        description: `Test email sent to ${testEmail}`
      });
    } catch (error: any) {
      console.error('Resend error:', error);
      toast({
        title: 'Error Sending Email',
        description: error?.message || 'Failed to send email',
        variant: 'destructive'
      });
    } finally {
      setResendingTemplate(null);
    }
  };


  const renderCard = (
    label: string,
    color: string,
    templateType: 'customer' | 'merchant',
    template: EmailTemplate,
    setTemplate: (t: EmailTemplate) => void
  ) => (
    <Card className="email-card border border-gray-300 shadow-lg bg-white/95 backdrop-blur-sm">
      <CardHeader className={`bg-gradient-to-r from-${color}-50 to-${color}-100 pb-3`}>
        <CardTitle className={`text-lg font-semibold text-${color}-800 flex items-center gap-2`}>
          <Mail className="w-5 h-5" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <div className="form-row">
          <Label className="text-sm font-medium text-gray-700">Subject Line</Label>
          <Input
            className="mt-1"
            value={template.subject}
            onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
          />
        </div>
        <div className="form-row">
          <Label className="text-sm font-medium text-gray-700">Email Content</Label>
          <Textarea
            className="mt-1"
            value={template.content}
            onChange={(e) => setTemplate({ ...template, content: e.target.value })}
            rows={6}
          />
        </div>

        <div className="space-y-3 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <div className="form-row">
            <Label className="text-sm font-medium text-yellow-800">Test Email:</Label>
            <Input
              type="email"
              value={testEmails[templateType]}
              onChange={(e) => setTestEmails((prev) => ({ ...prev, [templateType]: e.target.value }))}
              placeholder="test@example.com"
              className="border-yellow-300"
            />
          </div>
          <Button 
            onClick={() => resendTemplateEmail(templateType, template)} 
            disabled={resendingTemplate === templateType}
            variant="destructive" 
            size="sm" 
            className="w-full"
          >
            {resendingTemplate === templateType ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />Send Test</>
            )}
          </Button>
        </div>

        <div className="form-actions">
          <Button
            onClick={() => saveTemplate(templateType, template.content, template, setSavingTemplate, setTemplate)}
            disabled={savingTemplate === templateType}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            {savingTemplate === templateType ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full space-y-6">
      {renderCard(
        'Customer Welcome Email',
        'blue',
        'customer',
        customerTemplate,
        setCustomerTemplate
      )}
      {renderCard(
        'Merchant Welcome Email',
        'green',
        'merchant',
        merchantTemplate,
        setMerchantTemplate
      )}
    </div>
  );
};

export default AdminEmailSettingsTemplates;
