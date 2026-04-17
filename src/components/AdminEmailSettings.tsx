// src/components/AdminEmailSettings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

interface EmailTemplate {
  id?: string;
  type: string;
  subject: string;
  content: string;
}

async function waitForSession(maxMs = 5000): Promise<any | null> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const { data } = await supabase.auth.getSession();
    if (data?.session) return data.session;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

const AdminEmailSettings: React.FC = () => {
  const [customerTemplate, setCustomerTemplate] = useState<EmailTemplate>({
    type: 'customer_welcome',
    subject: '',
    content: '',
  });

  const [merchantTemplate, setMerchantTemplate] = useState<EmailTemplate>({
    type: 'merchant_welcome',
    subject: '',
    content: '',
  });

  const [verificationTemplate, setVerificationTemplate] = useState<EmailTemplate>({
    type: 'verification',
    subject: '',
    content: '',
  });

  const [promo30, setPromo30] = useState<EmailTemplate>({
    type: 'promo_warn_30',
    subject: '',
    content: '',
  });

  const [promo15, setPromo15] = useState<EmailTemplate>({
    type: 'promo_warn_15',
    subject: '',
    content: '',
  });

  const [promo2, setPromo2] = useState<EmailTemplate>({
    type: 'promo_warn_02',
    subject: '',
    content: '',
  });

  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: templates, error } = await supabase
        .from('email_templates')
        .select('*');

      if (error) throw error;

      if (templates) {
        templates.forEach((t: any) => {
          const mapped = {
            id: t.id,
            type: t.type,
            subject: t.subject || '',
            content: t.content || '',
          };

          switch (t.type) {
            case 'customer_welcome':
              setCustomerTemplate(mapped);
              break;

            case 'merchant_welcome':
              setMerchantTemplate(mapped);
              break;

            case 'verification':
              setVerificationTemplate(mapped);
              break;

            case 'promo_warn_30':
              setPromo30(mapped);
              break;

            case 'promo_warn_15':
              setPromo15(mapped);
              break;

            case 'promo_warn_02':
              setPromo2(mapped);
              break;
          }
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const saveTemplate = async (template: EmailTemplate) => {
    setSavingTemplate(template.type);

    try {
      const session = await waitForSession();
      if (!session) throw new Error('Not signed in');

      const { error } = await supabase.from('email_templates').upsert([
        {
          id: template.id,
          type: template.type,
          subject: template.subject,
          content: template.content,
          enabled: true,
          updated_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      toast({
        title: 'Saved',
        description: 'Template updated',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err?.message || 'Save failed',
        variant: 'destructive',
      });
    } finally {
      setSavingTemplate(null);
    }
  };

  const renderCard = (title: string, template: EmailTemplate) => (
    <Card key={template.type} className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-gray-800">
          <Mail className="w-5 h-5 text-blue-600" />
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-6">
        <div>
          <Label className="text-sm font-medium text-gray-700">Subject</Label>
          <Input
            value={template.subject}
            onChange={(e) => {
              const value = e.target.value;

              switch (template.type) {
                case 'customer_welcome':
                  setCustomerTemplate({ ...template, subject: value });
                  break;
                case 'merchant_welcome':
                  setMerchantTemplate({ ...template, subject: value });
                  break;
                case 'verification':
                  setVerificationTemplate({ ...template, subject: value });
                  break;
                case 'promo_warn_30':
                  setPromo30({ ...template, subject: value });
                  break;
                case 'promo_warn_15':
                  setPromo15({ ...template, subject: value });
                  break;
                case 'promo_warn_02':
                  setPromo2({ ...template, subject: value });
                  break;
              }
            }}
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700">Content</Label>
          <Textarea
            value={template.content}
            onChange={(e) => {
              const value = e.target.value;

              switch (template.type) {
                case 'customer_welcome':
                  setCustomerTemplate({ ...template, content: value });
                  break;
                case 'merchant_welcome':
                  setMerchantTemplate({ ...template, content: value });
                  break;
                case 'verification':
                  setVerificationTemplate({ ...template, content: value });
                  break;
                case 'promo_warn_30':
                  setPromo30({ ...template, content: value });
                  break;
                case 'promo_warn_15':
                  setPromo15({ ...template, content: value });
                  break;
                case 'promo_warn_02':
                  setPromo2({ ...template, content: value });
                  break;
              }
            }}
            rows={6}
          />
        </div>

        <Button
          onClick={() => saveTemplate(template)}
          disabled={savingTemplate === template.type}
          className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {savingTemplate === template.type ? 'Saving...' : 'Save Template'}
        </Button>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading emails...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-gray-50 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Emails</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderCard('Customer Welcome', customerTemplate)}
          {renderCard('Merchant Welcome', merchantTemplate)}
          {renderCard('Email Verification (no sync)', verificationTemplate)}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Promo Emails</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderCard('Promo: 30 days left', promo30)}
          {renderCard('Promo: 15 days left', promo15)}
          {renderCard('Promo: final notice (2 days left)', promo2)}
        </div>
      </div>
    </div>
  );
};

export default AdminEmailSettings;