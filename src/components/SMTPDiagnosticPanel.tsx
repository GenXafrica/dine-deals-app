import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

interface SMTPConfig {
  id: string;
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

interface DiagnosticResult {
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export default function SMTPDiagnosticPanel() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<SMTPConfig | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);

  const runDiagnostics = async () => {
    setLoading(true);
    setDiagnostics([]);
    
    try {
      console.log('Starting SMTP diagnostics...');
      
      // 1. Check database configuration
      const { data: smtpConfig, error: configError } = await supabase
        .from('smtp_config')
        .select('*')
        .eq('is_active', true)
        // changed .single() -> .maybeSingle() to avoid PGRST116
        .maybeSingle();

      if (configError || !smtpConfig) {
        setDiagnostics(prev => [...prev, {
          status: 'error',
          message: 'SMTP configuration not found in database',
          details: configError?.message
        }]);
        return;
      }

      setConfig(smtpConfig);
      console.log('SMTP config loaded:', smtpConfig);

      // 2. Check required fields
      const requiredFields = ['host', 'port', 'username', 'password', 'from_email'];
      const missingFields = requiredFields.filter(field => !smtpConfig[field]);
      
      if (missingFields.length > 0) {
        setDiagnostics(prev => [...prev, {
          status: 'error',
          message: `Missing required SMTP fields: ${missingFields.join(', ')}`,
          details: { missingFields }
        }]);
      } else {
        setDiagnostics(prev => [...prev, {
          status: 'success',
          message: 'All required SMTP fields are configured'
        }]);
      }

      // 3. Validate Afrihost settings
      const expectedHost = 'mail.dinedeals.co.za';
      const expectedPort = 465;
      const expectedSSL = true;
      
      if (smtpConfig.host !== expectedHost) {
        setDiagnostics(prev => [...prev, {
          status: 'warning',
          message: `Host mismatch: Expected ${expectedHost}, got ${smtpConfig.host}`
        }]);
      }
      
      if (smtpConfig.port !== expectedPort) {
        setDiagnostics(prev => [...prev, {
          status: 'warning',
          message: `Port mismatch: Expected ${expectedPort}, got ${smtpConfig.port}`
        }]);
      }
      
      if (!smtpConfig.use_ssl) {
        setDiagnostics(prev => [...prev, {
          status: 'warning',
          message: 'SSL should be enabled for Afrihost (port 465)'
        }]);
      }

      // 4. Test SMTP connection
      try {
        const { data: testResult, error: testError } = await supabase.functions.invoke('test-raw-smtp', {
          body: {}
        });

        if (testError) {
          setDiagnostics(prev => [...prev, {
            status: 'error',
            message: 'SMTP connection test failed',
            details: testError.message
          }]);
        } else if (testResult?.success) {
          setDiagnostics(prev => [...prev, {
            status: 'success',
            message: 'SMTP connection test successful'
          }]);
        } else {
          setDiagnostics(prev => [...prev, {
            status: 'error',
            message: testResult?.error || 'SMTP connection test failed'
          }]);
        }
      } catch (error: any) {
        setDiagnostics(prev => [...prev, {
          status: 'error',
          message: 'Failed to run SMTP connection test',
          details: error.message
        }]);
      }

    } catch (error: any) {
      console.error('Diagnostic error:', error);
      setDiagnostics(prev => [...prev, {
        status: 'error',
        message: 'Diagnostic test failed',
        details: error.message
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <CardTitle className="text-gray-800 text-sm">SMTP Diagnostics</CardTitle>
          </div>
          <Button
            onClick={runDiagnostics}
            disabled={loading}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Running...
              </>
            ) : (
              'Run Diagnostics'
            )}
          </Button>
        </div>
        <CardDescription className="text-xs text-gray-600">
          Diagnose SMTP configuration and connection issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {config && (
          <div className="bg-gray-50 p-3 rounded text-xs">
            <h4 className="font-medium mb-2">Current Configuration:</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>Host: {config.host}</div>
              <div>Port: {config.port}</div>
              <div>Username: {config.username}</div>
              <div>From: {config.from_email}</div>
              <div>SSL: {config.use_ssl ? 'Yes' : 'No'}</div>
              <div>Password: {config.password ? 'Configured' : 'Missing'}</div>
            </div>
          </div>
        )}

        {diagnostics.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Diagnostic Results:</h4>
            {diagnostics.map((result, index) => (
              <Alert key={index} className="py-2">
                <div className="flex items-start space-x-2">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <AlertDescription className="text-xs">
                      <div className="flex items-center justify-between">
                        <span>{result.message}</span>
                        <Badge className={`text-xs ${getStatusColor(result.status)}`}>
                          {result.status.toUpperCase()}
                        </Badge>
                      </div>
                      {result.details && (
                        <pre className="mt-1 text-xs text-gray-600 bg-gray-100 p-1 rounded overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
          <p className="font-medium mb-1">Expected Afrihost Settings:</p>
          <ul className="space-y-1">
            <li>• Host: mail.dinedeals.co.za</li>
            <li>• Port: 465</li>
            <li>• SSL: Enabled</li>
            <li>• Username: noreply@dinedeals.co.za</li>
            <li>• Password: Must be configured</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}