import type { Permission } from "@/domain/access";

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
  | "/admin/stores"
  | "/admin/users"
  | "/admin/settings"
  | "/admin/preview";

export interface AdminNavigationItem {
  label: string;
  to?: AdminPath;
  permission?: Permission;
  comingSoon?: boolean;
}

export interface AdminNavigationGroup {
  label: string;
  to?: AdminPath;
  permission?: Permission;
  items?: AdminNavigationItem[];
  comingSoon?: boolean;
  superAdminOnly?: boolean;
}

export const ADMIN_NAVIGATION: AdminNavigationGroup[] = [
  { label: "Painel", to: "/admin", permission: "catalog.view" },
  {
    label: "Website",
    to: "/admin/website",
    permission: "website.view",
    items: [
      { label: "Páginas e editor", to: "/admin/website/pages", permission: "website.view" },
      { label: "Navegação", to: "/admin/website/navigation", permission: "website.view" },
      {
        label: "Aparência e identidade da loja",
        to: "/admin/settings",
        permission: "settings.view",
      },
    ],
  },
  {
    label: "Catálogo",
    to: "/admin/catalog",
    permission: "catalog.view",
    items: [
      { label: "Produtos", to: "/admin/catalog/products", permission: "catalog.view" },
      { label: "Categorias", to: "/admin/catalog/categories", permission: "catalog.view" },
      { label: "Atributos", to: "/admin/catalog/attributes", permission: "catalog.view" },
    ],
  },
  {
    label: "Conteúdo",
    to: "/admin/content",
    permission: "media.view",
    items: [{ label: "Biblioteca de mídia", to: "/admin/content/media", permission: "media.view" }],
  },
  {
    label: "Comércio",
    to: "/admin/commerce",
  },
  {
    label: "Plataforma",
    superAdminOnly: true,
    items: [
      { label: "Lojas", to: "/admin/stores" },
      { label: "Usuários e permissões", to: "/admin/users" },
    ],
  },
];

const LABELS: Record<AdminPath, string> = {
  "/admin": "Painel",
  "/admin/catalog": "Catálogo",
  "/admin/catalog/products": "Produtos",
  "/admin/catalog/categories": "Categorias",
  "/admin/catalog/attributes": "Atributos",
  "/admin/website": "Website",
  "/admin/website/pages": "Páginas e editor",
  "/admin/website/navigation": "Navegação",
  "/admin/content": "Conteúdo",
  "/admin/content/media": "Biblioteca de mídia",
  "/admin/commerce": "Comércio",
  "/admin/stores": "Lojas",
  "/admin/users": "Usuários e permissões",
  "/admin/settings": "Aparência e identidade da loja",
  "/admin/preview": "Pré-visualização",
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
