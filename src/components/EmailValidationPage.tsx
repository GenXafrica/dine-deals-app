import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const EmailValidationPage: React.FC = () => {
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const resendLockRef = useRef(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Load email and resend cooldown
  useEffect(() => {
    const storedEmail = localStorage.getItem('pending_verification_email');
    if (storedEmail) {
      setEmail(storedEmail);
    }

    const resendAvailableAt = Number(localStorage.getItem('pending_verification_resend_available_at') || '0');
    const secondsRemaining = Math.ceil((resendAvailableAt - Date.now()) / 1000);

    if (secondsRemaining > 0) {
      setCooldown(secondsRemaining);
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResendEmail = async () => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'Unable to determine your email.',
        variant: 'destructive',
      });
      return;
    }

    if (cooldown > 0) {
      toast({
        title: 'Please wait',
        description: `Try again in ${cooldown}s`,
      });
      return;
    }

    if (resendLockRef.current) {
      return;
    }

    resendLockRef.current = true;
    setResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sent',
          description: 'Verification email resent.',
        });

        const resendAvailableAt = Date.now() + 20000;
        localStorage.setItem('pending_verification_resend_available_at', String(resendAvailableAt));
        setCooldown(20); // prevents 429
      }
    } finally {
      resendLockRef.current = false;
      setResending(false);
    }
  };

  const handleBackToHome = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl font-semibold">
            Check Your Email
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p className="mb-4">
              We've sent a verification email to your inbox. Click the link to verify your account.
            </p>

            <p className="mb-4 font-semibold">
              Once verified, you’ll be taken to your profile page. Complete your profile to unlock your dashboard and start viewing deals.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">
                  Check your spam folder if you don’t see it.
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleResendEmail}
              disabled={resending || cooldown > 0}
              className="w-full bg-[#2463EB] text-white hover:bg-blue-700"
            >
              {resending
                ? 'Sending...'
                : cooldown > 0
                ? `Wait ${cooldown}s`
                : 'Resend Verification Email'}
            </Button>

            <Button
              onClick={handleBackToHome}
              className="w-full bg-[#DC2626] text-white hover:bg-red-700"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailValidationPage;