import type { CSSProperties } from "react";

import {
  StorefrontBannerSection,
  StorefrontCallToActionSection,
  StorefrontCategoriesSection,
  StorefrontHeroSection,
  StorefrontProductGridSection,
  StorefrontTextContentSection,
} from "@/components/storefront/storefront-sections";
import type { StorefrontPageDefinition, StorefrontSectionDefinition } from "@/domain/storefront";

type StorefrontSectionStyle = CSSProperties & {
  "--storefront-section-local-background"?: string;
  "--storefront-section-local-spacing"?: string;
  "--storefront-section-local-content-width"?: string;
  "--storefront-section-local-content-alignment"?: string;
};

function getStorefrontSectionStyle(section: StorefrontSectionDefinition) {
  const style: StorefrontSectionStyle = {};
  if (section.backgroundColor)
    style["--storefront-section-local-background"] = section.backgroundColor;

  if (
    section.type === "categories" ||
    section.type === "product-grid" ||
    section.type === "text-content"
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

function StorefrontSection({ section }: { section: StorefrontSectionDefinition }) {
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

export function StorefrontPage({ page }: { page: StorefrontPageDefinition }) {
  return page.sections.map((section) => <StorefrontSection key={section.id} section={section} />);
}
