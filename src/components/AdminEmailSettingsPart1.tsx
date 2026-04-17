import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';

interface SMTPConfig {
  id?: string;
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  use_ssl: boolean;
  is_active: boolean;
}

const defaultConfig: SMTPConfig = {
  host: 'mail.dinedeals.co.za',
  port: 465,
  username: 'noreply@dinedeals.co.za',
  password: '',
  from_email: 'noreply@dinedeals.co.za',
  from_name: 'Dine Deals',
  use_tls: false,
  use_ssl: true,
  is_active: true
};

export default function AdminEmailSettingsPart1() {
  const [config, setConfig] = useState<SMTPConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const fetchConfig = async () => {
    if (!mounted) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('smtp_config')
        .select('*')
        .limit(1)
        // changed .single() -> .maybeSingle() to avoid PGRST116
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching SMTP config:', error);
        setError('Failed to load SMTP configuration');
        return;
      }

      if (data) {
        setConfig(data);
      }
    } catch (error: any) {
      console.error('Error fetching SMTP config:', error);
      setError(error?.message || 'Failed to load SMTP configuration');
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  const saveConfig = async () => {
    if (!config.host || !config.username || !config.password || !config.from_email) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('smtp_config')
        .upsert({
          id: config.id,
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          from_email: config.from_email,
          from_name: config.from_name,
          use_tls: config.use_tls,
          use_ssl: config.use_ssl,
          is_active: config.is_active
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'SMTP configuration saved successfully'
      });
      
      if (mounted) {
        await fetchConfig();
      }
    } catch (error: any) {
      console.error('SMTP save error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save SMTP configuration',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchConfig();
    }
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto mb-2" />
          <p className="text-sm text-gray-700">Initializing...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-red-600 mx-auto mb-2" />
          <p className="text-sm text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border-red-200">
        <CardContent className="p-4">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-red-600 mb-2">Error Loading Settings</h3>
            <p className="text-xs text-gray-600 mb-3">{error}</p>
            <Button onClick={fetchConfig} size="sm" className="bg-red-600 hover:bg-red-700">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-orange-200 h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-red-600" />
            <CardTitle className="text-gray-800 text-sm">Afrihost SMTP Settings</CardTitle>
          </div>
          <div className="flex items-center space-x-1">
            {config.is_active ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-600 font-medium">Active</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-600 font-medium">Inactive</span>
              </>
            )}
          </div>
        </div>
        <CardDescription className="text-xs text-gray-600">
          Configure Afrihost SMTP settings for sending emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="host" className="text-xs text-gray-700">SMTP Host *</Label>
            <Input
              id="host"
              value={config.host}
              onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
              placeholder="mail.dinedeals.co.za"
              className="border-orange-200 focus:border-red-500 text-xs h-8"
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="port" className="text-xs text-gray-700">Port *</Label>
            <Input
              id="port"
              type="number"
              value={config.port}
              onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 465 }))}
              placeholder="465"
              className="border-orange-200 focus:border-red-500 text-xs h-8"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="username" className="text-xs text-gray-700">Username *</Label>
          <Input
            id="username"
            value={config.username}
            onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
            placeholder="noreply@dinedeals.co.za"
            className="border-orange-200 focus:border-red-500 text-xs h-8"
          />
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="password" className="text-xs text-gray-700">Password *</Label>
          <Input
            id="password"
            type="password"
            value={config.password}
            onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
            placeholder="SMTP password"
            className="border-orange-200 focus:border-red-500 text-xs h-8"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="from_email" className="text-xs text-gray-700">From Email *</Label>
          <Input
            id="from_email"
            type="email"
            value={config.from_email}
            onChange={(e) => setConfig(prev => ({ ...prev, from_email: e.target.value }))}
            placeholder="noreply@dinedeals.co.za"
            className="border-orange-200 focus:border-red-500 text-xs h-8"
          />
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="from_name" className="text-xs text-gray-700">From Name</Label>
          <Input
            id="from_name"
            value={config.from_name}
            onChange={(e) => setConfig(prev => ({ ...prev, from_name: e.target.value }))}
            placeholder="Dine Deals"
            className="border-orange-200 focus:border-red-500 text-xs h-8"
          />
        </div>

        <div className="flex space-x-4">
          <div className="flex items-center space-x-1">
            <Switch
              id="use_tls"
              checked={config.use_tls}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, use_tls: checked }))}
            />
            <Label htmlFor="use_tls" className="text-xs text-gray-700">TLS</Label>
          </div>
          
          <div className="flex items-center space-x-1">
            <Switch
              id="use_ssl"
              checked={config.use_ssl}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, use_ssl: checked }))}
            />
            <Label htmlFor="use_ssl" className="text-xs text-gray-700">SSL</Label>
          </div>
          
          <div className="flex items-center space-x-1">
            <Switch
              id="is_active"
              checked={config.is_active}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active" className="text-xs text-gray-700">Active</Label>
          </div>
        </div>

        <div className="pt-2">
          <Button 
            onClick={saveConfig}
            disabled={saving}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3 h-3 mr-1" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}