import { Button } from "@/components/ui/button";
import type { Category, Product } from "@/domain/catalog";

function SectionAction({ action }: { action?: { label: string; href: string } }) {
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
}: {
  title: string;
  description?: string | null;
  action?: { label: string; href: string };
}) {
  return (
    <section className="storefront-hero">
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
}: {
  message: string;
  action?: { label: string; href: string };
}) {
  return (
    <section className="storefront-banner">
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
  categories: Category[];
}) {
  return (
    <section className="storefront-section">
      <div className="storefront-section-inner">
        {title ? <h2>{title}</h2> : null}
        {categories.length > 0 ? (
          <div className="storefront-category-grid">
            {categories.map((category) => (
              <article className="storefront-card" key={category.id}>
                <h3>{category.name}</h3>
                {category.description ? <p>{category.description}</p> : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function StorefrontProductGridSection({
  title,
  products,
}: {
  title?: string;
  products: Product[];
}) {
  return (
    <section className="storefront-section">
      <div className="storefront-section-inner">
        {title ? <h2>{title}</h2> : null}
        {products.length > 0 ? (
          <div className="storefront-product-grid">
            {products.map((product) => (
              <article className="storefront-card storefront-product-card" key={product.id}>
                <div className="storefront-product-media" aria-hidden="true" />
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
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function StorefrontTextContentSection({
  title,
  content,
}: {
  title?: string;
  content: string;
}) {
  return (
    <section className="storefront-section">
      <div className="storefront-section-inner storefront-prose">
        {title ? <h2>{title}</h2> : null}
        <p>{content}</p>
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