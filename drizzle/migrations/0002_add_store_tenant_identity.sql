CREATE TYPE public.store_status AS ENUM ('active', 'inactive');

ALTER TABLE public.stores
  ADD COLUMN slug text,
  ADD COLUMN status public.store_status NOT NULL DEFAULT 'active';

UPDATE public.stores
SET slug = CASE
  WHEN length(trim(both '-' FROM regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))) > 0
    THEN trim(both '-' FROM regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) || '-' || left(id::text, 8)
  ELSE 'store-' || left(id::text, 8)
END
WHERE slug IS NULL;

ALTER TABLE public.stores
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT stores_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  ADD CONSTRAINT stores_slug_unique UNIQUE (slug);