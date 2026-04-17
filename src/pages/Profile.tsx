// src/pages/profile.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { MerchantProfileEdit } from '@/components/MerchantProfileEdit';
import { CustomerProfileEdit } from '@/components/CustomerProfileEdit';
import { ensureEmailVerifiedOrRedirect } from '@/lib/verificationGate';

type UserRole = 'merchant' | 'customer' | null;

export default function ProfilePage(): JSX.Element {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!user || error) {
        if (!cancelled) navigate('/', { replace: true });
        return;
      }

      // Enforce email verification for BOTH merchants and customers
      const verified = await ensureEmailVerifiedOrRedirect();
      if (!verified || cancelled) {
        // Hard redirect to /email-validation is handled inside the gate
        return;
      }

      // Determine role
      let determinedRole: UserRole = null;
      const metaRole = user.user_metadata?.role;
      if (metaRole === 'Merchant') {
        determinedRole = 'merchant';
      } else if (metaRole === 'Customer') {
        determinedRole = 'customer';
      } else {
        // Fallback via RPCs
        const { data: merchant } = await supabase.rpc('get_current_merchant').maybeSingle();
        if (merchant) {
          determinedRole = 'merchant';
        } else {
          const { data: customer } = await supabase
            .rpc('get_current_customer', { user_uuid: user.id })
            .maybeSingle();
          if (customer) determinedRole = 'customer';
        }
      }

      if (!cancelled) {
        setRole(determinedRole);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading) return <div className="p-4">Loading profile...</div>;

  if (role === 'merchant') return <MerchantProfileEdit />;
  if (role === 'customer') return <CustomerProfileEdit />;

  return (
    <div className="p-4">
      <h1>Unknown Role</h1>
      <p>We could not determine your account type.</p>
    </div>
  );
}
