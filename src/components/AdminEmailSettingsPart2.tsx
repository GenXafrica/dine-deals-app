import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Mail, Users, Shield, RefreshCw } from 'lucide-react';
import { saveTemplate } from './AdminEmailSettingsPart2Functions';
import SMTPTestPanel from './SMTPTestPanel';
import { toast } from '@/hooks/use-toast';

interface EmailTemplate {
  id?: string;
  type: string;
  subject: string;
  content: string;
}

const defaultTemplates = {
  welcome: {
    type: 'welcome',
    subject: 'Welcome to Dine Deals – Great Savings Await!',
    content: `Hello {{customer_name}},\n\nWelcome to Dine Deals! We're excited to have you join our community of food lovers.\n\nYour account has been successfully created on {{signup_date}}.\n\nStart exploring amazing deals from local restaurants and enjoy great savings on your favorite meals.\n\nBest regards,\nThe Dine Deals Team`
  },
  verification: {
    type: 'verification',
    subject: 'Please Verify Your Email Address',
    content: `Hello {{user_name}},\n\nPlease verify your email address by clicking the link below:\n\n{{verification_link}}\n\nIf you didn't create this account, please ignore this email.\n\nBest regards,\nThe Dine Deals Team`
  },
  merchant_welcome: {
    type: 'merchant_welcome',
    subject: 'Welcome to Dine Deals – Let’s Grow Your Restaurant',
    content: `Hello {{merchant_name}},\n\nWelcome to Dine Deals! Your merchant account has been successfully created.\n\nYou can now start creating deals for {{restaurant_name}} and reach more customers.\n\nAccount created on: {{signup_date}}\n\nBest regards,\nThe Dine Deals Team`
  }
};

