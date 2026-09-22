import type { StoreSettings } from "@/domain/store-settings";

export interface StorefrontTheme {
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  typography: {
    body: string;
    heading: string;
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
  };
  assets: {
    logoUrl: string | null;
    faviconUrl: string | null;
  };
}

const DEFAULT_COLORS = {
  primary: "#24303F",
  secondary: "#E8EDF2",
  accent: "#147D6F",
  text: "#1D252D",
  background: "#FFFFFF",
} as const;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function safeColor(value: string | null, fallback: string): string {
  return value && HEX_COLOR.test(value) ? value : fallback;
}

function readableForeground(background: string): string {
  const red = Number.parseInt(background.slice(1, 3), 16);
  const green = Number.parseInt(background.slice(3, 5), 16);
  const blue = Number.parseInt(background.slice(5, 7), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance >= 150 ? "#17202A" : "#FFFFFF";
}

export function createStorefrontTheme(settings: StoreSettings | null): StorefrontTheme {
  const primary = safeColor(settings?.primaryColor ?? null, DEFAULT_COLORS.primary);

  return {
    colors: {
      primary,
      primaryForeground: readableForeground(primary),
      secondary: safeColor(settings?.secondaryColor ?? null, DEFAULT_COLORS.secondary),
      accent: safeColor(settings?.accentColor ?? null, DEFAULT_COLORS.accent),
      text: safeColor(settings?.textColor ?? null, DEFAULT_COLORS.text),
      background: safeColor(settings?.backgroundColor ?? null, DEFAULT_COLORS.background),
    },
    typography: {
      body: "var(--font-interface)",
      heading: "var(--font-interface)",
    },
    button: { radius: "0.375rem", weight: 600 },
    card: { radius: "0.5rem", borderWidth: "1px" },
    spacing: { section: "clamp(3rem, 7vw, 6rem)", content: "clamp(1rem, 4vw, 2rem)" },
    assets: {
      logoUrl: settings?.logoUrl ?? null,
      faviconUrl: settings?.faviconUrl ?? null,
    },
  };
}
