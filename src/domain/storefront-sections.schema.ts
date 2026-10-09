import { z } from "zod";

import { storefrontHexColorSchema } from "@/domain/storefront-design.schema";
import {
  STOREFRONT_SECTION_CONTENT_ALIGNMENTS,
  STOREFRONT_SECTION_CONTENT_WIDTHS,
  STOREFRONT_SECTION_SPACINGS,
} from "@/domain/storefront";

export const STOREFRONT_TEXT_CONTENT_MAX_LENGTH = 20_000;

const nonBlankString = z.string().refine((value) => value.trim().length > 0, "Campo obrigatório.");
const optionalDescription = z.string().nullable().optional();
const sectionBase = {
  id: nonBlankString,
  backgroundColor: storefrontHexColorSchema.optional(),
};
const sectionLayout = {
  sectionSpacing: z.enum(STOREFRONT_SECTION_SPACINGS).optional(),
  contentWidth: z.enum(STOREFRONT_SECTION_CONTENT_WIDTHS).optional(),
  contentAlignment: z.enum(STOREFRONT_SECTION_CONTENT_ALIGNMENTS).optional(),
};
const safeHref = nonBlankString.refine((value) => {
  const href = value.trim();
  if (
    href !== value ||
    [...href].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  )
    return false;
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) {
    try {
      const url = new URL(href);
      return (url.protocol === "http:" || url.protocol === "https:") && /^https?:\/\//i.test(href);
    } catch {
      return false;
    }
  }
  return !href.startsWith("//") && !href.startsWith("\\\\");
}, "Use um caminho interno ou uma URL HTTP(S) segura.");

const actionSchema = z.object({ label: nonBlankString, href: safeHref }).strict();

const heroSectionSchema = z
  .object({
    ...sectionBase,
    type: z.literal("hero"),
    title: z.string(),
    description: optionalDescription,
    action: actionSchema.optional(),
    imageMediaAssetId: z.string().uuid().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    imageAlt: z.string().nullable().optional(),
  })
  .strict();

const bannerSectionSchema = z
  .object({
    ...sectionBase,
    type: z.literal("banner"),
    message: z.string(),
    action: actionSchema.optional(),
    imageMediaAssetId: z.string().uuid().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    imageAlt: z.string().nullable().optional(),
  })
  .strict();

const categoriesSectionSchema = z
  .object({
    ...sectionBase,
    ...sectionLayout,
    type: z.literal("categories"),
    title: z.string().optional(),
    categories: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            name: z.string().min(1).max(120),
            description: z.string().max(2000).nullable(),
          })
          .strict(),
      )
      .superRefine((categories, context) => {
        if (new Set(categories.map(({ id }) => id)).size !== categories.length)
          context.addIssue({
            code: "custom",
            message: "Uma categoria não pode ser selecionada mais de uma vez.",
          });
      }),
  })
  .strict();

const productGridSectionSchema = z
  .object({
    ...sectionBase,
    ...sectionLayout,
    type: z.literal("product-grid"),
    title: z.string().optional(),
    products: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            name: z.string().min(1).max(160),
            description: z.string().max(20000),
            price: z.number().finite().min(0).max(9999999999.99),
          })
          .strict(),
      )
      .superRefine((products, context) => {
        if (new Set(products.map(({ id }) => id)).size !== products.length)
          context.addIssue({
            code: "custom",
            message: "Um produto não pode ser selecionado mais de uma vez.",
          });
      }),
  })
  .strict();

const textContentSectionReadSchema = z
  .object({
    ...sectionBase,
    ...sectionLayout,
    type: z.literal("text-content"),
    title: z.string().optional(),
    content: z.string(),
    contentFormat: z.enum(["plain", "markdown"]).optional(),
  })
  .strict();
const textContentSectionSchema = textContentSectionReadSchema.extend({
  content: z
    .string()
    .max(STOREFRONT_TEXT_CONTENT_MAX_LENGTH, "O conteúdo deve ter até 20.000 caracteres."),
});

const callToActionSectionSchema = z
  .object({
    ...sectionBase,
    type: z.literal("call-to-action"),
    title: z.string(),
    description: optionalDescription,
    action: actionSchema,
  })
  .strict();

const createStorefrontSectionSchema = (textContentSchema: typeof textContentSectionSchema) =>
  z.discriminatedUnion("type", [
    heroSectionSchema,
    bannerSectionSchema,
    categoriesSectionSchema,
    productGridSectionSchema,
    textContentSchema,
    callToActionSectionSchema,
  ]);

const createStorefrontSectionsSchema = (textContentSchema: typeof textContentSectionSchema) =>
  z.array(createStorefrontSectionSchema(textContentSchema)).superRefine((sections, context) => {
    const ids = new Set<string>();
    sections.forEach((section, index) => {
      if (ids.has(section.id))
        context.addIssue({
          code: "custom",
          path: [index, "id"],
          message: "Cada seção precisa ter um identificador único.",
        });
      ids.add(section.id);
    });
  });

const textContentReadSchema = textContentSectionReadSchema;

export const storefrontSectionsReadSchema = createStorefrontSectionsSchema(textContentReadSchema);
export const storefrontSectionsSchema = createStorefrontSectionsSchema(textContentSectionSchema);

export function parseStorefrontSectionsForSave(input: unknown, previousSections?: unknown) {
  const parsed = storefrontSectionsSchema.safeParse(input);
  if (parsed.success || previousSections === undefined) return parsed;
  if (
    !parsed.error.issues.every(
      (issue) => issue.code === "too_big" && issue.path.length === 2 && issue.path[1] === "content",
    )
  )
    return parsed;

  const currentReadable = storefrontSectionsReadSchema.safeParse(input);
  const previousReadable = storefrontSectionsReadSchema.safeParse(previousSections);
  if (!currentReadable.success || !previousReadable.success) return parsed;

  const previousTextContent = new Map(
    previousReadable.data.flatMap((section) =>
      section.type === "text-content" ? [[section.id, section.content] as const] : [],
    ),
  );
  const hasChangedOversizedContent = currentReadable.data.some(
    (section) =>
      section.type === "text-content" &&
      section.content.length > STOREFRONT_TEXT_CONTENT_MAX_LENGTH &&
      previousTextContent.get(section.id) !== section.content,
  );
  return hasChangedOversizedContent ? parsed : currentReadable;
}
