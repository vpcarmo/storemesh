import { z } from "zod";

export const storefrontHexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const STOREFRONT_FONT_FAMILIES = ["system", "arial", "georgia", "verdana"] as const;
export const STOREFRONT_FONT_SCALES = ["compact", "standard", "expanded"] as const;
export const STOREFRONT_LINE_HEIGHTS = ["compact", "standard", "spacious"] as const;
export const STOREFRONT_LETTER_SPACINGS = ["compact", "standard", "expanded"] as const;
export const STOREFRONT_TITLE_FONT_WEIGHTS = ["regular", "medium", "semibold", "bold"] as const;
export const STOREFRONT_BODY_FONT_WEIGHTS = ["regular", "medium", "semibold"] as const;

const DEFAULT_HEADER_SETTINGS = {
  layout: "stacked",
  navigationAlignment: "left",
  showStoreName: true,
  logoSize: "medium",
  navigationGap: "comfortable",
} as const;

const DEFAULT_FOOTER_SETTINGS = {
  columns: "auto",
  alignment: "left",
  showLogo: false,
  showDescription: true,
  spacing: "comfortable",
  helpPages: [] as string[],
  institutionalPages: [] as string[],
} as const;

const footerPageId = z.string().uuid();
const footerPageIds = z
  .array(footerPageId)
  .default([])
  .refine((ids) => new Set(ids).size === ids.length, "Uma página não pode se repetir no grupo.");

export const StorefrontDesignSettingsSchema = z
  .object({
    typographyPreset: z.enum(["modern", "editorial", "neutral"]),
    titleFontFamily: z.enum(STOREFRONT_FONT_FAMILIES).optional(),
    bodyFontFamily: z.enum(STOREFRONT_FONT_FAMILIES).optional(),
    titleFontScale: z.enum(STOREFRONT_FONT_SCALES).optional(),
    bodyFontScale: z.enum(STOREFRONT_FONT_SCALES).optional(),
    titleLineHeight: z.enum(STOREFRONT_LINE_HEIGHTS).optional(),
    bodyLineHeight: z.enum(STOREFRONT_LINE_HEIGHTS).optional(),
    titleLetterSpacing: z.enum(STOREFRONT_LETTER_SPACINGS).optional(),
    bodyLetterSpacing: z.enum(STOREFRONT_LETTER_SPACINGS).optional(),
    titleFontWeight: z.enum(STOREFRONT_TITLE_FONT_WEIGHTS).optional(),
    bodyFontWeight: z.enum(STOREFRONT_BODY_FONT_WEIGHTS).optional(),
    density: z.enum(["compact", "comfortable", "spacious"]),
    radius: z.enum(["sharp", "soft", "rounded"]),
    shadow: z.enum(["none", "subtle", "strong"]),
    container: z.enum(["narrow", "standard", "wide"]),
    linkColor: storefrontHexColorSchema.optional(),
    mutedTextColor: storefrontHexColorSchema.optional(),
    surfaceColor: storefrontHexColorSchema.optional(),
    sectionBackgroundColor: storefrontHexColorSchema.optional(),
    background: z.discriminatedUnion("type", [
      z.object({ type: z.literal("solid") }),
      z.object({
        type: z.literal("gradient"),
        startColor: storefrontHexColorSchema,
        endColor: storefrontHexColorSchema,
        direction: z.enum(["right", "bottom", "bottom-right", "left", "top"]),
      }),
      z.object({
        type: z.literal("image"),
        mediaAssetId: z.string().uuid().nullable(),
        position: z.enum(["center", "top", "bottom", "left", "right"]),
        size: z.enum(["cover", "contain"]),
        overlay: z.enum(["none", "light", "medium", "strong"]),
      }),
    ]),
    header: z
      .object({
        layout: z.enum(["stacked", "inline"]),
        navigationAlignment: z.enum(["left", "center", "right"]),
        showStoreName: z.boolean(),
        logoSize: z.enum(["small", "medium", "large"]),
        navigationGap: z.enum(["compact", "comfortable", "spacious"]),
      })
      .strict()
      .default(DEFAULT_HEADER_SETTINGS),
    footer: z
      .object({
        columns: z.enum(["auto", "1", "2", "3", "4"]),
        alignment: z.enum(["left", "center"]),
        showLogo: z.boolean(),
        showDescription: z.boolean(),
        spacing: z.enum(["compact", "comfortable", "spacious"]),
        helpPages: footerPageIds,
        institutionalPages: footerPageIds,
      })
      .strict()
      .default(DEFAULT_FOOTER_SETTINGS),
  })
  .strict();

export type StorefrontDesignSettings = z.infer<typeof StorefrontDesignSettingsSchema>;

export const DEFAULT_STOREFRONT_DESIGN_SETTINGS: StorefrontDesignSettings = {
  typographyPreset: "modern",
  density: "comfortable",
  radius: "soft",
  shadow: "none",
  container: "standard",
  background: { type: "solid" },
  header: DEFAULT_HEADER_SETTINGS,
  footer: DEFAULT_FOOTER_SETTINGS,
};

export function parseStorefrontDesignSettings(value: unknown): StorefrontDesignSettings {
  const sanitizedValue =
    value && typeof value === "object" && !Array.isArray(value)
      ? sanitizeFooterPageReferences(value as Record<string, unknown>)
      : value;
  const result = StorefrontDesignSettingsSchema.safeParse(sanitizedValue);
  return result.success ? result.data : DEFAULT_STOREFRONT_DESIGN_SETTINGS;
}

function sanitizeFooterPageReferences(value: Record<string, unknown>): Record<string, unknown> {
  const footer = value["footer"];
  if (!footer || typeof footer !== "object" || Array.isArray(footer)) return value;

  const footerSettings = footer as Record<string, unknown>;
  const pageIds = (input: unknown): string[] => {
    if (!Array.isArray(input)) return [];
    const validIds = input.filter((id): id is string => footerPageId.safeParse(id).success);
    return [...new Set(validIds)];
  };
  return {
    ...value,
    footer: {
      ...footerSettings,
      helpPages: pageIds(footerSettings["helpPages"]),
      institutionalPages: pageIds(footerSettings["institutionalPages"]),
    },
  };
}
