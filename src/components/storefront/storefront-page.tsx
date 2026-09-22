import {
  StorefrontBannerSection,
  StorefrontCallToActionSection,
  StorefrontCategoriesSection,
  StorefrontHeroSection,
  StorefrontProductGridSection,
  StorefrontTextContentSection,
} from "@/components/storefront/storefront-sections";
import type { StorefrontPageDefinition, StorefrontSectionDefinition } from "@/domain/storefront";

function StorefrontSection({ section }: { section: StorefrontSectionDefinition }) {
  switch (section.type) {
    case "hero":
      return <StorefrontHeroSection {...section} />;
    case "banner":
      return <StorefrontBannerSection {...section} />;
    case "categories":
      return <StorefrontCategoriesSection {...section} />;
    case "product-grid":
      return <StorefrontProductGridSection {...section} />;
    case "text-content":
      return <StorefrontTextContentSection {...section} />;
    case "call-to-action":
      return <StorefrontCallToActionSection {...section} />;
  }
}

export function StorefrontPage({ page }: { page: StorefrontPageDefinition }) {
  return page.sections.map((section) => <StorefrontSection key={section.id} section={section} />);
}
