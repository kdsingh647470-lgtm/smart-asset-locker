ALTER TABLE public.maintenance_tasks
  ADD COLUMN IF NOT EXISTS vendor_name text,
  ADD COLUMN IF NOT EXISTS vendor_phone text;