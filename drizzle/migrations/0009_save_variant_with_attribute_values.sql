-- Stage 8: persist a variant and its attribute combination in one transaction.
CREATE OR REPLACE FUNCTION public.save_product_variant_with_attribute_values(
  p_store_id uuid,
  p_product_id uuid,
  p_variant_id uuid,
  p_sku text,
  p_price numeric,
  p_compare_at_price numeric,
  p_is_active boolean,
  p_position integer,
  p_values jsonb
)
RETURNS public.product_variants
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private
AS $$
DECLARE
  saved public.product_variants;
  value_item jsonb;
BEGIN
  IF NOT private.has_store_access(p_store_id) THEN
    RAISE EXCEPTION 'Not authorized for this store';
  END IF;

  IF p_variant_id IS NULL THEN
    INSERT INTO public.product_variants (store_id, product_id, sku, price, compare_at_price, is_active, position)
    VALUES (p_store_id, p_product_id, p_sku, p_price, p_compare_at_price, p_is_active, p_position)
    RETURNING * INTO saved;
  ELSE
    UPDATE public.product_variants
    SET product_id = p_product_id, sku = p_sku, price = p_price, compare_at_price = p_compare_at_price,
        is_active = p_is_active, position = p_position
    WHERE id = p_variant_id AND store_id = p_store_id
    RETURNING * INTO saved;
    IF NOT FOUND THEN RAISE EXCEPTION 'Variant does not belong to the authorized store'; END IF;
  END IF;

  DELETE FROM public.variant_attribute_values WHERE variant_id = saved.id AND store_id = p_store_id;
  FOR value_item IN SELECT value FROM jsonb_array_elements(p_values)
  LOOP
    INSERT INTO public.variant_attribute_values (store_id, variant_id, attribute_id, attribute_value_id)
    VALUES (p_store_id, saved.id, (value_item->>'attributeId')::uuid, (value_item->>'attributeValueId')::uuid);
  END LOOP;
  RETURN saved;
END;
$$;
GRANT EXECUTE ON FUNCTION public.save_product_variant_with_attribute_values(uuid, uuid, uuid, text, numeric, numeric, boolean, integer, jsonb) TO authenticated;
