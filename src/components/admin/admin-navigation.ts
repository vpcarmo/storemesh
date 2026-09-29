export type AdminPath =
  | "/admin"
  | "/admin/catalog"
  | "/admin/catalog/products"
  | "/admin/catalog/categories"
  | "/admin/catalog/attributes"
  | "/admin/website"
  | "/admin/website/pages"
  | "/admin/website/navigation"
  | "/admin/content"
  | "/admin/content/media"
  | "/admin/commerce"
  | "/admin/settings"
  | "/admin/preview";

export interface AdminNavigationItem {
  label: string;
  to?: AdminPath;
  comingSoon?: boolean;
}

export interface AdminNavigationGroup {
  label: string;
  to?: AdminPath;
  items?: AdminNavigationItem[];
  comingSoon?: boolean;
}

export const ADMIN_NAVIGATION: AdminNavigationGroup[] = [
  { label: "Dashboard", to: "/admin" },
  {
    label: "Website",
    to: "/admin/website",
    items: [
      { label: "Páginas", to: "/admin/website/pages" },
      { label: "Navegação", to: "/admin/website/navigation" },
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
    items: [{ label: "Mídia", to: "/admin/content/media" }],
  },
  { label: "Comércio", to: "/admin/commerce" },
  { label: "Configurações", to: "/admin/settings" },
  { label: "Preview", to: "/admin/preview" },
];

const LABELS: Record<AdminPath, string> = {
  "/admin": "Dashboard",
  "/admin/catalog": "Catálogo",
  "/admin/catalog/products": "Produtos",
  "/admin/catalog/categories": "Categorias",
  "/admin/catalog/attributes": "Atributos",
  "/admin/website": "Website",
  "/admin/website/pages": "Páginas",
  "/admin/website/navigation": "Navegação",
  "/admin/content": "Conteúdo",
  "/admin/content/media": "Mídia",
  "/admin/commerce": "Comércio",
  "/admin/settings": "Configurações",
  "/admin/preview": "Preview",
};

function isAdminPath(value: string): value is AdminPath {
  return value in LABELS;
}

export function adminBreadcrumbs(pathname: string): { label: string; to: AdminPath | null }[] {
  const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);

  return segments.map((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join("/")}`;
    return isAdminPath(path) ? { label: LABELS[path], to: path } : { label: segment, to: null };
  });
}