export default function AdminEmailSettingsPart2() {
  const [welcomeTemplate, setWelcomeTemplate] = useState<EmailTemplate>(defaultTemplates.welcome);
  const [verificationTemplate, setVerificationTemplate] = useState<EmailTemplate>(defaultTemplates.verification);
  const [merchantTemplate, setMerchantTemplate] = useState<EmailTemplate>(defaultTemplates.merchant_welcome);
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [resendingTemplate, setResendingTemplate] = useState<string | null>(null);
  const [testEmails, setTestEmails] = useState({
    welcome: '',
    verification: '',
    merchant: ''
  });

  const fetchTemplates = async () => {
    try {
      setLoading(true);

      console.log('Fetching templates from database...');

      // IMPORTANT: only use the new types
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .in('type', ['customer_welcome', 'verification', 'merchant_welcome'])
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching templates:', error);
        toast({
          title: 'Error',
          description: 'Failed to load email templates',
          variant: 'destructive'
        });
        return;
      }

      console.log('Fetched templates:', data);

      if (data && data.length > 0) {
        data.forEach((template) => {
          console.log('Processing template:', template.type, template.subject);
          switch (template.type) {
            case 'customer_welcome':
              setWelcomeTemplate({
                id: template.id,
                type: 'welcome', // local UI label
                subject: template.subject,
                content: template.content
              });
              break;
            case 'verification':
              setVerificationTemplate({
                id: template.id,
                type: 'verification',
                subject: template.subject,
                content: template.content
              });
              break;
            case 'merchant_welcome':
              setMerchantTemplate({
                id: template.id,
                type: 'merchant_welcome',
                subject: template.subject,
                content: template.content
              });
              break;
          }
        });
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTemplates();
    setRefreshing(false);
  };

  const resendTemplateEmail = async (templateType: string, template: EmailTemplate) => {
    setResendingTemplate(templateType);
    try {
      let functionName = '';
      let emailData: any = {};
      let testEmail = '';

      if (templateType === 'customer_welcome') {
        functionName = 'send-customer-welcome-email';
        testEmail = testEmails.welcome || 'test@example.com';
        emailData = {
          email: testEmail,
          customer_name: 'Test Customer',
          signup_date: new Date().toLocaleDateString()
        };
      } else if (templateType === 'merchant_welcome') {
        functionName = 'send-merchant-welcome-email';
        testEmail = testEmails.merchant || 'test@example.com';
        emailData = {
          email: testEmail,
          merchant_name: 'Test Merchant',
          restaurant_name: 'Test Restaurant',
          signup_date: new Date().toLocaleDateString()
        };
      } else if (templateType === 'email_verification') {
        functionName = 'send-verification-email';
        testEmail = testEmails.verification || 'test@example.com';
        const verificationLink = `${window.location.origin}/verify-email?token=test-token&email=${encodeURIComponent(
          testEmail
        )}`;
        emailData = {
          email: testEmail,
          full_name: 'Test User',
          verificationLink: verificationLink
        };
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: emailData
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Success',
        description: `${templateType.replace('_', ' ')} email sent to ${testEmail}`
      });
    } catch (error: any) {
      console.error('Resend email error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to send email',
        variant: 'destructive'
      });
    } finally {
      setResendingTemplate(null);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto mb-2" />
          <p className="text-sm text-gray-700">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SMTPTestPanel
        welcomeTemplate={welcomeTemplate}
        verificationTemplate={verificationTemplate}
      />

      <Card className="bg-white/90 backdrop-blur-sm border-orange-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-red-600" />
              <CardTitle className="text-gray-800 text-sm">Email Templates</CardTitle>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              {refreshing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
            </Button>
          </div>
          <CardDescription className="text-xs text-gray-600">
            Customize email templates for different user actions
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="welcome" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="welcome" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                Welcome
              </TabsTrigger>
              <TabsTrigger value="verification" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Verification
              </TabsTrigger>
              <TabsTrigger value="merchant" className="text-xs">
                <Mail className="w-3 h-3 mr-1" />
                Merchant
              </TabsTrigger>
            </TabsList>

            <TabsContent value="welcome" className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label htmlFor="welcome-subject" className="text-xs text-gray-700">
                  Subject
                </Label>
                <Input
                  id="welcome-subject"
                  value={welcomeTemplate.subject}
                  onChange={(e) =>
                    setWelcomeTemplate((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  className="border-orange-200 focus:border-red-500 text-xs h-8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="welcome-content" className="text-xs text-gray-700">
                  Content
                </Label>
                <Textarea
                  id="welcome-content"
                  value={welcomeTemplate.content}
                  onChange={(e) =>
                    setWelcomeTemplate((prev) => ({ ...prev, content: e.target.value }))
                  }
                  className="border-orange-200 focus:border-red-500 text-xs min-h-[120px]"
                  placeholder="Use {{customer_name}}, {{signup_date}} as placeholders"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <div className="flex-1">
                  <Label
                    htmlFor="welcome-test-email"
                    className="text-xs text-gray-700 font-medium"
                  >
                    Send to:
                  </Label>
                  <Input
                    id="welcome-test-email"
                    placeholder="test@example.com"
                    value={testEmails.welcome}
                    onChange={(e) =>
                      setTestEmails({ ...testEmails, welcome: e.target.value })
                    }
                    className="border-orange-200 focus:border-red-500 text-xs h-8 mt-1"
                  />
                </div>
                <Button
                  onClick={() => resendTemplateEmail('customer_welcome', welcomeTemplate)}
                  disabled={resendingTemplate === 'customer_welcome'}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:mb-0"
                >
                  {resendingTemplate === 'customer_welcome' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-3 h-3 mr-1" />
                      Resend
                    </>
                  )}
                </Button>
              </div>
              <div>
                <Button
                  onClick={() =>
                    saveTemplate(
                      'welcome',
                      welcomeTemplate.content,
                      welcomeTemplate,
                      setSavingTemplate,
                      setWelcomeTemplate
                    )
                  }
                  disabled={savingTemplate === 'welcome'}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {savingTemplate === 'welcome' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3 mr-1" />
                      Save Template
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="verification" className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label htmlFor="verification-subject" className="text-xs text-gray-700">
                  Subject
                </Label>
                <Input
                  id="verification-subject"
                  value={verificationTemplate.subject}
                  onChange={(e) =>
                    setVerificationTemplate((prev) => ({
                      ...prev,
                      subject: e.target.value
                    }))
                  }
                  className="border-orange-200 focus:border-red-500 text-xs h-8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="verification-content" className="text-xs text-gray-700">
                  Content
                </Label>
                <Textarea
                  id="verification-content"
                  value={verificationTemplate.content}
                  onChange={(e) =>
                    setVerificationTemplate((prev) => ({
                      ...prev,
                      content: e.target.value
                    }))
                  }
                  className="border-orange-200 focus:border-red-500 text-xs min-h-[120px]"
                  placeholder="Use {{user_name}}, {{verification_link}} as placeholders"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <div className="flex-1">
                  <Label
                    htmlFor="verification-test-email"
                    className="text-xs text-gray-700 font-medium"
                  >
                    Send to:
                  </Label>
                  <Input
                    id="verification-test-email"
                    placeholder="test@example.com"
                    value={testEmails.verification}
                    onChange={(e) =>
                      setTestEmails({ ...testEmails, verification: e.target.value })
                    }
                    className="border-orange-200 focus:border-red-500 text-xs h-8 mt-1"
                  />
                </div>
                <Button
                  onClick={() => resendTemplateEmail('email_verification', verificationTemplate)}
                  disabled={resendingTemplate === 'email_verification'}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:mb-0"
                >
                  {resendingTemplate === 'email_verification' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-3 h-3 mr-1" />
                      Resend
                    </>
                  )}
                </Button>
              </div>
              <div>
                <Button
                  onClick={() =>
                    saveTemplate(
                      'verification',
                      verificationTemplate.content,
                      verificationTemplate,
                      setSavingTemplate,
                      setVerificationTemplate
                    )
                  }
                  disabled={savingTemplate === 'verification'}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {savingTemplate === 'verification' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3 mr-1" />
                      Save Template
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="merchant" className="space-y-3 mt-4">
              <div className="space-y-2">
                <Label htmlFor="merchant-subject" className="text-xs text-gray-700">
                  Subject
                </Label>
                <Input
                  id="merchant-subject"
                  value={merchantTemplate.subject}
                  onChange={(e) =>
                    setMerchantTemplate((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  className="border-orange-200 focus:border-red-500 text-xs h-8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="merchant-content" className="text-xs text-gray-700">
                  Content
                </Label>
                <Textarea
                  id="merchant-content"
                  value={merchantTemplate.content}
                  onChange={(e) =>
                    setMerchantTemplate((prev) => ({ ...prev, content: e.target.value }))
                  }
                  className="border-orange-200 focus:border-red-500 text-xs min-h-[120px]"
                  placeholder="Use {{merchant_name}}, {{restaurant_name}}, {{signup_date}} as placeholders"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                <div className="flex-1">
                  <Label
                    htmlFor="merchant-test-email"
                    className="text-xs text-gray-700 font-medium"
                  >
                    Send to:
                  </Label>
                  <Input
                    id="merchant-test-email"
                    placeholder="test@example.com"
                    value={testEmails.merchant}
                    onChange={(e) =>
                      setTestEmails({ ...testEmails, merchant: e.target.value })
                    }
                    className="border-orange-200 focus:border-red-500 text-xs h-8 mt-1"
                  />
                </div>
                <Button
                  onClick={() => resendTemplateEmail('merchant_welcome', merchantTemplate)}
                  disabled={resendingTemplate === 'merchant_welcome'}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:mb-0"
                >
                  {resendingTemplate === 'merchant_welcome' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-3 h-3 mr-1" />
                      Resend
                    </>
                  )}
                </Button>
              </div>
              <div>
                <Button
                  onClick={() =>
                    saveTemplate(
                      'merchant_welcome',
                      merchantTemplate.content,
                      merchantTemplate,
                      setSavingTemplate,
                      setMerchantTemplate
                    )
                  }
                  disabled={savingTemplate === 'merchant_welcome'}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {savingTemplate === 'merchant_welcome' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3 mr-1" />
                      Save Template
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
