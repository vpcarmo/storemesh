-- Stage 9C: store-scoped media assets and product image references.
CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  storage_path text,
  external_url text,
  filename text NOT NULL,
  mime_type text,
  size bigint,
  width integer,
  height integer,
  alt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_assets_source_type_valid CHECK (source_type IN ('upload', 'external')),
  CONSTRAINT media_assets_source_valid CHECK (
    (source_type = 'upload' AND storage_path IS NOT NULL AND external_url IS NULL) OR
    (source_type = 'external' AND storage_path IS NULL AND external_url IS NOT NULL
      AND external_url ~ '^https?://[^[:space:]]+$')
  ),
  CONSTRAINT media_assets_storage_path_store_prefix CHECK (
    storage_path IS NULL OR storage_path LIKE store_id::text || '/%'
  ),
  CONSTRAINT media_assets_filename_length CHECK (length(btrim(filename)) BETWEEN 1 AND 255),
  CONSTRAINT media_assets_mime_type_length CHECK (mime_type IS NULL OR length(mime_type) <= 255),
  CONSTRAINT media_assets_size_nonnegative CHECK (size IS NULL OR size >= 0),
  CONSTRAINT media_assets_dimensions_positive CHECK (
    (width IS NULL OR width > 0) AND (height IS NULL OR height > 0)
  ),
  CONSTRAINT media_assets_alt_length CHECK (alt IS NULL OR length(alt) <= 500),
  CONSTRAINT media_assets_storage_path_unique UNIQUE (storage_path),
  CONSTRAINT media_assets_id_store_unique UNIQUE (id, store_id)
);
CREATE INDEX media_assets_store_created_idx ON public.media_assets (store_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;
REVOKE ALL ON public.media_assets FROM PUBLIC, anon;

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage permitted media assets" ON public.media_assets FOR ALL TO authenticated
  USING (private.has_store_access(store_id)) WITH CHECK (private.has_store_access(store_id));
CREATE TRIGGER media_assets_set_updated_at BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('storemesh-media', 'storemesh-media', false, 52428800, ARRAY['image/*'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Users can read permitted media objects" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'storemesh-media'
    AND CASE
      WHEN cardinality(storage.foldername(name)) = 1
        AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN private.has_store_access(((storage.foldername(name))[1])::uuid)
      ELSE false
    END
  );
CREATE POLICY "Users can upload permitted media objects" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'storemesh-media'
    AND CASE
      WHEN cardinality(storage.foldername(name)) = 1
        AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN private.has_store_access(((storage.foldername(name))[1])::uuid)
      ELSE false
    END
  );
CREATE POLICY "Users can update permitted media objects" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'storemesh-media'
    AND CASE
      WHEN cardinality(storage.foldername(name)) = 1
        AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN private.has_store_access(((storage.foldername(name))[1])::uuid)
      ELSE false
    END
  )
  WITH CHECK (
    bucket_id = 'storemesh-media'
    AND CASE
      WHEN cardinality(storage.foldername(name)) = 1
        AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN private.has_store_access(((storage.foldername(name))[1])::uuid)
      ELSE false
    END
  );
CREATE POLICY "Users can delete permitted media objects" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'storemesh-media'
    AND CASE
      WHEN cardinality(storage.foldername(name)) = 1
        AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN private.has_store_access(((storage.foldername(name))[1])::uuid)
      ELSE false
    END
  );

ALTER TABLE public.product_images
  ADD COLUMN media_asset_id uuid,
  ALTER COLUMN url DROP NOT NULL;
ALTER TABLE public.product_images DROP CONSTRAINT product_images_url_not_blank;
ALTER TABLE public.product_images
  ADD CONSTRAINT product_images_source_valid CHECK (
    (media_asset_id IS NOT NULL AND url IS NULL) OR
    (media_asset_id IS NULL AND url IS NOT NULL AND length(btrim(url)) BETWEEN 1 AND 2000)
  ),
  ADD CONSTRAINT product_images_media_asset_same_store FOREIGN KEY (media_asset_id, store_id)
    REFERENCES public.media_assets(id, store_id) ON DELETE RESTRICT;
CREATE INDEX product_images_media_asset_idx ON public.product_images (media_asset_id)
  WHERE media_asset_id IS NOT NULL;