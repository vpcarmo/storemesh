import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

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
};

export function parseStorefrontDesignSettings(value: unknown): StorefrontDesignSettings {
  const result = StorefrontDesignSettingsSchema.safeParse(value);
  return result.success ? result.data : DEFAULT_STOREFRONT_DESIGN_SETTINGS;
}
