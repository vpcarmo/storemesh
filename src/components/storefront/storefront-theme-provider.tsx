import { type ReactNode } from "react";

import type { StorefrontTheme } from "@/domain/storefront-theme";
import {
  StorefrontThemeStyleContext,
  type StorefrontThemeStyle,
} from "@/components/storefront/storefront-theme-context";

export function StorefrontThemeProvider({
  theme,
  children,
}: {
  theme: StorefrontTheme;
  children: ReactNode;
}) {
  const style: StorefrontThemeStyle = {
    "--storefront-primary": theme.colors.primary,
    "--storefront-primary-foreground": theme.colors.primaryForeground,
    "--storefront-secondary": theme.colors.secondary,
    "--storefront-accent": theme.colors.accent,
    "--storefront-text": theme.colors.text,
    "--storefront-surface": theme.colors.background,
    "--storefront-background": theme.background.value,
    "--storefront-font-body": theme.typography.body,
    "--storefront-font-heading": theme.typography.heading,
    "--storefront-button-radius": theme.button.radius,
    "--storefront-button-weight": theme.button.weight,
    "--storefront-card-radius": theme.card.radius,
    "--storefront-card-border-width": theme.card.borderWidth,
    "--storefront-section-space": theme.spacing.section,
    "--storefront-content-space": theme.spacing.content,
    "--storefront-grid-space": theme.spacing.grid,
    "--storefront-card-space": theme.spacing.card,
    "--storefront-shadow": theme.shadows.elevation,
    "--storefront-container-width": theme.container.width,
    "--storefront-background-position": theme.background.position,
    "--storefront-background-size": theme.background.size,
    "--storefront-background-overlay-opacity": theme.background.overlayOpacity,
    "--storefront-header-layout": theme.header.layout,
    "--storefront-header-navigation-alignment": theme.header.navigationAlignment,
    "--storefront-header-show-store-name": String(theme.header.showStoreName),
    "--storefront-header-logo-size": theme.header.logoSize,
    "--storefront-header-navigation-gap": theme.header.navigationGap,
    "--storefront-footer-columns": theme.footer.columns,
    "--storefront-footer-alignment": theme.footer.alignment,
    "--storefront-footer-show-logo": String(theme.footer.showLogo),
    "--storefront-footer-show-description": String(theme.footer.showDescription),
    "--storefront-footer-spacing": theme.footer.spacing,
  };

  return (
    <StorefrontThemeStyleContext.Provider value={style}>
      <div
        className="storefront-theme"
        data-storefront-header-show-store-name={theme.header.showStoreName}
        data-storefront-header-logo-size={theme.header.logoSize}
        data-storefront-header-navigation-gap={theme.header.navigationGap}
        style={style}
      >
        {theme.background.imageUrl ? (
          <div className="storefront-global-background" aria-hidden="true">
            <img src={theme.background.imageUrl} alt="" />
            <span />
          </div>
        ) : null}
        {children}
      </div>
    </StorefrontThemeStyleContext.Provider>
  );
}
