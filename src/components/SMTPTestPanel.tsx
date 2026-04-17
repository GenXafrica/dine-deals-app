import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TestTube, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SMTPTestPanelProps {
  welcomeTemplate?: any;
  verificationTemplate?: any;
}

const SMTPTestPanel: React.FC<SMTPTestPanelProps> = ({ welcomeTemplate, verificationTemplate }) => {
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    
    try {
      console.log('Testing SMTP connection...');
      const { data, error } = await supabase.functions.invoke('test-raw-smtp', {
        body: {}
      });
      
      console.log('Connection test response:', { data, error });
      
      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      setConnectionResult(data);
      
      if (data?.success) {
        toast({
          title: 'Success',
          description: data.message || 'SMTP connection test successful!'
        });
      } else {
        toast({
          title: 'Connection Test Failed',
          description: data?.error || 'SMTP connection test failed',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Connection test error:', error);
      const errorMsg = error.message || 'Connection test failed';
      setConnectionResult({
        success: false,
        error: errorMsg,
        details: error.details || 'Unknown error occurred'
      });
      toast({
        title: 'Error',
        description: `Failed to test SMTP connection: ${errorMsg}`,
        variant: 'destructive'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>SMTP Connection Test</CardTitle>
          <CardDescription>Test your SMTP server connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testConnection} 
            disabled={testingConnection}
            className="w-full"
          >
            {testingConnection ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Testing Connection...</>
            ) : (
              <><TestTube className="w-4 h-4 mr-2" />Test SMTP Connection</>
            )}
          </Button>
          
          {connectionResult && (
            <Alert className={connectionResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center">
                {connectionResult.success ? (
                  <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 mr-2" />
                )}
                <AlertDescription>
                  <strong>{connectionResult.success ? 'Success: ' : 'Failed: '}</strong>
                  {connectionResult.message || connectionResult.error}
                  {connectionResult.details && (
                    <div className="mt-2 text-sm opacity-75">
                      <strong>Details:</strong> {connectionResult.details}
                    </div>
                  )}
                  {connectionResult.code && (
                    <div className="mt-2 text-sm opacity-75">
                      <strong>Error Code:</strong> {connectionResult.code}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SMTPTestPanel;