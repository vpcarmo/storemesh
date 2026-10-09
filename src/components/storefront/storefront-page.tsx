import type { CSSProperties } from "react";

import {
  StorefrontBannerSection,
  StorefrontBenefitsSection,
  StorefrontCallToActionSection,
  StorefrontCategoriesSection,
  StorefrontEditorialGallerySection,
  StorefrontHeroSection,
  StorefrontImageTextSection,
  StorefrontFaqSection,
  StorefrontPartnerBrandsSection,
  StorefrontProductGridSection,
  StorefrontTestimonialsSection,
  StorefrontTextContentSection,
} from "@/components/storefront/storefront-sections";
import type {
  PublicStorefrontSectionDefinition,
  StorefrontRenderablePage,
  StorefrontSectionDefinition,
} from "@/domain/storefront";

type StorefrontSectionRenderDefinition =
  StorefrontSectionDefinition | PublicStorefrontSectionDefinition;

type StorefrontSectionStyle = CSSProperties & {
  "--storefront-section-local-background"?: string;
  "--storefront-section-local-spacing"?: string;
  "--storefront-section-local-content-width"?: string;
  "--storefront-section-local-content-alignment"?: string;
};

function getStorefrontSectionStyle(section: StorefrontSectionRenderDefinition) {
  const style: StorefrontSectionStyle = {};
  if (section.backgroundColor)
    style["--storefront-section-local-background"] = section.backgroundColor;

  if (
    section.type === "categories" ||
    section.type === "product-grid" ||
    section.type === "text-content" ||
    section.type === "image-text" ||
    section.type === "benefits" ||
    section.type === "faq" ||
    section.type === "testimonials" ||
    section.type === "partner-brands" ||
    section.type === "editorial-gallery"
  ) {
    if (section.sectionSpacing) {
      style["--storefront-section-local-spacing"] = {
        compact: "calc(var(--storefront-section-space) * 0.65)",
        default: "var(--storefront-section-space)",
        spacious: "calc(var(--storefront-section-space) * 1.4)",
      }[section.sectionSpacing];
    }
    if (section.contentWidth) {
      style["--storefront-section-local-content-width"] = {
        narrow: "42rem",
        default: "var(--storefront-container-width)",
        wide: "90rem",
      }[section.contentWidth];
    }
    if (section.contentAlignment) {
      style["--storefront-section-local-content-alignment"] = section.contentAlignment;
    }
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function StorefrontSection({ section }: { section: StorefrontSectionRenderDefinition }) {
  const style = getStorefrontSectionStyle(section);
  let content;
  switch (section.type) {
    case "hero":
      content = <StorefrontHeroSection {...section} />;
      break;
    case "banner":
      content = <StorefrontBannerSection {...section} />;
      break;
    case "categories":
      content = <StorefrontCategoriesSection {...section} />;
      break;
    case "product-grid":
      content = <StorefrontProductGridSection {...section} />;
      break;
    case "text-content":
      content = <StorefrontTextContentSection {...section} />;
      break;
    case "image-text":
      content = <StorefrontImageTextSection {...section} />;
      break;
    case "benefits":
      content = <StorefrontBenefitsSection {...section} />;
      break;
    case "faq":
      content = <StorefrontFaqSection {...section} />;
      break;
    case "testimonials":
      content = <StorefrontTestimonialsSection {...section} />;
      break;
    case "partner-brands":
      content = <StorefrontPartnerBrandsSection {...section} />;
      break;
    case "editorial-gallery":
      content = (
        <StorefrontEditorialGallerySection
          {...(section.title === undefined ? {} : { title: section.title })}
          images={section.images.map((image) => ({
            imageUrl: "imageUrl" in image ? (image.imageUrl ?? null) : null,
            alt: image.alt,
            ...(image.caption === undefined ? {} : { caption: image.caption }),
          }))}
        />
      );
      break;
    case "call-to-action":
      content = <StorefrontCallToActionSection {...section} />;
      break;
  }

  return (
    <div className="storefront-section-wrapper" style={style}>
      {content}
    </div>
  );
}

export function StorefrontPage({ page }: { page: StorefrontRenderablePage }) {
  return page.sections.map((section) => <StorefrontSection key={section.id} section={section} />);
}
