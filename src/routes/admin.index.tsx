import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { getCurrentStoreCatalog } from "@/auth/catalog.functions";
import { useAdminStore } from "@/components/admin/admin-store-context";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — StoreMesh" },
      { name: "description", content: "Resumo real da loja selecionada." },
      { property: "og:title", content: "Dashboard — StoreMesh" },
      { property: "og:description", content: "Resumo real da loja selecionada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDashboard,
});

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function AdminDashboard() {
  const { storeSlug, requiresStoreSelection } = useAdminStore();
  const loadCatalog = useServerFn(getCurrentStoreCatalog);
  const catalogQuery = useQuery({
    queryKey: ["store", "current", "catalog", storeSlug],
    queryFn: () => loadCatalog({ data: { slug: storeSlug } }),
    enabled: !requiresStoreSelection || storeSlug !== null,
  });

  if (requiresStoreSelection && storeSlug === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Selecione uma loja autorizada para ver o resumo.
      </p>
    );
  }

  if (catalogQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Carregando dados da loja…</p>;
  }

  if (catalogQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {catalogQuery.error instanceof Error
          ? catalogQuery.error.message
          : "Não foi possível carregar a loja."}
      </p>
    );
  }

  const catalog = catalogQuery.data;

  return (
    <section className="space-y-6" aria-label="Resumo da loja">
      <div>
        <h1 className="text-xl font-semibold">{catalog.store.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Situação: {catalog.store.status === "active" ? "Ativa" : "Inativa"} · {catalog.store.slug}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Produtos" value={catalog.products.length} />
        <Metric label="Categorias" value={catalog.categories.length} />
        <Metric label="Atributos" value={catalog.attributes.length} />
      </div>
      {catalog.products.length === 0 && catalog.categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Esta loja ainda não possui catálogo cadastrado.
        </p>
      ) : null}
    </section>
  );
}
