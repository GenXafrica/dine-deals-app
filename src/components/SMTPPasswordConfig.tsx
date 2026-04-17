import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, Eye, EyeOff, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

export default function SMTPPasswordConfig() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    checkPasswordStatus();
  }, []);

  const checkPasswordStatus = async () => {
    setLoading(true);
    try {
      const { data: config, error } = await supabase
        .from('smtp_config')
        .select('password')
        .eq('is_active', true)
        // changed .single() -> .maybeSingle() to avoid PGRST116
        .maybeSingle();

      if (error) {
        console.error('Error checking password status:', error);
        return;
      }

      setHasPassword(!!config?.password);
      console.log('Password status:', { hasPassword: !!config?.password });
    } catch (error) {
      console.error('Password check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async () => {
    if (!password.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a password',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      console.log('Saving SMTP password...');
      
      const { error } = await supabase
        .from('smtp_config')
        .update({ 
          password: password.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('is_active', true);

      if (error) {
        console.error('Password save error:', error);
        throw error;
      }

      console.log('SMTP password saved successfully');
      setHasPassword(true);
      setPassword('');
      
      toast({
        title: 'Success',
        description: 'SMTP password saved successfully',
        variant: 'default'
      });
    } catch (error: any) {
      console.error('Save password error:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save password',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-red-200">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Key className="w-4 h-4 text-red-600" />
          <CardTitle className="text-gray-800 text-sm">SMTP Password Configuration</CardTitle>
        </div>
        <CardDescription className="text-xs text-gray-600">
          Configure the SMTP password for mail.dinedeals.co.za
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Checking password status...</span>
          </div>
        ) : (
          <>
            <Alert className={hasPassword ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription className="text-xs">
                <div className="flex items-center space-x-2">
                  {hasPassword ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-700">SMTP password is configured</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-700">SMTP password is missing - this is likely causing the error</span>
                    </>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="smtp-password" className="text-xs text-gray-700">
                SMTP Password for noreply@dinedeals.co.za
              </Label>
              <div className="relative">
                <Input
                  id="smtp-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter SMTP password from Afrihost"
                  className="border-red-200 focus:border-red-500 text-xs h-8 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-6 w-6 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              onClick={savePassword}
              disabled={saving || !password.trim()}
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
                  Save SMTP Password
                </>
              )}
            </Button>

            <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-200">
              <p className="font-medium mb-1 text-yellow-800">Important:</p>
              <ul className="space-y-1 text-yellow-700">
                <li>• Use the email password from your Afrihost control panel</li>
                <li>• This is the password for noreply@dinedeals.co.za</li>
                <li>• The password is stored securely in the database</li>
                <li>• After saving, test the SMTP connection to verify it works</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}