import type { StorefrontSectionDefinition } from "@/domain/storefront";
import type { StorefrontDesignSettings } from "@/domain/storefront-design.schema";

export const STOREFRONT_TEMPLATE_IDS = [
  "fashion-fitness",
  "electronics",
  "restaurant",
  "services",
] as const;

export type StorefrontTemplateId = (typeof STOREFRONT_TEMPLATE_IDS)[number];
export type StorefrontTypographyPreset = StorefrontDesignSettings["typographyPreset"];

export interface StorefrontTemplateDefinition {
  id: StorefrontTemplateId;
  name: string;
  description: string;
  typographyPreset: StorefrontTypographyPreset;
  sections(storeSlug: string): StorefrontSectionDefinition[];
}

export const STOREFRONT_TEMPLATES: readonly StorefrontTemplateDefinition[] = [
  {
    id: "fashion-fitness",
    name: "Moda e fitness",
    description: "Categorias, produtos em destaque e benefícios sem dados de catálogo fictícios.",
    typographyPreset: "editorial",
    sections: (storeSlug) => [
      {
        id: "hero",
        type: "hero",
        title: "Apresente sua coleção",
        description: "Destaque suas novidades e convide seus clientes a explorar a loja.",
      },
      {
        id: "categories",
        type: "categories",
        title: "Explore por categoria",
        categories: [],
        sectionSpacing: "spacious",
        contentWidth: "wide",
      },
      {
        id: "featured-products",
        type: "product-grid",
        title: "Produtos em destaque",
        products: [],
        sectionSpacing: "spacious",
        contentWidth: "wide",
      },
      {
        id: "benefits",
        type: "benefits",
        title: "Por que comprar aqui?",
        benefits: [],
        sectionSpacing: "default",
        contentWidth: "default",
      },
      {
        id: "cta",
        type: "call-to-action",
        title: "Encontre o que procura",
        description: "Explore os produtos disponíveis na loja.",
        action: { label: "Ver catálogo", href: `/store/${storeSlug}/catalog` },
      },
    ],
  },
  {
    id: "electronics",
    name: "Eletrônicos e informática",
    description: "Produtos, categorias, benefícios, ofertas em banner e FAQ editável.",
    typographyPreset: "modern",
    sections: (storeSlug) => [
      {
        id: "hero",
        type: "hero",
        title: "Apresente sua loja",
        description: "Destaque seus produtos e ajude seus clientes a encontrar o que precisam.",
      },
      {
        id: "categories",
        type: "categories",
        title: "Categorias",
        categories: [],
        sectionSpacing: "spacious",
        contentWidth: "wide",
      },
      {
        id: "products",
        type: "product-grid",
        title: "Produtos",
        products: [],
        sectionSpacing: "spacious",
        contentWidth: "wide",
      },
      {
        id: "benefits",
        type: "benefits",
        title: "Benefícios e diferenciais",
        benefits: [],
        sectionSpacing: "default",
        contentWidth: "default",
      },
      {
        id: "offers",
        type: "banner",
        message: "Destaque aqui suas ofertas ativas.",
        action: { label: "Ver catálogo", href: `/store/${storeSlug}/catalog` },
      },
      {
        id: "faq",
        type: "faq",
        title: "Perguntas frequentes",
        items: [],
        sectionSpacing: "default",
        contentWidth: "narrow",
      },
    ],
  },
  {
    id: "restaurant",
    name: "Restaurante e alimentação",
    description: "Apresentação visual, galeria editorial e conteúdo institucional.",
    typographyPreset: "editorial",
    sections: (storeSlug) => [
      {
        id: "hero",
        type: "hero",
        title: "Apresente seu restaurante",
        description: "Conte aos visitantes o que eles podem encontrar por aqui.",
      },
      {
        id: "image-text",
        type: "image-text",
        title: "Nossa proposta",
        description: "Apresente sua cozinha, seus produtos ou a experiência que oferece.",
        imagePosition: "left",
        sectionSpacing: "spacious",
        contentWidth: "wide",
      },
      {
        id: "editorial-gallery",
        type: "editorial-gallery",
        title: "Galeria",
        images: [],
        sectionSpacing: "spacious",
        contentWidth: "wide",
      },
      {
        id: "about",
        type: "text-content",
        title: "Sobre o restaurante",
        content: "Escreva aqui a apresentação institucional do seu negócio.",
        contentFormat: "plain",
        sectionSpacing: "default",
        contentWidth: "narrow",
      },
      {
        id: "cta",
        type: "call-to-action",
        title: "Conheça nossas opções",
        description: "Veja os produtos disponíveis.",
        action: { label: "Ver catálogo", href: `/store/${storeSlug}/catalog` },
      },
    ],
  },
  {
    id: "services",
    name: "Serviços e institucional",
    description: "Apresentação, benefícios, espaços para depoimentos e FAQ.",
    typographyPreset: "neutral",
    sections: (storeSlug) => [
      {
        id: "hero",
        type: "hero",
        title: "Apresente seu negócio",
        description: "Explique de forma clara como sua empresa pode ajudar seus clientes.",
      },
      {
        id: "image-text",
        type: "image-text",
        title: "Sobre o negócio",
        description: "Conte sua história e apresente seus serviços.",
        imagePosition: "right",
        sectionSpacing: "spacious",
        contentWidth: "wide",
      },
      {
        id: "benefits",
        type: "benefits",
        title: "Benefícios e diferenciais",
        benefits: [],
        sectionSpacing: "default",
        contentWidth: "wide",
      },
      {
        id: "testimonials",
        type: "testimonials",
        title: "Depoimentos",
        testimonials: [],
        sectionSpacing: "default",
        contentWidth: "wide",
      },
      {
        id: "faq",
        type: "faq",
        title: "Perguntas frequentes",
        items: [],
        sectionSpacing: "default",
        contentWidth: "narrow",
      },
      {
        id: "cta",
        type: "call-to-action",
        title: "Conheça nossas opções",
        description: "Veja os produtos e serviços cadastrados.",
        action: { label: "Saiba mais", href: `/store/${storeSlug}/catalog` },
      },
    ],
  },
];

export function getStorefrontTemplate(id: StorefrontTemplateId): StorefrontTemplateDefinition {
  const template = STOREFRONT_TEMPLATES.find((item) => item.id === id);
  if (!template) throw new Error("O modelo selecionado não existe.");
  return template;
}
