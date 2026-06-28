
-- Doc type enum
DO $$ BEGIN
  CREATE TYPE public.doc_type AS ENUM ('invoice','warranty','insurance','manual','amc');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.item_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid REFERENCES public.items(id) ON DELETE CASCADE,
  doc_type public.doc_type NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  extracted_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_documents TO authenticated;
GRANT ALL ON public.item_documents TO service_role;

ALTER TABLE public.item_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own documents" ON public.item_documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_item_documents_updated_at
  BEFORE UPDATE ON public.item_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX item_documents_item_idx ON public.item_documents(item_id);
CREATE INDEX item_documents_user_type_idx ON public.item_documents(user_id, doc_type);

-- Storage policies for item-documents bucket: path is {user_id}/{item_id}/{filename}
CREATE POLICY "Users read own item docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'item-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own item docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'item-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own item docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'item-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own item docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'item-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
