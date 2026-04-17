import { supabase } from '@/lib/supabase';
import { adminFunctionInvoke } from '@/lib/adminRpc';
import { toast } from '@/hooks/use-toast';

interface EmailTemplate {
  id?: string;
  type: string;
  subject: string;
  content: string;
}

export const saveTemplate = async (
  type: string,
  content: string,
  template: EmailTemplate,
  setSavingTemplate: (value: string | null) => void,
  setTemplate: (template: EmailTemplate) => void
) => {
  setSavingTemplate(type);

  try {
    // NEW: map everything to the *correct* final DB types
    const typeMapping: Record<string, string> = {
      welcome: 'customer_welcome',
      customer_welcome: 'customer_welcome',
      merchant_welcome: 'merchant_welcome',
      verification: 'verification',
      email_verification: 'verification'
    };

    const dbType = typeMapping[type] || type;

    const templateData = {
      type: dbType,
      subject: template.subject,
      content: template.content,
      updated_at: new Date().toISOString()
    };

    console.log('Saving template:', { type, dbType, templateData });

    // NEW: upsert so "synchronize" always creates/updates the right row
    const { data, error } = await supabase
      .from('email_templates')
      .upsert(templateData, { onConflict: 'type' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Template saved successfully:', data);

    if (data) {
      setTemplate({
        ...template,
        id: data.id,
        type: data.type,
        subject: data.subject,
        content: data.content
      });
    }

    toast({
      title: 'Success',
      description: `${dbType.replace('_', ' ')} template saved successfully`
    });
  } catch (error: any) {
    console.error('Template save error:', error);
    toast({
      title: 'Error',
      description: error?.message || 'Failed to save template',
      variant: 'destructive'
    });
  } finally {
    setSavingTemplate(null);
  }
};

export const testSMTPConnection = async () => {
  try {
    const data = await adminFunctionInvoke('test-raw-smtp');
    if (!data) throw new Error('Not authorized or session expired');
    return data;
  } catch (error: any) {
    console.error('SMTP test error:', error);
    throw new Error(error.message || 'SMTP connection test failed');
  }
};

export const sendTestEmail = async (to: string, subject: string, html: string, text?: string) => {
  try {
    const data = await adminFunctionInvoke('send-smtp-email', {
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    });

    if (!data) throw new Error('Not authorized or session expired');
    return data;
  } catch (error: any) {
    console.error('Send email error:', error);
    throw new Error(error.message || 'Failed to send test email');
  }
};
