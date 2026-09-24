import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/catalog/")({
  head: () => ({
    meta: [
      { title: "Catálogo — StoreMesh" },
      { name: "description", content: "Administração do catálogo da loja." },
      { property: "og:title", content: "Catálogo — StoreMesh" },
      { property: "og:description", content: "Administração do catálogo da loja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CatalogHome,
});

const entries = [
  { to: "/admin/catalog/products", label: "Produtos", hint: "Preços, descrições e variantes." },
  { to: "/admin/catalog/categories", label: "Categorias", hint: "Organização do catálogo." },
  { to: "/admin/catalog/attributes", label: "Atributos", hint: "Valores e eixos de variante." },
] as const;

function CatalogHome() {
  return (
    <section className="space-y-4" aria-label="Catálogo">
      <h1 className="text-xl font-semibold">Catálogo</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {entries.map((entry) => (
          <Link
            key={entry.to}
            to={entry.to}
            className="rounded-xl border border-border p-4 hover:bg-accent"
          >
            <p className="text-sm font-medium">{entry.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{entry.hint}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
