
CREATE TABLE public.razorpay_plans (
  billing TEXT PRIMARY KEY CHECK (billing IN ('monthly','yearly')),
  plan_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.razorpay_plans TO authenticated;
GRANT ALL ON public.razorpay_plans TO service_role;
ALTER TABLE public.razorpay_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans readable by authenticated" ON public.razorpay_plans
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL UNIQUE,
  billing TEXT NOT NULL CHECK (billing IN ('monthly','yearly')),
  status TEXT NOT NULL,
  current_end TIMESTAMPTZ,
  cancel_at_cycle_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscription readable" ON public.user_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER set_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
