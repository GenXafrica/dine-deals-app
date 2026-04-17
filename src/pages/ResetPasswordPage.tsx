import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const RESET_REDIRECT_URL = 'https://app.dinedeals.co.za/reset-password';

export default function ResetPasswordPage() {
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pageError, setPageError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolvedRef = useRef(false);

  useEffect(() => {
    const initialHash = window.location.hash || '';
    const hashParams = new URLSearchParams(
      initialHash.startsWith('#') ? initialHash.slice(1) : initialHash
    );

    const hashError =
      hashParams.get('error_description') || hashParams.get('error') || '';

    const markVerified = () => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      setPageError('');
      setIsVerified(true);
      setIsVerifying(false);
    };

    const markInvalid = (message = 'Invalid or expired reset link.') => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      setIsVerified(false);
      setPageError(message);
      setIsVerifying(false);
    };

    let cancelled = false;
    let verifyTimeout: number | undefined;

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;

      if (
        (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') &&
        session?.user
      ) {
        markVerified();
      }
    });

    const confirmRecovery = async () => {
      const deadline = Date.now() + 10000;

      while (!cancelled && !resolvedRef.current && Date.now() < deadline) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();

          if (sessionData?.session?.user) {
            markVerified();
            return;
          }

          const { data: userData } = await supabase.auth.getUser();

          if (userData?.user) {
            markVerified();
            return;
          }
        } catch {
          // retry until deadline
        }

        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      if (!cancelled && !resolvedRef.current) {
        if (hashError) {
          markInvalid(decodeURIComponent(hashError));
          return;
        }

        markInvalid();
      }
    };

    confirmRecovery();

    verifyTimeout = window.setTimeout(() => {
      if (!cancelled && !resolvedRef.current) {
        if (hashError) {
          markInvalid(decodeURIComponent(hashError));
          return;
        }

        markInvalid();
      }
    }, 10500);

    return () => {
      cancelled = true;
      if (verifyTimeout) {
        window.clearTimeout(verifyTimeout);
      }
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPageError('');
    setSuccessMessage('');

    if (!isVerified) {
      setPageError('Reset link has not been verified.');
      return;
    }

    if (!password || !confirmPassword) {
      setPageError('Please enter and confirm your new password.');
      return;
    }

    if (password.length < 6) {
      setPageError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setPageError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.updateUser({ password });

    if (!data?.user || error) {
      setPageError(error?.message || 'Could not update password.');
      setIsSubmitting(false);
      return;
    }

    toast({
      title: 'Password updated',
      description: 'Your password has been successfully changed.',
    });

    await supabase.auth.signOut();

    setTimeout(() => {
      window.location.href = '/login?reset=success';
    }, 1200);
  };

  const handleSendResetEmail = async () => {
    setPageError('');
    setSuccessMessage('');

    const email = window.prompt('Enter your email address');

    if (!email) {
      setPageError('Email is required to send a password reset email.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: RESET_REDIRECT_URL,
    });

    if (error) {
      setPageError('Could not send reset email. Please try again.');
      return;
    }

    toast({
      title: 'Check your email',
      description: 'If this email exists, a reset link has been sent.',
    });

    setSuccessMessage('Password reset email sent. Please check your inbox.');
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold">Reset password</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Enter a new password after your reset link is verified.
        </p>

        {pageError && !isVerified && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {isVerifying && (
          <div className="rounded-md border px-4 py-3 text-sm">
            Verifying reset link...
          </div>
        )}

        {!isVerifying && isVerified && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {isSubmitting ? 'Updating password...' : 'Update password'}
            </button>
          </form>
        )}

        {!isVerifying && !isVerified && (
          <button
            type="button"
            onClick={handleSendResetEmail}
            className="w-full rounded-md border px-4 py-2 text-sm font-medium"
          >
            Send new reset email
          </button>
        )}
      </div>
    </div>
  );
}