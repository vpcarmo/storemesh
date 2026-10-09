import type { StorefrontDesignSettings } from "@/domain/storefront-design.schema";
import type { StoreSettings } from "@/domain/store-settings";
import {
  DEFAULT_STOREFRONT_DESIGN_SETTINGS,
  parseStorefrontDesignSettings,
  STOREFRONT_FONT_FAMILIES,
} from "@/domain/storefront-design.schema";

export interface StorefrontTheme {
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    accent: string;
    accentForeground: string;
    link: string;
    text: string;
    muted: string | null;
    background: string;
    surface: string | null;
    sectionBackground: string | null;
  };
  typography: {
    body: string;
    heading: string;
    bodyScale: number;
    headingScale: number;
    bodyLineHeight: number | null;
    headingLineHeight: number | null;
    bodyLetterSpacing: string | null;
    headingLetterSpacing: string | null;
    bodyWeight: number;
    headingWeight: number;
  };
  button: {
    radius: string;
    weight: number;
  };
  card: {
    radius: string;
    borderWidth: string;
  };
  spacing: {
    section: string;
    content: string;
    grid: string;
    card: string;
  };
  shadows: {
    elevation: string;
  };
  container: {
    width: string;
  };
  background: {
    value: string;
    imageUrl: string | null;
    position: "center" | "top" | "bottom" | "left" | "right";
    size: "cover" | "contain";
    overlayOpacity: number;
  };
  assets: {
    logoUrl: string | null;
    faviconUrl: string | null;
  };
  header: StorefrontDesignSettings["header"];
  footer: StorefrontDesignSettings["footer"];
}

export const DEFAULT_STOREFRONT_COLORS = {
  primary: "#24303F",
  secondary: "#E8EDF2",
  accent: "#147D6F",
  text: "#1D252D",
  background: "#FFFFFF",
} as const;

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isValidStorefrontHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

function safeColor(value: string | null, fallback: string): string {
  return value && isValidStorefrontHexColor(value) ? value : fallback;
}

