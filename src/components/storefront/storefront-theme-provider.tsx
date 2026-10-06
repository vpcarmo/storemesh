import type { CSSProperties, ReactNode } from "react";

import type { StorefrontTheme } from "@/domain/storefront-theme";

type ThemeStyle = CSSProperties & Record<`--storefront-${string}`, string | number>;

export function StorefrontThemeProvider({
  theme,
  children,
}: {
  theme: StorefrontTheme;
  children: ReactNode;
}) {
  const style: ThemeStyle = {
    "--storefront-primary": theme.colors.primary,
    "--storefront-primary-foreground": theme.colors.primaryForeground,
    "--storefront-secondary": theme.colors.secondary,
    "--storefront-accent": theme.colors.accent,
    "--storefront-text": theme.colors.text,
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
  };

  return (
    <div className="storefront-theme" style={style}>
      {theme.background.imageUrl ? (
        <div className="storefront-global-background" aria-hidden="true">
          <img src={theme.background.imageUrl} alt="" />
          <span />
        </div>
      ) : null}
      {children}
    </div>
  );
}
