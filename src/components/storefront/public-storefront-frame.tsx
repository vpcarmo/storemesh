import type { ReactNode } from "react";

import {
  StorefrontFooter,
  StorefrontHeader,
  StorefrontLayout,
} from "@/components/storefront/storefront-layout";
import { StorefrontThemeProvider } from "@/components/storefront/storefront-theme-provider";
import type { StorefrontNavigationItem } from "@/domain/storefront";
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
}: {
  data: PublicStorefrontFrameData;
  children: ReactNode;
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
