// src/components/RegisterForm.tsx
import React from 'react';

/**
 * ⚠️ OBSOLETE COMPONENT
 *
 * This registration form is intentionally disabled.
 *
 * Reason:
 * - It uses legacy signup logic
 * - It invokes custom verification flows
 * - It conflicts with the current Supabase Auth verification-first model
 *
 * Do NOT re-enable without reviewing:
 * - Auth Flow PDF
 * - Supabase email confirmation rules
 * - RLS verification gates
 */

export const RegisterForm: React.FC = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[RegisterForm] This component is obsolete and has been disabled. ' +
      'Use NewRegisterForm instead.'
    );
  }

  return (
    <div className="p-4 border border-red-300 rounded bg-red-50 text-red-700 text-sm">
      This registration form is no longer in use.
    </div>
  );
};

export default RegisterForm;
