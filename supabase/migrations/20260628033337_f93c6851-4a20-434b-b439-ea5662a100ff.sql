
CREATE TABLE public.maintenance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month smallint NOT NULL CHECK (month BETWEEN 0 AND 11),
  due_date date,
  label text NOT NULL,
  tone text NOT NULL DEFAULT 'blue' CHECK (tone IN ('blue','teal','purple','amber','red','green')),
  recurrence text NOT NULL DEFAULT 'yearly' CHECK (recurrence IN ('none','yearly','quarterly','monthly')),
  linked_item_id uuid REFERENCES public.items(id) ON DELETE CASCADE,
  done_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_tasks TO authenticated;
GRANT ALL ON public.maintenance_tasks TO service_role;

ALTER TABLE public.maintenance_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own maintenance tasks"
  ON public.maintenance_tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_maintenance_tasks_updated_at
  BEFORE UPDATE ON public.maintenance_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX maintenance_tasks_user_month_idx ON public.maintenance_tasks(user_id, month);
