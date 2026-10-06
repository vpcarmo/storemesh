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
} as const;

export const StorefrontDesignSettingsSchema = z
  .object({
    typographyPreset: z.enum(["modern", "editorial", "neutral"]),
    density: z.enum(["compact", "comfortable", "spacious"]),
    radius: z.enum(["sharp", "soft", "rounded"]),
    shadow: z.enum(["none", "subtle", "strong"]),
    container: z.enum(["narrow", "standard", "wide"]),
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
  const result = StorefrontDesignSettingsSchema.safeParse(value);
  return result.success ? result.data : DEFAULT_STOREFRONT_DESIGN_SETTINGS;
}
