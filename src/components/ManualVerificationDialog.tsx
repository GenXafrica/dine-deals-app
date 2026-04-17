import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Mail, Copy } from 'lucide-react';

interface ManualVerificationDialogProps {
  children: React.ReactNode;
}

export const ManualVerificationDialog = ({ children }: ManualVerificationDialogProps) => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleManualVerification = async () => {
    if (!email || !token) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both email and verification token.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-email', {
        body: { 
          email: email,
          token: token
        }
      });
      
      if (error) {
        toast({
          title: 'Verification Failed',
          description: error.message || 'Failed to verify email.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Email Verified',
          description: 'Your email has been successfully verified.',
          variant: 'default'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process verification request.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyVerificationUrl = () => {
    if (!email || !token) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both email and verification token first.',
        variant: 'destructive'
      });
      return;
    }

    // For copying, we'll use a generic verification message since we're using the API
    const verificationMessage = `Email: ${email}, Token: ${token}`;
    navigator.clipboard.writeText(verificationMessage);
    
    toast({
      title: 'Info Copied',
      description: 'Verification details copied to clipboard.',
      variant: 'default'
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Manual Email Verification
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you didn't receive the verification email, you can manually verify your account using your email and verification token.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="token">Verification Token</Label>
            <Input
              id="token"
              placeholder="Enter verification token (check server logs)"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleManualVerification} 
              disabled={loading || !email || !token}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Verify Account'}
            </Button>
            <Button 
              variant="outline" 
              onClick={copyVerificationUrl}
              disabled={!email || !token}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Note: The verification token is logged in the server console when registration occurs. Contact support if you need assistance.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};