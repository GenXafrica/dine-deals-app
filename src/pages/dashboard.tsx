// src/pages/dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import AppLayout from '@/components/AppLayout';
import Deals from './deals';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';


type Role = 'merchant' | 'customer' | null;

export default function Dashboard() {
  const [selectedRadius, setSelectedRadius] = useState(5);
  const [role, setRole] = useState<Role>(null);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  const handleCancel = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userRes?.user) {
          if (mounted) {
            setRole('customer');
            setChecking(false);
          }
          return;
        }

        const user = userRes.user;

        const { data: merchRow } = await supabase
          .from('merchants')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (mounted && merchRow) {
          setRole('merchant');
          setChecking(false);
          return;
        }

        const { data: custRow } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (mounted) {
          setRole(custRow ? 'customer' : 'customer');
          setChecking(false);
        }
      } catch {
        if (mounted) {
          setRole('customer');
          setChecking(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (checking) {
    return <AppLayout />;
  }

  return (
    <AppLayout>
      {role === 'merchant' ? (
        <div>{/* Merchant dashboard placeholder */}</div>
      ) : (
        <div className="relative flex flex-col">
          <div className="flex-1 pt-4 px-4">
            <Deals radiusKm={selectedRadius} />
          </div>


          <div className="absolute bottom-4 left-4">
            <Button
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700 text-white rounded-md px-6 py-2 font-semibold shadow-md"
            >
              Cancel
            </Button>
          </div>
        </div>

      )}
    </AppLayout>
  );
}