function readableForeground(background: string): string {
  const red = Number.parseInt(background.slice(1, 3), 16);
  const green = Number.parseInt(background.slice(3, 5), 16);
  const blue = Number.parseInt(background.slice(5, 7), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance >= 150 ? "#17202A" : "#FFFFFF";
}

function highContrastForeground(background: string): string {
  const linearChannel = (index: number) => {
    const channel = Number.parseInt(background.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * linearChannel(1) + 0.7152 * linearChannel(3) + 0.0722 * linearChannel(5);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const blackContrast = (luminance + 0.05) / 0.05;
  return whiteContrast >= blackContrast ? "#FFFFFF" : "#000000";
}

export function createStorefrontTheme(
  settings: Partial<StoreSettings> | null,
  backgroundImageUrl: string | null = null,
): StorefrontTheme {
  const primary = safeColor(settings?.primaryColor ?? null, DEFAULT_STOREFRONT_COLORS.primary);
  const accent = safeColor(settings?.accentColor ?? null, primary);
  const design = parseStorefrontDesignSettings(
    settings?.designSettings ?? DEFAULT_STOREFRONT_DESIGN_SETTINGS,
  );
  const backgroundColor = safeColor(
    settings?.backgroundColor ?? null,
    DEFAULT_STOREFRONT_COLORS.background,
  );
  const typography = {
    modern: {
      body: "var(--font-interface)",
      heading: "var(--font-interface)",
    },
    editorial: {
      body: 'var(--font-interface), "Segoe UI", sans-serif',
      heading: 'Georgia, "Times New Roman", serif',
    },
    neutral: {
      body: 'Arial, "Helvetica Neue", sans-serif',
      heading: 'Arial, "Helvetica Neue", sans-serif',
    },
  }[design.typographyPreset];
  const fontFamilyStacks = {
    system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    arial: 'Arial, "Helvetica Neue", sans-serif',
    georgia: 'Georgia, "Times New Roman", serif',
    verdana: "Verdana, Geneva, sans-serif",
  } satisfies Record<(typeof STOREFRONT_FONT_FAMILIES)[number], string>;
  const resolvedTypography = {
    body: design.bodyFontFamily ? fontFamilyStacks[design.bodyFontFamily] : typography.body,
    heading: design.titleFontFamily ? fontFamilyStacks[design.titleFontFamily] : typography.heading,
    bodyScale: { compact: 0.9, standard: 1, expanded: 1.1 }[design.bodyFontScale ?? "standard"],
    headingScale: { compact: 0.9, standard: 1, expanded: 1.1 }[design.titleFontScale ?? "standard"],
    bodyLineHeight: design.bodyLineHeight
      ? { compact: 1.45, standard: 1.65, spacious: 1.85 }[design.bodyLineHeight]
      : null,
    headingLineHeight: design.titleLineHeight
      ? { compact: 1.05, standard: 1.15, spacious: 1.3 }[design.titleLineHeight]
      : null,
    bodyLetterSpacing: design.bodyLetterSpacing
      ? { compact: "-0.015em", standard: "0em", expanded: "0.04em" }[design.bodyLetterSpacing]
      : null,
    headingLetterSpacing: design.titleLetterSpacing
      ? { compact: "-0.03em", standard: "0em", expanded: "0.03em" }[design.titleLetterSpacing]
      : null,
    bodyWeight: { regular: 400, medium: 500, semibold: 600 }[design.bodyFontWeight ?? "regular"],
    headingWeight: { regular: 400, medium: 500, semibold: 600, bold: 700 }[
      design.titleFontWeight ?? "bold"
    ],
  };
  const spacing = {
    compact: {
      section: "clamp(2rem, 5vw, 4rem)",
      content: "clamp(0.875rem, 3vw, 1.5rem)",
      grid: "0.75rem",
      card: "0.875rem",
    },
    comfortable: {
      section: "clamp(3rem, 7vw, 6rem)",
      content: "clamp(1rem, 4vw, 2rem)",
      grid: "1rem",
      card: "1.25rem",
    },
    spacious: {
      section: "clamp(4rem, 9vw, 7rem)",
      content: "clamp(1.25rem, 5vw, 2.5rem)",
      grid: "1.5rem",
      card: "1.75rem",
    },
  }[design.density];
  const radius = {
    sharp: { button: "0", card: "0" },
    soft: { button: "0.375rem", card: "0.5rem" },
    rounded: { button: "0.75rem", card: "1rem" },
  }[design.radius];
  const shadow = {
    none: "none",
    subtle: "0 2px 10px rgb(0 0 0 / 0.08)",
    strong: "0 8px 24px rgb(0 0 0 / 0.18)",
  }[design.shadow];
  const container = {
    narrow: "56rem",
    standard: "72rem",
    wide: "80rem",
  }[design.container];
  const backgroundValue =
    design.background.type === "gradient"
      ? `linear-gradient(to ${design.background.direction.replace("-", " ")}, ${design.background.startColor}, ${design.background.endColor})`
      : backgroundColor;
  const overlayOpacity =
    design.background.type !== "image"
      ? 0
      : { none: 0, light: 0.15, medium: 0.3, strong: 0.45 }[design.background.overlay];

  return {
    colors: {
      primary,
      primaryForeground: readableForeground(primary),
      secondary: safeColor(settings?.secondaryColor ?? null, DEFAULT_STOREFRONT_COLORS.secondary),
      accent,
      accentForeground: highContrastForeground(accent),
      link: safeColor(design.linkColor ?? null, primary),
      text: safeColor(settings?.textColor ?? null, DEFAULT_STOREFRONT_COLORS.text),
      muted: design.mutedTextColor ?? null,
      background: backgroundColor,
      surface: design.surfaceColor ?? null,
      sectionBackground: design.sectionBackgroundColor ?? null,
    },
    typography: resolvedTypography,
    button: { radius: radius.button, weight: 600 },
    card: { radius: radius.card, borderWidth: "1px" },
    spacing,
    shadows: { elevation: shadow },
    container: { width: container },
    background: {
      value: backgroundValue,
      imageUrl: design.background.type === "image" ? backgroundImageUrl : null,
      position: design.background.type === "image" ? design.background.position : "center",
      size: design.background.type === "image" ? design.background.size : "cover",
      overlayOpacity,
    },
    assets: {
      logoUrl: settings?.logoUrl ?? null,
      faviconUrl: settings?.faviconUrl ?? null,
    },
    header: design.header,
    footer: design.footer,
  };
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
