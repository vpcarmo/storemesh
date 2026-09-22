ALTER TABLE public.products
  ADD CONSTRAINT products_description_not_blank
  CHECK (length(btrim(description)) BETWEEN 1 AND 20000);