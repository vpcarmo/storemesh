import { useQuery } from "@tanstack/react-query";
import { Navigate, createFileRoute } from "@tanstack/react-router";

import { getCurrentUser } from "@/auth/session";
import { AuthSessionPanel } from "@/components/auth-session-panel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VSMS Solutions — Plataforma" },
      {
        name: "description",
        content: "Fundação técnica da plataforma profissional da VSMS Solutions.",
      },
      { property: "og:title", content: "VSMS Solutions — Plataforma" },
      {
        property: "og:description",
        content: "Fundação técnica da plataforma profissional da VSMS Solutions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const userQuery = useQuery({ queryKey: ["auth", "user"], queryFn: getCurrentUser });

  if (userQuery.data) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground sm:px-10 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col sm:min-h-[calc(100vh-5rem)]">
        <header className="flex items-center justify-between border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div
              className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
              aria-hidden="true"
            >
              V
            </div>
            <p className="text-sm font-semibold">VSMS Solutions</p>
          </div>
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="size-2 rounded-full bg-status" aria-hidden="true" />
            Estrutura inicial
          </span>
        </header>

        <section className="flex flex-1 items-center py-12 sm:py-16">
          <div className="grid w-full gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:items-center">
            <div className="max-w-3xl">
              <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-accent-foreground">
                Plataforma profissional
              </p>
              <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">
                Uma base sólida para o que vem a seguir.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                O ambiente inicial da VSMS Solutions está preparado para evoluir com segurança,
                clareza e consistência.
              </p>
            </div>
            <AuthSessionPanel />
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
          VSMS Solutions
        </footer>
      </div>
    </main>
  );
}
