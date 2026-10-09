import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

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
    density: z.enum(["compact", "comfortable", "spacious"]),
    radius: z.enum(["sharp", "soft", "rounded"]),
    shadow: z.enum(["none", "subtle", "strong"]),
    container: z.enum(["narrow", "standard", "wide"]),
    linkColor: hexColor.optional(),
    mutedTextColor: hexColor.optional(),
    surfaceColor: hexColor.optional(),
    sectionBackgroundColor: hexColor.optional(),
    background: z.discriminatedUnion("type", [
      z.object({ type: z.literal("solid") }),
      z.object({
        type: z.literal("gradient"),
        startColor: hexColor,
        endColor: hexColor,
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
