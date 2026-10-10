import type { StorefrontSectionDefinition } from "@/domain/storefront";
import type { StorefrontDesignSettings } from "@/domain/storefront-design.schema";

export const STOREFRONT_TEMPLATE_IDS = [
  "fashion-fitness",
  "electronics",
  "restaurant",
  "services",
  "about-us",
  "contact",
  "services-page",
  "faq-page",
  "gallery",
  "landing-page",
] as const;

export const STOREFRONT_HOME_TEMPLATE_IDS = [
  "fashion-fitness",
  "electronics",
  "restaurant",
  "services",
] as const;

export const STOREFRONT_PAGE_TEMPLATE_IDS = [
  "about-us",
  "contact",
  "services-page",
  "faq-page",
  "gallery",
  "landing-page",
] as const;

export type StorefrontTemplateId = (typeof STOREFRONT_TEMPLATE_IDS)[number];
export type StorefrontTypographyPreset = StorefrontDesignSettings["typographyPreset"];

interface StorefrontTemplateBase {
  id: StorefrontTemplateId;
  name: string;
  description: string;
  typographyPreset: StorefrontTypographyPreset;
  sections(storeSlug: string): StorefrontSectionDefinition[];
}

export type StorefrontTemplateDefinition = StorefrontTemplateBase &
  ({ purpose: "home" } | { purpose: "page"; page: { title: string; slug: string } });

