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
};

function StorefrontSection({ section }: { section: StorefrontSectionDefinition }) {
  const style: StorefrontSectionStyle | undefined = section.backgroundColor
    ? { "--storefront-section-local-background": section.backgroundColor }
    : undefined;
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
