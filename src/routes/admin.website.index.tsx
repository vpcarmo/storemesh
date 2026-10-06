import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/website/")({ component: WebsiteHome });

const entries = [
  { to: "/admin/website/pages", label: "Páginas", hint: "Publicação e SEO básico." },
  { to: "/admin/website/navigation", label: "Navegação", hint: "Links da storefront pública." },
] as const;

function WebsiteHome() {
  return (
    <section className="space-y-4" aria-label="Website">
      <h1 className="text-xl font-semibold">Website</h1>
      <div className="grid gap-3 sm:grid-cols-2">
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
