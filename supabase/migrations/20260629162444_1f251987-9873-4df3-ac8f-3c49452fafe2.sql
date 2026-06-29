
CREATE TABLE public.user_plans (
  user_id uuid PRIMARY KEY,
  plan text NOT NULL DEFAULT 'free',
  activated_at timestamptz,
  promo_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_plans TO authenticated;
GRANT ALL ON public.user_plans TO service_role;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own plan" ON public.user_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
