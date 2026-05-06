import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export const AuthCallback = () => {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const waitForMerchant = async (userId: string) => {
      const maxAttempts = 12;
      const delay = 400;

      for (let i = 0; i < maxAttempts; i++) {
        const { data: merchant } = await supabase
          .from('merchants')
          .select('id, profile_complete')
          .eq('user_id', userId)
          .maybeSingle();

        if (merchant) return merchant;

        await sleep(delay);
      }

      return null;
    };

    const waitForCustomer = async (userId: string) => {
      const maxAttempts = 8;
      const delay = 400;

      for (let i = 0; i < maxAttempts; i++) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (customer) return customer;

        await sleep(delay);
      }

      return null;
    };

    const waitForAgent = async (userId: string) => {
      const maxAttempts = 8;
      const delay = 400;

      for (let i = 0; i < maxAttempts; i++) {
        const { data: agent } = await supabase
          .from('agents')
          .select('id, status')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        if (agent) return agent;

        await sleep(delay);
      }

      return null;
    };

    const waitForSession = async () => {
      let session = null;
      const maxAttempts = 8;
      const delay = 400;

      for (let i = 0; i < maxAttempts; i++) {
        const { data } = await supabase.auth.getSession();
        session = data?.session;

        if (session?.user) return session;

        await sleep(delay);
      }

      return null;
    };

    const continueFlow = async () => {
      const hash = window.location.hash || '';
      const fullUrl = window.location.href;
      const url = new URL(window.location.href);

      if (
        hash.includes('access_token') &&
        (hash.includes('type=recovery') || fullUrl.includes('reset-password'))
      ) {
        window.location.replace('/reset-password' + hash);
        return;
      }

      const code = url.searchParams.get('code');
      const tokenHash = url.searchParams.get('token_hash');
      const queryType = url.searchParams.get('type');

      let session = null;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
          const { data } = await supabase.auth.getSession();
          session = data?.session;
        }
      }

      if (!session && tokenHash && queryType === 'email') {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'email',
        });

        if (!error) {
          session = await waitForSession();
          localStorage.setItem('email_verified', 'true');
        }
      }

      const isVerification =
        queryType === 'email' ||
        hash.includes('type=signup') ||
        hash.includes('type=magiclink');

      if (!session && isVerification && hash.includes('access_token')) {
        const cleanHash = hash.substring(1);
        const pairs = cleanHash.split('&');
        const data: Record<string, string> = {};

        pairs.forEach((pair) => {
          const [key, value] = pair.split('=');
          if (key && value) data[key] = value;
        });

        const access_token = data['access_token'];
        const refresh_token = data['refresh_token'];

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (!error) {
            await sleep(400);
            const { data } = await supabase.auth.getSession();
            session = data?.session;
          }
        }

        localStorage.setItem('email_verified', 'true');
      }

      if (!session) {
        session = await waitForSession();
      }

      if (!session?.user) {
        window.location.replace('/login');
        return;
      }

      try {
        sessionStorage.setItem('just_verified', 'true');
      } catch {}

      const userId = session.user.id;

      const { data: admin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (admin) {
        window.location.replace('/admin-dashboard');
        return;
      }

      const agent = await waitForAgent(userId);

      if (agent) {
        window.location.replace('/agent-dashboard');
        return;
      }

      const merchant = await waitForMerchant(userId);

      if (merchant) {
        window.location.replace(
          merchant.profile_complete ? '/merchant-dashboard' : '/merchant-profile'
        );
        return;
      }

      const customer = await waitForCustomer(userId);

      if (customer) {
        const { data: status, error } = await supabase
          .rpc('get_user_signin_status')
          .maybeSingle();

        if (!error && status) {
          window.location.replace(
            status.profile_complete ? '/customer-dashboard' : '/customer-profile'
          );
          return;
        }

        window.location.replace('/customer-profile');
        return;
      }

      window.location.replace('/login');
    };

    continueFlow();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
};

export default AuthCallback;