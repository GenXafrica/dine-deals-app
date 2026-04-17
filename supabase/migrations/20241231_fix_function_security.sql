-- Fix security warning for assign_default_subscription_plan function
-- Set immutable search_path to prevent role-based injection risks

CREATE OR REPLACE FUNCTION public.assign_default_subscription_plan(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default subscription plan for new user
  INSERT INTO public.subscriptions (
    user_id,
    plan_name,
    status,
    created_at,
    updated_at
  )
  VALUES (
    user_id,
    'free',
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Also fix increment_promo_usage function if it exists
CREATE OR REPLACE FUNCTION public.increment_promo_usage(promo_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Increment usage count for promo code
  UPDATE public.promo_codes
  SET usage_count = COALESCE(usage_count, 0) + 1,
      updated_at = NOW()
  WHERE code = promo_code
    AND (max_usage IS NULL OR COALESCE(usage_count, 0) < max_usage)
    AND (expires_at IS NULL OR expires_at > NOW())
    AND is_active = true;
END;
$$;
