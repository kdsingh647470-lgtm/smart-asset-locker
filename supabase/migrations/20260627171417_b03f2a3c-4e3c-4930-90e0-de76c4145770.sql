
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  serial TEXT,
  room TEXT NOT NULL DEFAULT 'other',
  icon_key TEXT NOT NULL DEFAULT 'box',
  icon_tone TEXT NOT NULL DEFAULT 'blue',
  price_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_now NUMERIC(12,2) NOT NULL DEFAULT 0,
  purchased_at DATE,
  warranty_until DATE,
  amc_until DATE,
  insured_until DATE,
  has_invoice BOOLEAN NOT NULL DEFAULT false,
  has_manual BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own items" ON public.items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX items_user_id_idx ON public.items(user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_items_updated_at
BEFORE UPDATE ON public.items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
