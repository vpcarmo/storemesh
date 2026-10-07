import { Button } from "@/components/ui/button";
import { StorefrontRichText } from "@/components/storefront/storefront-rich-text";
import { hideBrokenImage } from "@/lib/image";
import type {
  StorefrontCategoryItem,
  StorefrontProductGridItem,
  TextContentSectionDefinition,
} from "@/domain/storefront";

function SectionAction({ action }: { action: { label: string; href: string } | undefined }) {
  if (!action) return null;
  return (
    <Button asChild className="storefront-button">
      <a href={action.href}>{action.label}</a>
    </Button>
  );
}

export function StorefrontHeroSection({
  title,
  description,
  action,
  imageUrl,
  imageAlt,
}: {
  title: string;
  description?: string | null;
  action?: { label: string; href: string };
  imageUrl?: string | null;
  imageAlt?: string | null;
}) {
  return (
    <section className="storefront-hero">
      {imageUrl ? (
        <img className="storefront-section-image" src={imageUrl} alt={imageAlt ?? ""} />
      ) : null}
      <div className="storefront-section-inner">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        <SectionAction action={action} />
      </div>
    </section>
  );
}

export function StorefrontBannerSection({
  message,
  action,
  imageUrl,
  imageAlt,
}: {
  message: string;
  action?: { label: string; href: string };
  imageUrl?: string | null;
  imageAlt?: string | null;
}) {
  return (
    <section className="storefront-banner">
      {imageUrl ? (
        <img className="storefront-section-image" src={imageUrl} alt={imageAlt ?? ""} />
      ) : null}
      <p>{message}</p>
      <SectionAction action={action} />
    </section>
  );
}

export function StorefrontCategoriesSection({
  title,
  categories,
}: {
  title?: string;
  categories: StorefrontCategoryItem[];
}) {
  return (
    <section className="storefront-section">
      <div className="storefront-section-inner">
        {title ? <h2>{title}</h2> : null}
        {categories.length > 0 ? (
          <div className="storefront-category-grid">
            {categories.map((category) => (
              <CategoryCard category={category} key={category.id} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CategoryCard({ category }: { category: StorefrontCategoryItem }) {
  const content = (
    <>
      <h3>{category.name}</h3>
      {category.description ? <p>{category.description}</p> : null}
    </>
  );
  return category.href ? (
    <a className="storefront-card storefront-card-link" href={category.href}>
      {content}
    </a>
  ) : (
    <article className="storefront-card">{content}</article>
  );
}

function ProductCard({ product }: { product: StorefrontProductGridItem }) {
  const content = (
    <>
      {product.imageUrl ? (
        <div className="storefront-product-media">
          <img
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            onError={hideBrokenImage}
            loading="lazy"
          />
        </div>
      ) : (
        <div className="storefront-product-media" aria-hidden="true" />
      )}
      <div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <strong>
          {new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(product.price)}
        </strong>
      </div>
    </>
  );
  const className = "storefront-card storefront-product-card";
  return product.href ? (
    <a className={`${className} storefront-card-link`} href={product.href}>
      {content}
    </a>
  ) : (
    <article className={className}>{content}</article>
  );
}

export function StorefrontProductCards({ products }: { products: StorefrontProductGridItem[] }) {
  if (products.length === 0) return null;
  return (
    <div className="storefront-product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export function StorefrontProductGridSection({
  title,
  products,
}: {
  title?: string;
  products: StorefrontProductGridItem[];
}) {
  return (
    <section className="storefront-section">
      <div className="storefront-section-inner">
        {title ? <h2>{title}</h2> : null}
        <StorefrontProductCards products={products} />
      </div>
    </section>
  );
}

export function StorefrontTextContentSection({
  title,
  content,
  contentFormat,
}: Pick<TextContentSectionDefinition, "title" | "content" | "contentFormat">) {
  return (
    <section className="storefront-section">
      <div className="storefront-section-inner storefront-prose">
        {title ? <h2>{title}</h2> : null}
        <StorefrontRichText content={content} format={contentFormat ?? "plain"} />
      </div>
    </section>
  );
}

export function StorefrontCallToActionSection({
  title,
  description,
  action,
}: {
  title: string;
  description?: string | null;
  action: { label: string; href: string };
}) {
  return (
    <section className="storefront-cta">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <SectionAction action={action} />
    </section>
  );
}
