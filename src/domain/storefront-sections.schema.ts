import { z } from "zod";

const nonBlankString = z.string().refine((value) => value.trim().length > 0, "Campo obrigatório.");
const optionalDescription = z.string().nullable().optional();
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
    id: nonBlankString,
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
    id: nonBlankString,
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
    id: nonBlankString,
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
    id: nonBlankString,
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

const textContentSectionSchema = z
  .object({
    id: nonBlankString,
    type: z.literal("text-content"),
    title: z.string().optional(),
    content: z.string(),
  })
  .strict();

const callToActionSectionSchema = z
  .object({
    id: nonBlankString,
    type: z.literal("call-to-action"),
    title: z.string(),
    description: optionalDescription,
    action: actionSchema,
  })
  .strict();

export const storefrontSectionSchema = z.discriminatedUnion("type", [
  heroSectionSchema,
  bannerSectionSchema,
  categoriesSectionSchema,
  productGridSectionSchema,
  textContentSectionSchema,
  callToActionSectionSchema,
]);

export const storefrontSectionsSchema = z
  .array(storefrontSectionSchema)
  .superRefine((sections, context) => {
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
