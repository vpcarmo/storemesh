import { Button } from "@/components/ui/button";
import { StorefrontRichText } from "@/components/storefront/storefront-rich-text";
import { hideBrokenImage } from "@/lib/image";
import type {
  StorefrontCategoryItem,
  StorefrontProductGridItem,
  TextContentSectionDefinition,
} from "@/domain/storefront";

function SectionAction({
  action,
  className = "storefront-button",
}: {
  action: { label: string; href: string } | undefined;
  className?: string;
}) {
  if (!action) return null;
  return (
    <Button asChild className={className}>
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

export function StorefrontImageTextSection({
  title,
  description,
  imageUrl,
  imageAlt,
  imagePosition = "left",
}: {
  title: string;
  description: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imagePosition?: "left" | "right";
}) {
  return (
    <section
      className={`storefront-section storefront-image-text${imageUrl ? " has-image" : ""} is-image-${imagePosition}`}
    >
      <div className="storefront-section-inner">
        {imageUrl ? (
          <img className="storefront-image-text-image" src={imageUrl} alt={imageAlt ?? ""} />
        ) : null}
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
    </section>
  );
}

export function StorefrontBenefitsSection({
  title,
  description,
  benefits,
}: {
  title?: string;
  description?: string;
  benefits: { title: string; description: string }[];
}) {
  return (
    <section className="storefront-section">
      <div className="storefront-section-inner">
        {title ? <h2>{title}</h2> : null}
        {description ? <p>{description}</p> : null}
        {benefits.length > 0 ? (
          <div className="storefront-category-grid">
            {benefits.map((benefit, index) => (
              <article className="storefront-card" key={`${index}-${benefit.title}`}>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function StorefrontFaqSection({
  title,
  description,
  items,
}: {
  title?: string;
  description?: string;
  items: { question: string; answer: string }[];
}) {
  return (
    <section className="storefront-section">
      <div className="storefront-section-inner">
        {title ? <h2>{title}</h2> : null}
        {description ? <p>{description}</p> : null}
        {items.length > 0 ? (
          <div className="storefront-faq-list">
            {items.map((item, index) => (
              <details className="storefront-faq-item" key={`${index}-${item.question}`}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function StorefrontTestimonialsSection({
  title,
  description,
  testimonials,
}: {
  title?: string;
  description?: string;
  testimonials: {
    quote: string;
    name: string;
    role?: string;
    company?: string;
  }[];
}) {
  return (
    <section className="storefront-section">
      <div className="storefront-section-inner">
        {title ? <h2>{title}</h2> : null}
        {description ? <p>{description}</p> : null}
        {testimonials.length > 0 ? (
          <div className="storefront-category-grid">
            {testimonials.map((testimonial, index) => (
              <article
                className="storefront-card storefront-testimonial"
                key={`${index}-${testimonial.name}`}
              >
                <blockquote>{testimonial.quote}</blockquote>
                <footer>
                  <cite>{testimonial.name}</cite>
                  {testimonial.role || testimonial.company ? (
                    <p>{[testimonial.role, testimonial.company].filter(Boolean).join(" · ")}</p>
                  ) : null}
                </footer>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function StorefrontPartnerBrandsSection({
  title,
  brands,
}: {
  title?: string;
  brands: {
    name: string;
    logoUrl?: string | null;
    logoAlt: string;
    href?: string;
  }[];
}) {
  return (
    <section className="storefront-section">
      <div className="storefront-section-inner">
        {title ? <h2>{title}</h2> : null}
        {brands.length > 0 ? (
          <div className="storefront-brand-grid">
            {brands.map((brand, index) => {
              const logo = brand.logoUrl ? (
                <img
                  className="storefront-brand-logo"
                  src={brand.logoUrl}
                  alt={brand.logoAlt}
                  loading="lazy"
                  onError={hideBrokenImage}
                />
              ) : (
                <span>{brand.name}</span>
              );
              return brand.href ? (
                <a
                  className="storefront-card storefront-card-link storefront-brand-card"
                  href={brand.href}
                  key={`${index}-${brand.name}`}
                >
                  {logo}
                </a>
              ) : (
                <div
                  className="storefront-card storefront-brand-card"
                  key={`${index}-${brand.name}`}
                >
                  {logo}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function StorefrontEditorialGallerySection({
  title,
  images,
}: {
  title?: string;
  images: { imageUrl: string | null; alt: string; caption?: string }[];
}) {
  return (
    <section className="storefront-section">
      <div className="storefront-section-inner">
        {title ? <h2>{title}</h2> : null}
        {images.length > 0 ? (
          <div className="storefront-category-grid storefront-editorial-gallery">
            {images.map((image, index) => (
              <figure className="storefront-card storefront-editorial-gallery-item" key={index}>
                {image.imageUrl ? (
                  <img
                    src={image.imageUrl}
                    alt={image.alt}
                    loading="lazy"
                    onError={hideBrokenImage}
                  />
                ) : null}
                {image.caption ? <figcaption>{image.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        ) : null}
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
      <SectionAction action={action} className="storefront-button storefront-cta-button" />
    </section>
  );
}
