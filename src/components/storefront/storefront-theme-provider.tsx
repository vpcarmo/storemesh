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
    "--storefront-background": theme.colors.background,
    "--storefront-font-body": theme.typography.body,
    "--storefront-font-heading": theme.typography.heading,
    "--storefront-button-radius": theme.button.radius,
    "--storefront-button-weight": theme.button.weight,
    "--storefront-card-radius": theme.card.radius,
    "--storefront-card-border-width": theme.card.borderWidth,
    "--storefront-section-space": theme.spacing.section,
    "--storefront-content-space": theme.spacing.content,
  };

  return (
    <div className="storefront-theme" style={style}>
      {children}
    </div>
  );
}