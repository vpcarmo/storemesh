import type { ReactNode } from "react";

import {
  StorefrontFooter,
  StorefrontHeader,
  StorefrontLayout,
} from "@/components/storefront/storefront-layout";
import { StorefrontPage } from "@/components/storefront/storefront-page";
import { StorefrontThemeProvider } from "@/components/storefront/storefront-theme-provider";
import type { StorefrontNavigationItem, StorefrontPageDefinition } from "@/domain/storefront";
import type { PublicStorefrontSettings } from "@/domain/store-settings";
import { createStorefrontTheme } from "@/domain/storefront-theme";

export interface PublicStorefrontFrameData {
  store: { name: string; slug: string };
  settings: PublicStorefrontSettings | null;
  navigation: StorefrontNavigationItem[];
  footerNavigation: {
    help: StorefrontNavigationItem[];
    institutional: StorefrontNavigationItem[];
  };
  copyrightYear: number;
  backgroundImageUrl: string | null;
}

export function PublicStorefrontFrame({
  data,
  children,
  currentPageId,
}: {
  data: PublicStorefrontFrameData;
  children: ReactNode;
  currentPageId?: string;
}) {
  const theme = createStorefrontTheme(data.settings, data.backgroundImageUrl);
  return (
    <StorefrontThemeProvider theme={theme}>
      <StorefrontLayout
        header={
          <StorefrontHeader
            storeName={data.settings?.displayName ?? data.store.name}
            logoUrl={theme.assets.logoUrl}
            navigation={data.navigation}
            {...(currentPageId === undefined ? {} : { currentPageId })}
          />
        }
        footer={
          <StorefrontFooter
            storeName={data.store.name}
            settings={data.settings}
            helpLinks={data.footerNavigation.help}
            institutionalLinks={data.footerNavigation.institutional}
            copyrightYear={data.copyrightYear}
          />
        }
      >
        {children}
      </StorefrontLayout>
    </StorefrontThemeProvider>
  );
}

export function PublicStorefrontPageComposition({
  data,
  page,
}: {
  data: PublicStorefrontFrameData;
  page: StorefrontPageDefinition;
}) {
  return (
    <PublicStorefrontFrame data={data} currentPageId={page.id}>
      <StorefrontPage page={page} />
    </PublicStorefrontFrame>
  );
}
