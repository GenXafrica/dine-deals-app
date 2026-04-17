import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { adminFunctionInvoke } from '@/lib/adminRpc';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, Store, Mail, Eye, EyeOff, Send } from 'lucide-react';


interface EmailTemplate {
  id: string;
  type: string;
  subject: string;
  content: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminEmailSettingsMerchantProps {
  template: EmailTemplate | null;
  onUpdate: (template: EmailTemplate) => void;
  onRefresh: () => void;
}

export default function AdminEmailSettingsMerchant({
  template,
  onUpdate,
  onRefresh
}: AdminEmailSettingsMerchantProps) {
  const [subject, setSubject] = useState(template?.subject || '');
  const [content, setContent] = useState(template?.content || '');
  const [enabled, setEnabled] = useState(template?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sendTo, setSendTo] = useState('');

  const handleSave = async () => {
    try {
      setSaving(true);
      const now = new Date().toISOString();
      const templateData = {
        // IMPORTANT: match Supabase row key for merchant welcome
        type: 'merchant_welcome',
        subject: subject.trim(),
        content: content.trim(),
        enabled
      };

      const { data, error } = template?.id
        ? await supabase
            .from('email_templates')
            .update({ ...templateData, updated_at: now })
            .eq('id', template.id)
            .select()
            .maybeSingle()
        : await supabase
            .from('email_templates')
            .insert({ ...templateData, created_at: now, updated_at: now })
            .select()
            .maybeSingle();

      if (error) throw error;
      onUpdate(data);
      toast({ title: 'Saved', description: 'Template saved successfully.' });
      onRefresh();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async () => {
    if (!sendTo || !sendTo.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Enter a valid email before resending.',
        variant: 'destructive'
      });
      return;
    }

    const response = await adminFunctionInvoke('send-merchant-welcome-email', {
      email: sendTo,
      merchant_name: 'Test Merchant',
      restaurant_name: 'Test Restaurant',
      signup_date: new Date().toLocaleDateString()
    });

    if (!response) {
      toast({ title: 'Error Sending', description: 'Not authorized or session expired', variant: 'destructive' });
    } else {
      toast({ title: 'Email Sent', description: `Sent to ${sendTo}` });
    }
  };


  const previewHTML = content
    .replace(/{{name}}/g, 'John Smith')
    .replace(/{{restaurant_name}}/g, 'Bella Vista')
    .replace(/\n/g, '<br />');

  return (
    <Card className="border border-green-300 shadow-sm">
      <CardHeader className="bg-green-50 pb-3">
        <CardTitle className="text-md font-semibold text-green-800">
          Merchant Welcome Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} />
            <Label htmlFor="enabled">Enabled</Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Subject</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label>Content</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Available tags: {{name}}, {{restaurant_name}}
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-400 rounded-md p-3">
          <Label className="text-sm font-semibold text-yellow-900 block mb-1">Send to:</Label>
          <Input
            type="email"
            placeholder="test@example.com"
            value={sendTo}
            onChange={(e) => setSendTo(e.target.value)}
            className="text-sm border border-yellow-400 mb-2"
          />
          <Button onClick={handleResend} variant="destructive" size="sm" className="w-full">
            <Send className="w-4 h-4 mr-2" />
            Resend
          </Button>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !subject.trim() || !content.trim()}
          className="w-full bg-green-600 hover:bg-green-700"
          size="sm"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Template'}
        </Button>

        {showPreview && (
          <div className="bg-gray-50 p-4 border rounded">
            <div className="mb-2">
              <strong>Subject:</strong> {subject}
            </div>
            <Separator className="my-2" />
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHTML }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
