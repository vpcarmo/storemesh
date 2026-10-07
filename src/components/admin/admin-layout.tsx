import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, Menu } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { getAccessContext, getAuthorizedStores } from "@/auth/access.functions";
import { getCurrentUser, signOut } from "@/auth/session";
import { getCurrentStoreWebsite } from "@/auth/website.functions";
import { ADMIN_NAVIGATION, adminBreadcrumbs } from "@/components/admin/admin-navigation";
import {
  AdminStoreContext,
  type AdminStoreContextValue,
} from "@/components/admin/admin-store-context";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Label } from "@/components/ui/label";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isSuperAdmin } from "@/domain/access";

const sessionQueryKey = ["auth", "user"] as const;
const accessQueryKey = ["auth", "access-context"] as const;
const storesQueryKey = ["auth", "authorized-stores"] as const;
const storageKey = "storemesh.admin.store-slug";

function messageFrom(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível carregar a área administrativa.";
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const loadAccess = useServerFn(getAccessContext);
  const loadStores = useServerFn(getAuthorizedStores);
  const loadWebsite = useServerFn(getCurrentStoreWebsite);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isPlatformStoresRoute = pathname === "/admin/stores";
  const isPlatformUsersRoute = pathname === "/admin/users";
  const isPlatformRoute = isPlatformStoresRoute || isPlatformUsersRoute;
  const [slug, setSlug] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const userQuery = useQuery({ queryKey: sessionQueryKey, queryFn: getCurrentUser });
  const accessQuery = useQuery({
    queryKey: accessQueryKey,
    queryFn: () => loadAccess(),
    enabled: Boolean(userQuery.data),
  });
  const storesQuery = useQuery({
    queryKey: storesQueryKey,
    queryFn: () => loadStores(),
    enabled: Boolean(userQuery.data) && !isPlatformRoute,
  });

  const access = accessQuery.data;
  const isSuperAdminUser = access ? isSuperAdmin(access) : false;
  const assignedStoreIds = new Set(
    access?.assignments
      .filter((assignment) => assignment.role === "store_admin" && assignment.storeId !== null)
      .map((assignment) => assignment.storeId) ?? [],
  );
  const hasStoreAdminRole =
    access?.assignments.some((assignment) => assignment.role === "store_admin") ?? false;
  const requiresStoreSelection =
    isSuperAdminUser || (!isSuperAdminUser && assignedStoreIds.size > 1);
  const stores = useMemo(() => storesQuery.data ?? [], [storesQuery.data]);

  const selectStore = useCallback((next: string | null) => {
    setSlug(next);
    if (next) window.localStorage.setItem(storageKey, next);
    else window.localStorage.removeItem(storageKey);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) setSlug(stored);
  }, []);

  useEffect(() => {
    if (storesQuery.isSuccess && slug && !stores.some((store) => store.slug === slug)) {
      selectStore(null);
    }
  }, [slug, stores, selectStore, storesQuery.isSuccess]);

  const autoSelectedStore =
    stores.length === 1 && (isSuperAdminUser || assignedStoreIds.size === 1) ? stores[0] : null;
  const selectedStore = stores.find((store) => store.slug === slug) ?? autoSelectedStore;
  const storeSlug = selectedStore?.slug ?? null;
  const websiteQuery = useQuery({
    queryKey: ["admin", "storefront-home", storeSlug],
    queryFn: () => loadWebsite({ data: { slug: storeSlug } }),
    enabled: Boolean(storeSlug && selectedStore?.status === "active" && !isPlatformRoute),
  });
  const publishedHome = websiteQuery.data?.pages.find(
    (page) => page.slug === "home" && page.status === "published",
  );

  const contextValue = useMemo(
    () => ({ storeSlug, requiresStoreSelection, stores, selectStore }),
    [storeSlug, requiresStoreSelection, stores, selectStore],
  );

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    setSignOutError(null);

    try {
      await signOut();
      selectStore(null);
      await queryClient.cancelQueries();
      queryClient.clear();
      queryClient.setQueryData(sessionQueryKey, null);
      await navigate({ to: "/login", replace: true });
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : "Não foi possível encerrar a sessão.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  if (userQuery.isPending) {
    return <p className="p-8 text-sm text-muted-foreground">Verificando sessão…</p>;
  }

  if (!userQuery.data) {
    return <Navigate to="/login" replace />;
  }

  if (accessQuery.isError) {
    return <p className="p-8 text-sm text-destructive">{messageFrom(accessQuery.error)}</p>;
  }

  if (accessQuery.isPending) {
    return <p className="p-8 text-sm text-muted-foreground">Carregando acesso administrativo…</p>;
  }

  if (isPlatformRoute && !isSuperAdmin(accessQuery.data)) {
    return <p className="p-8 text-sm text-destructive">Acesso restrito ao super_admin.</p>;
  }

  if (!isPlatformRoute && hasStoreAdminRole && assignedStoreIds.size === 0) {
    return (
      <p className="p-8 text-sm text-muted-foreground">
        Sua conta ainda não está vinculada a uma loja. Entre em contato com o administrador da
        plataforma.
      </p>
    );
  }

  if (!isPlatformRoute && accessQuery.data.assignments.length === 0) {
    return (
      <p className="p-8 text-sm text-muted-foreground">
        Sua conta não possui acesso administrativo a nenhuma loja.
      </p>
    );
  }

  if (!isPlatformRoute && storesQuery.isPending) {
    return <p className="p-8 text-sm text-muted-foreground">Carregando lojas autorizadas…</p>;
  }

  if (!isPlatformRoute && storesQuery.isError) {
    return <p className="p-8 text-sm text-destructive">{messageFrom(storesQuery.error)}</p>;
  }

  if (!isPlatformRoute && stores.length === 0) {
    return (
      <p className="p-8 text-sm text-muted-foreground">
        Nenhuma loja ativa está disponível para sua conta.
      </p>
    );
  }

  const breadcrumbs = adminBreadcrumbs(pathname);

  return (
    <AdminStoreContext.Provider value={contextValue}>
      <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
        <aside
          className={`${menuOpen ? "block" : "hidden"} border-b border-border bg-sidebar p-4 md:block md:w-64 md:shrink-0 md:border-b-0 md:border-r`}
          aria-label="Navegação administrativa"
        >
          <p className="px-2 text-sm font-semibold">VSMS Solutions Manager</p>
          <nav className="mt-4 space-y-4 text-sm">
            {ADMIN_NAVIGATION.filter(
              (group) => !group.superAdminOnly || isSuperAdmin(accessQuery.data),
            ).map((group) => (
              <div key={group.label}>
                {group.comingSoon || !group.to ? (
                  <span className="flex items-center justify-between rounded-md px-2 py-1.5 text-muted-foreground">
                    {group.label}
                    <span className="text-xs">Em breve</span>
                  </span>
                ) : (
                  <Link
                    to={group.to}
                    onClick={() => setMenuOpen(false)}
                    activeOptions={{ exact: group.to === "/admin" }}
                    activeProps={{ className: "bg-sidebar-accent font-medium" }}
                    className="block rounded-md px-2 py-1.5 hover:bg-sidebar-accent"
                  >
                    {group.label}
                  </Link>
                )}
                {group.items?.length ? (
                  <div className="mt-1 ml-3 space-y-1 border-l border-sidebar-border pl-3">
                    {group.items.map((item) =>
                      item.to ? (
                        <Link
                          key={item.label}
                          to={item.to}
                          onClick={() => setMenuOpen(false)}
                          activeProps={{ className: "bg-sidebar-accent font-medium" }}
                          className="block rounded-md px-2 py-1 hover:bg-sidebar-accent"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span
                          key={item.label}
                          className="flex items-center justify-between rounded-md px-2 py-1 text-muted-foreground"
                        >
                          {item.label}
                          <span className="text-xs">Em breve</span>
                        </span>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="md:hidden"
                aria-label="Abrir navegação"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <Menu aria-hidden="true" />
              </Button>
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => (
                    <Fragment key={`${crumb.label}-${index}`}>
                      <BreadcrumbItem>
                        {index === breadcrumbs.length - 1 || !crumb.to ? (
                          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        ) : (
                          <>
                            <BreadcrumbLink asChild>
                              <Link to={crumb.to}>{crumb.label}</Link>
                            </BreadcrumbLink>
                          </>
                        )}
                      </BreadcrumbItem>
                      {index < breadcrumbs.length - 1 ? <BreadcrumbSeparator /> : null}
                    </Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!isPlatformRoute ? (
                <div className="flex items-center gap-2">
                  <Label htmlFor="admin-store" className="text-xs text-muted-foreground">
                    Loja
                  </Label>
                  <select
                    id="admin-store"
                    className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                    value={storeSlug ?? ""}
                    onChange={(event) => selectStore(event.target.value || null)}
                    disabled={!requiresStoreSelection || stores.length <= 1}
                  >
                    <option value="">
                      {requiresStoreSelection ? "Selecione uma loja" : "Loja atribuída"}
                    </option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.slug}>
                        {store.name}
                        {store.status === "inactive" ? " (Inativa)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {!isPlatformRoute && selectedStore ? (
                <span className="max-w-[16rem] truncate text-sm font-medium">
                  Administrando: {selectedStore.name}
                </span>
              ) : null}
              {!isPlatformRoute && selectedStore?.status === "active" && publishedHome ? (
                <a
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  href={`/store/${selectedStore.slug}/${publishedHome.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver minha loja
                </a>
              ) : null}
              {!isPlatformRoute &&
              selectedStore?.status === "active" &&
              !websiteQuery.isPending &&
              !websiteQuery.isError &&
              !publishedHome ? (
                <span className="text-sm text-muted-foreground">
                  A Home desta loja ainda não está publicada.
                </span>
              ) : null}
              {!isPlatformRoute && websiteQuery.isError ? (
                <span className="text-sm text-destructive" role="alert">
                  Não foi possível verificar a Home publicada.
                </span>
              ) : null}
              <span className="hidden max-w-[16rem] truncate text-sm text-muted-foreground sm:inline">
                {userQuery.data.email}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                <LogOut aria-hidden="true" />
                {signingOut ? "Saindo…" : "Sair"}
              </Button>
            </div>
          </header>
          {signOutError ? (
            <p className="px-4 pt-3 text-sm text-destructive sm:px-6" role="alert">
              {signOutError}
            </p>
          ) : null}

          <TooltipProvider>
            <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
              {!isPlatformRoute && selectedStore?.status === "inactive" ? (
                <p className="text-sm text-destructive" role="alert">
                  Esta loja está inativa e não pode ser administrada no momento.
                </p>
              ) : requiresStoreSelection && !storeSlug ? (
                <p className="text-sm text-muted-foreground">
                  Selecione a loja que deseja administrar.
                </p>
              ) : (
                children
              )}
            </main>
          </TooltipProvider>
        </div>
      </div>
    </AdminStoreContext.Provider>
  );
}
