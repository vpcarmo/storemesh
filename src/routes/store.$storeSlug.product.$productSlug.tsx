import { useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { getPublishedProductPage } from "@/auth/public-website.functions";
import { PublicStorefrontFrame } from "@/components/storefront/public-storefront-frame";
import type { PublicProductAttribute, PublicProductDetails } from "@/data/catalog.repository";
import { isValidHttpUrl } from "@/domain/storefront-theme";

type ProductDetailData = Pick<
  PublicProductDetails,
  "product" | "images" | "attributes" | "variants"
> & {
  store: { name: string; slug: string };
  category: (NonNullable<PublicProductDetails["category"]> & { href: string }) | null;
};

export const Route = createFileRoute("/store/$storeSlug/product/$productSlug")({
  loader: async ({ params }) => {
    const page = await getPublishedProductPage({ data: params });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => {
    const title = `${loaderData?.product.name ?? "Produto"} — ${loaderData?.store.name ?? "StoreMesh"}`;
    const description = loaderData?.product.description.slice(0, 320) ?? "";
    const imageUrl = loaderData?.images[0]?.url;
    return {
      links: [
        loaderData?.settings?.faviconUrl && isValidHttpUrl(loaderData.settings.faviconUrl)
          ? { rel: "icon", href: loaderData.settings.faviconUrl }
          : { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      ],
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(imageUrl ? [{ property: "og:image", content: imageUrl }] : []),
        { name: "twitter:card", content: imageUrl ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(imageUrl ? [{ name: "twitter:image", content: imageUrl }] : []),
      ],
    };
  },
  component: PublicProductPage,
});

function PublicProductPage() {
  const data = Route.useLoaderData();
  return (
    <PublicStorefrontFrame data={data}>
      <ProductDetail key={data.product.id} data={data} />
    </PublicStorefrontFrame>
  );
}

function ProductDetail({ data }: { data: ProductDetailData }) {
  const [gallery, setGallery] = useState(() => ({
    selectedImageId: data.images[0]?.id ?? null,
    unavailableImageIds: new Set<string>(),
  }));
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const availableImages = data.images.filter((image) => !gallery.unavailableImageIds.has(image.id));
  const selectedImage =
    availableImages.find((image) => image.id === gallery.selectedImageId) ?? availableImages[0];
  const selectedVariant = data.variants.find((variant) => variant.id === selectedVariantId) ?? null;
  const effectivePrice = selectedVariant?.price ?? data.product.price;
  const compareAtPrice =
    selectedVariant?.compareAtPrice !== null &&
    selectedVariant?.compareAtPrice !== undefined &&
    selectedVariant.compareAtPrice > effectivePrice
      ? selectedVariant.compareAtPrice
      : null;
  const attributeLabels = new Map(
    data.variants.map((variant) => [
      variant.id,
      variant.attributes.map((attribute) => `${attribute.name}: ${attribute.label}`).join(" · "),
    ]),
  );
  const attributeLabelCounts = new Map<string, number>();
  for (const label of attributeLabels.values()) {
    if (label) attributeLabelCounts.set(label, (attributeLabelCounts.get(label) ?? 0) + 1);
  }

  function handleImageError(imageId: string) {
    setGallery((current) => {
      const unavailableImageIds = new Set(current.unavailableImageIds);
      unavailableImageIds.add(imageId);
      const selectedImageId =
        current.selectedImageId === imageId
          ? (data.images.find((image) => !unavailableImageIds.has(image.id))?.id ?? null)
          : current.selectedImageId;
      return { selectedImageId, unavailableImageIds };
    });
  }

  return (
    <section className="storefront-section storefront-product-page">
      <div className="storefront-section-inner">
        <nav className="storefront-product-breadcrumb" aria-label="Navegação estrutural">
          <ol>
            <li>
              <a href={`/store/${data.store.slug}`}>Home</a>
            </li>
            <li>
              <a href={`/store/${data.store.slug}/catalog`}>Catálogo</a>
            </li>
            {data.category?.href ? (
              <li>
                <a href={data.category.href}>{data.category.name}</a>
              </li>
            ) : null}
            <li>
              <span aria-current="page">{data.product.name}</span>
            </li>
          </ol>
        </nav>
        <div className="storefront-product-detail">
          <div className="storefront-product-gallery">
            <div className="storefront-product-detail-media">
              {selectedImage ? (
                <img
                  src={selectedImage.url}
                  alt={selectedImage.alt ?? data.product.name}
                  onError={() => handleImageError(selectedImage.id)}
                />
              ) : (
                <span className="storefront-product-image-placeholder">
                  Imagem do produto indisponível
                </span>
              )}
            </div>
            {availableImages.length > 1 ? (
              <div className="storefront-product-thumbnails" aria-label="Imagens do produto">
                {availableImages.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    aria-label={`Mostrar imagem ${index + 1} de ${availableImages.length}: ${image.alt}`}
                    aria-pressed={selectedImage?.id === image.id}
                    onClick={() =>
                      setGallery((current) => ({ ...current, selectedImageId: image.id }))
                    }
                  >
                    <img
                      src={image.url}
                      alt=""
                      aria-hidden="true"
                      onError={() => handleImageError(image.id)}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="storefront-product-detail-info">
            <h1>{data.product.name}</h1>
            <p className="storefront-product-detail-description">{data.product.description}</p>
            {data.attributes.length > 0 ? (
              <dl className="storefront-product-attributes">
                {data.attributes.map((attribute) => (
                  <div key={`${attribute.id}-${attribute.value}`}>
                    <dt>
                      {attribute.name} <small>({attribute.code})</small>
                    </dt>
                    <dd>
                      <AttributeValue attribute={attribute} />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {data.variants.length > 0 ? (
              <fieldset className="storefront-product-variants">
                <legend>Opções disponíveis</legend>
                {data.variants.map((variant, index) => {
                  const attributesLabel = attributeLabels.get(variant.id) ?? "";
                  const canIdentifyByAttributes =
                    attributesLabel.length > 0 && attributeLabelCounts.get(attributesLabel) === 1;
                  const fallbackLabel = variant.sku || `Opção ${index + 1}`;
                  return (
                    <label key={variant.id} className="storefront-product-variant-option">
                      <input
                        type="radio"
                        name={`variant-${data.product.id}`}
                        value={variant.id}
                        checked={selectedVariantId === variant.id}
                        onChange={() => setSelectedVariantId(variant.id)}
                      />
                      <span>
                        {canIdentifyByAttributes
                          ? variant.attributes.map((attribute, attributeIndex) => (
                              <span key={`${attribute.id}-${attributeIndex}`}>
                                {attributeIndex > 0 ? " · " : null}
                                <AttributeValue attribute={attribute} includeName />
                              </span>
                            ))
                          : fallbackLabel}
                        {!canIdentifyByAttributes && variant.attributes.length > 0 ? (
                          <small className="storefront-product-variant-attributes">
                            {" "}
                            —{" "}
                            {variant.attributes.map((attribute, attributeIndex) => (
                              <span key={`${attribute.id}-${attributeIndex}`}>
                                {attributeIndex > 0 ? " · " : null}
                                <AttributeValue attribute={attribute} includeName />
                              </span>
                            ))}
                          </small>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            ) : null}
            <strong className="storefront-product-current-price">
              {formatPrice(effectivePrice)}
            </strong>
            {compareAtPrice !== null ? (
              <s className="storefront-product-compare-price">{formatPrice(compareAtPrice)}</s>
            ) : null}
            {selectedVariant?.sku ? <p>SKU: {selectedVariant.sku}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function AttributeValue({
  attribute,
  includeName = false,
}: {
  attribute: PublicProductAttribute;
  includeName?: boolean;
}) {
  return (
    <>
      {includeName ? `${attribute.name} (${attribute.code}): ` : null}
      {attribute.displayType === "swatch" && attribute.swatchValue ? (
        <span className="storefront-product-attribute-value">
          <span
            className="storefront-product-attribute-swatch"
            style={{ backgroundColor: attribute.swatchValue }}
            aria-hidden="true"
          />
          {attribute.label}
        </span>
      ) : (
        attribute.label
      )}
    </>
  );
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
}