export const STOREFRONT_TEMPLATES: readonly StorefrontTemplateDefinition[] = [
  {
    id: "fashion-fitness",
    purpose: "home",
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
    purpose: "home",
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
    purpose: "home",
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
    purpose: "home",
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
  {
    id: "about-us",
    purpose: "page",
    page: { title: "Sobre nós", slug: "sobre-nos" },
    name: "Sobre nós",
    description: "Cria uma nova página editável para apresentar sua empresa e seus diferenciais.",
    typographyPreset: "editorial",
    sections: (storeSlug) => [
      {
        id: "hero",
        type: "hero",
        title: "Sobre nós",
        description: "Apresente sua empresa e conte o que a torna especial.",
      },
      {
        id: "image-text",
        type: "image-text",
        title: "Nossa história",
        description: "Conte a história do seu negócio. Você pode selecionar uma imagem depois.",
        imagePosition: "left",
        sectionSpacing: "spacious",
        contentWidth: "wide",
      },
      {
        id: "institutional-content",
        type: "text-content",
        title: "Quem somos",
        content: "Escreva aqui uma apresentação institucional da sua empresa.",
        contentFormat: "plain",
        sectionSpacing: "default",
        contentWidth: "narrow",
      },
      {
        id: "benefits",
        type: "benefits",
        title: "Nossos diferenciais",
        benefits: [],
        sectionSpacing: "default",
        contentWidth: "wide",
      },
      {
        id: "cta",
        type: "call-to-action",
        title: "Saiba mais",
        description: "Apresente o próximo passo para quem visita sua página.",
        action: { label: "Voltar à página inicial", href: `/store/${storeSlug}` },
      },
    ],
  },
  {
    id: "contact",
    purpose: "page",
    page: { title: "Contato", slug: "contato" },
    name: "Contato",
    description: "Cria uma nova página para apresentar canais de contato e orientar visitantes.",
    typographyPreset: "modern",
    sections: (storeSlug) => [
      {
        id: "hero",
        type: "hero",
        title: "Entre em contato",
        description: "Use esta página para orientar seus clientes sobre como falar com você.",
      },
      {
        id: "contact-content",
        type: "text-content",
        title: "Como falar conosco",
        content: "Adicione aqui seus canais de atendimento e informações de contato.",
        contentFormat: "plain",
        sectionSpacing: "default",
        contentWidth: "narrow",
      },
      {
        id: "cta",
        type: "call-to-action",
        title: "Estamos à disposição",
        description: "Apresente uma orientação adicional para seus visitantes.",
        action: {
          label: "Voltar à página inicial",
          href: `/store/${storeSlug}`,
        },
      },
    ],
  },
  {
    id: "services-page",
    purpose: "page",
    page: { title: "Serviços", slug: "servicos" },
    name: "Serviços",
    description: "Cria uma nova página para apresentar serviços, diferenciais e respostas.",
    typographyPreset: "neutral",
    sections: (storeSlug) => [
      {
        id: "hero",
        type: "hero",
        title: "Nossos serviços",
        description: "Apresente os serviços que sua empresa oferece.",
      },
      {
        id: "image-text",
        type: "image-text",
        title: "Como podemos ajudar",
        description: "Explique sua abordagem. Você pode selecionar uma imagem depois.",
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
        title: "Saiba mais",
        description: "Apresente o próximo passo para conhecer seus serviços.",
        action: {
          label: "Voltar à página inicial",
          href: `/store/${storeSlug}`,
        },
      },
    ],
  },
  {
    id: "faq-page",
    purpose: "page",
    page: { title: "Perguntas frequentes", slug: "perguntas-frequentes" },
    name: "Perguntas frequentes",
    description: "Cria uma nova página com espaço para respostas às dúvidas dos seus clientes.",
    typographyPreset: "modern",
    sections: () => [
      {
        id: "hero",
        type: "hero",
        title: "Perguntas frequentes",
        description: "Reúna aqui respostas úteis para seus clientes.",
      },
      {
        id: "faq",
        type: "faq",
        title: "Dúvidas comuns",
        items: [],
        sectionSpacing: "default",
        contentWidth: "narrow",
      },
    ],
  },
  {
    id: "gallery",
    purpose: "page",
    page: { title: "Galeria/Portfólio", slug: "galeria-portfolio" },
    name: "Galeria/Portfólio",
    description:
      "Cria uma nova página institucional com uma galeria editorial sem imagens pré-selecionadas.",
    typographyPreset: "editorial",
    sections: () => [
      {
        id: "hero",
        type: "hero",
        title: "Galeria e portfólio",
        description: "Apresente trabalhos, projetos ou momentos do seu negócio.",
      },
      {
        id: "institutional-content",
        type: "text-content",
        title: "Sobre este portfólio",
        content: "Escreva aqui uma introdução para os trabalhos apresentados nesta página.",
        contentFormat: "plain",
        sectionSpacing: "default",
        contentWidth: "narrow",
      },
      {
        id: "editorial-gallery",
        type: "editorial-gallery",
        title: "Galeria",
        images: [],
        sectionSpacing: "spacious",
        contentWidth: "wide",
      },
    ],
  },
  {
    id: "landing-page",
    purpose: "page",
    page: { title: "Landing page", slug: "landing-page" },
    name: "Landing page",
    description: "Cria uma nova página editável para apresentar uma oferta, projeto ou campanha.",
    typographyPreset: "modern",
    sections: (storeSlug) => [
      {
        id: "hero",
        type: "hero",
        title: "Apresente sua ideia",
        description: "Explique de forma clara o objetivo desta página.",
      },
      {
        id: "benefits",
        type: "benefits",
        title: "Principais benefícios",
        benefits: [],
        sectionSpacing: "default",
        contentWidth: "wide",
      },
      {
        id: "image-text",
        type: "image-text",
        title: "Saiba mais",
        description: "Adicione informações relevantes. Você pode selecionar uma imagem depois.",
        imagePosition: "left",
        sectionSpacing: "spacious",
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
        title: "Próximo passo",
        description: "Convide os visitantes a conhecer mais sobre sua loja.",
        action: {
          label: "Voltar à página inicial",
          href: `/store/${storeSlug}`,
        },
      },
    ],
  },
];

export function getStorefrontTemplate(id: StorefrontTemplateId): StorefrontTemplateDefinition {
  const template = STOREFRONT_TEMPLATES.find((item) => item.id === id);
  if (!template) throw new Error("O modelo selecionado não existe.");
  return template;
}

export function getStorefrontPageTemplate(
  id: (typeof STOREFRONT_PAGE_TEMPLATE_IDS)[number],
): StorefrontTemplateDefinition & { purpose: "page" } {
  const template = getStorefrontTemplate(id);
  if (template.purpose !== "page") throw new Error("O modelo selecionado não cria uma página.");
  return template;
}
