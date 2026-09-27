export type AdminPath =
  | "/admin"
  | "/admin/catalog"
  | "/admin/catalog/products"
  | "/admin/catalog/categories"
  | "/admin/catalog/attributes"
  | "/admin/website"
  | "/admin/content"
  | "/admin/commerce"
  | "/admin/settings";

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
  { label: "Comércio", to: "/admin/commerce" },
  { label: "Configurações", to: "/admin/settings" },
];

const LABELS: Record<AdminPath, string> = {
  "/admin": "Dashboard",
  "/admin/catalog": "Catálogo",
  "/admin/catalog/products": "Produtos",
  "/admin/catalog/categories": "Categorias",
  "/admin/catalog/attributes": "Atributos",
  "/admin/website": "Website",
  "/admin/content": "Conteúdo",
  "/admin/commerce": "Comércio",
  "/admin/settings": "Configurações",
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
