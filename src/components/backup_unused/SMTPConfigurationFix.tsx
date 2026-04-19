import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Settings, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SMTPConfigurationFixProps {
  currentConfig: any;
  onConfigUpdated: () => void;
}

const SMTPConfigurationFix: React.FC<SMTPConfigurationFixProps> = ({ currentConfig, onConfigUpdated }) => {
  const [config, setConfig] = useState({
    host: currentConfig?.host || '',
    port: currentConfig?.port || 587,
    username: currentConfig?.username || '',
    password: currentConfig?.password || '',
    ssl: currentConfig?.ssl || true,
    from_email: currentConfig?.from_email || '',
    from_name: currentConfig?.from_name || 'DealsAfrica'
  });
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<any>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    
    try {
      const { error } = await supabase
        .from('smtp_config')
        .upsert({
          id: 1,
          ...config,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSaveResult({ success: true, message: 'SMTP configuration updated successfully!' });
      onConfigUpdated();
    } catch (error) {
      setSaveResult({ success: false, message: `Failed to update configuration: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const getProviderSettings = (email: string) => {
    const domain = email.toLowerCase();
    if (domain.includes('gmail')) {
      return { host: 'smtp.gmail.com', port: 587, ssl: true };
    } else if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) {
      return { host: 'smtp-mail.outlook.com', port: 587, ssl: true };
    } else if (domain.includes('yahoo')) {
      return { host: 'smtp.mail.yahoo.com', port: 587, ssl: true };
    }
    return null;
  };

  const applyProviderSettings = () => {
    const settings = getProviderSettings(config.username);
    if (settings) {
      setConfig(prev => ({ ...prev, ...settings }));
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Fix SMTP Configuration
        </CardTitle>
        <CardDescription>
          Update your SMTP settings to resolve email delivery issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="host">SMTP Host</Label>
            <Input
              id="host"
              value={config.host}
              onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
              placeholder="smtp.gmail.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              value={config.port}
              onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
              placeholder="587"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username (Email)</Label>
          <Input
            id="username"
            type="email"
            value={config.username}
            onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
            placeholder="your-email@gmail.com"
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={applyProviderSettings}
            disabled={!config.username}
          >
            Auto-detect Provider Settings
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password (App Password recommended)</Label>
          <Input
            id="password"
            type="password"
            value={config.password}
            onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Your app password"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="ssl"
            checked={config.ssl}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, ssl: checked }))}
          />
          <Label htmlFor="ssl">Enable SSL/TLS (Recommended)</Label>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="from_email">From Email</Label>
            <Input
              id="from_email"
              type="email"
              value={config.from_email}
              onChange={(e) => setConfig(prev => ({ ...prev, from_email: e.target.value }))}
              placeholder="noreply@yourdomain.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="from_name">From Name</Label>
            <Input
              id="from_name"
              value={config.from_name}
              onChange={(e) => setConfig(prev => ({ ...prev, from_name: e.target.value }))}
              placeholder="DealsAfrica"
            />
          </div>
        </div>

        {saveResult && (
          <Alert className={saveResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {saveResult.success ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            <AlertDescription>{saveResult.message}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Save Configuration</>
          )}
        </Button>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription>
            <strong>Important:</strong> For Gmail, Outlook, and Yahoo, you must use an App Password instead of your regular password. 
            Enable 2FA first, then generate an App Password in your account security settings.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default SMTPConfigurationFix;