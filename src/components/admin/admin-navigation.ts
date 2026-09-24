export interface AdminNavigationItem {
  label: string;
  to?: string;
  comingSoon?: boolean;
}

export interface AdminNavigationGroup {
  label: string;
  to?: string;
  items?: AdminNavigationItem[];
  comingSoon?: boolean;
}

export const ADMIN_NAVIGATION: AdminNavigationGroup[] = [
  { label: "Dashboard", to: "/admin" },
  {
    label: "Website",
    to: "/admin/website",
    items: [
      { label: "Páginas", comingSoon: true },
      { label: "Navegação", comingSoon: true },
    ],
  },
  {
    label: "Catálogo",
    to: "/admin/catalog",
    items: [
      { label: "Produtos", to: "/admin/catalog/products" },
      { label: "Categorias", to: "/admin/catalog/categories" },
      { label: "Atributos", to: "/admin/catalog/attributes" },
    ],
  },
  {
    label: "Conteúdo",
    to: "/admin/content",
    items: [{ label: "Mídia", comingSoon: true }],
  },
  { label: "Comércio", to: "/admin/commerce", comingSoon: true },
  { label: "Configurações", to: "/admin/settings" },
];

const LABELS: Record<string, string> = {
  admin: "Dashboard",
  catalog: "Catálogo",
  products: "Produtos",
  categories: "Categorias",
  attributes: "Atributos",
  website: "Website",
  content: "Conteúdo",
  commerce: "Comércio",
  settings: "Configurações",
};

export function adminBreadcrumbs(pathname: string): { label: string; to: string }[] {
  const segments = pathname.split("/").filter(Boolean);

  return segments.map((segment, index) => ({
    label: LABELS[segment] ?? segment,
    to: `/${segments.slice(0, index + 1).join("/")}`,
  }));
}
