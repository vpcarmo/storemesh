import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  deleteCurrentStoreNavigationItem,
  getCurrentStoreWebsite,
  saveCurrentStoreNavigationItem,
  saveCurrentStorePage,
} from "@/auth/website.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { NavigationItem, WebsitePage } from "@/domain/website";

const emptyPage: Pick<
  WebsitePage,
  "id" | "title" | "slug" | "status" | "seoTitle" | "seoDescription"
> = {
  id: null as unknown as string,
  title: "",
  slug: "",
  status: "draft",
  seoTitle: "",
  seoDescription: "",
};
const emptyNav = { id: null, label: "", pageId: "", externalUrl: "", position: 0, isActive: true };
function message(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível salvar.";
}
export function WebsitePanel({
  section,
  storeSlug,
  requiresStoreSelection,
}: {
  section: "pages" | "navigation";
  storeSlug: string | null;
  requiresStoreSelection: boolean;
}) {
  const load = useServerFn(getCurrentStoreWebsite);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["website", storeSlug],
    queryFn: () => load({ data: { slug: storeSlug } }),
    enabled: !!storeSlug,
  });
  const [page, setPage] = useState<(typeof emptyPage & { id: string | null }) | WebsitePage | null>(
    null,
  );
  const [nav, setNav] = useState<typeof emptyNav | NavigationItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savePage = useServerFn(saveCurrentStorePage);
  const saveNav = useServerFn(saveCurrentStoreNavigationItem);
  const removeNav = useServerFn(deleteCurrentStoreNavigationItem);
  const refresh = () => client.invalidateQueries({ queryKey: ["website", storeSlug] });
  if (requiresStoreSelection && !storeSlug)
    return (
      <p className="text-sm text-muted-foreground">
        Selecione uma loja no cabeçalho administrativo.
      </p>
    );
  if (query.isPending) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (query.isError || !query.data)
    return <p className="text-sm text-destructive">{message(query.error)}</p>;
  const submitPage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!page) return;
    setError(null);
    try {
      await savePage({
        data: {
          slug: storeSlug,
          id: page.id,
          title: page.title,
          pageSlug: page.slug,
          status: page.status,
          seoTitle: page.seoTitle || null,
          seoDescription: page.seoDescription || null,
        },
      });
      setPage(null);
      refresh();
    } catch (e) {
      setError(message(e));
    }
  };
  const submitNav = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nav) return;
    setError(null);
    try {
      await saveNav({
        data: {
          slug: storeSlug,
          id: nav.id,
          label: nav.label,
          pageId: nav.pageId || null,
          externalUrl: nav.externalUrl || null,
          position: nav.position,
          isActive: nav.isActive,
        },
      });
      setNav(null);
      refresh();
    } catch (e) {
      setError(message(e));
    }
  };
  return (
    <section className="space-y-5" aria-label={section === "pages" ? "Páginas" : "Navegação"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{section === "pages" ? "Páginas" : "Navegação"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {section === "pages"
              ? "Páginas e SEO básico da loja."
              : "Links exibidos na navegação pública."}
          </p>
        </div>
        <Button
          onClick={() =>
            section === "pages"
              ? setPage(emptyPage)
              : setNav({ ...emptyNav, position: query.data.navigation.length })
          }
        >
          + {section === "pages" ? "Nova página" : "Novo item"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {section === "pages" ? (
        <>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Título</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {query.data.pages.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3 font-medium">{item.title}</td>
                    <td>/{item.slug}</td>
                    <td>
                      {item.status === "published"
                        ? "Publicada"
                        : item.status === "draft"
                          ? "Rascunho"
                          : "Arquivada"}
                    </td>
                    <td className="p-3">
                      <Button variant="outline" size="sm" onClick={() => setPage(item)}>
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {page && (
            <form onSubmit={submitPage} className="grid gap-3 rounded-lg border p-4">
              <h2 className="font-medium">{page.id ? "Editar página" : "Nova página"}</h2>
              <Label>
                Título
                <Input
                  value={page.title}
                  onChange={(e) => setPage({ ...page, title: e.target.value })}
                  required
                />
              </Label>
              <Label>
                Slug
                <Input
                  value={page.slug}
                  onChange={(e) => setPage({ ...page, slug: e.target.value })}
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                />
              </Label>
              <Label>
                Status
                <select
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3"
                  value={page.status}
                  onChange={(e) =>
                    setPage({ ...page, status: e.target.value as WebsitePage["status"] })
                  }
                >
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicada</option>
                  <option value="archived">Arquivada</option>
                </select>
              </Label>
              <Label>
                SEO title
                <Input
                  value={page.seoTitle ?? ""}
                  onChange={(e) => setPage({ ...page, seoTitle: e.target.value })}
                />
              </Label>
              <Label>
                SEO description
                <Textarea
                  value={page.seoDescription ?? ""}
                  onChange={(e) => setPage({ ...page, seoDescription: e.target.value })}
                />
              </Label>
              <div className="flex gap-2">
                <Button type="submit">Salvar</Button>
                <Button type="button" variant="outline" onClick={() => setPage(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </>
      ) : (
        <>
          <div className="space-y-2">
            {query.data.navigation.map((item) => (
              <div
                className="flex items-center justify-between rounded-lg border p-3"
                key={item.id}
              >
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.externalUrl ??
                      query.data.pages.find((page) => page.id === item.pageId)?.slug ??
                      "Página removida"}{" "}
                    · posição {item.position} · {item.isActive ? "Ativo" : "Inativo"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setNav(item)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      await removeNav({ data: { slug: storeSlug, id: item.id } });
                      refresh();
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {nav && (
            <form onSubmit={submitNav} className="grid gap-3 rounded-lg border p-4">
              <h2 className="font-medium">{nav.id ? "Editar item" : "Novo item"}</h2>
              <Label>
                Rótulo
                <Input
                  value={nav.label}
                  onChange={(e) => setNav({ ...nav, label: e.target.value })}
                  required
                />
              </Label>
              <Label>
                Página interna
                <select
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3"
                  value={nav.pageId ?? ""}
                  onChange={(e) => setNav({ ...nav, pageId: e.target.value, externalUrl: "" })}
                >
                  <option value="">Selecione se for link externo</option>
                  {query.data.pages.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} (/{item.slug})
                    </option>
                  ))}
                </select>
              </Label>
              <Label>
                URL externa
                <Input
                  type="url"
                  value={nav.externalUrl ?? ""}
                  onChange={(e) => setNav({ ...nav, externalUrl: e.target.value, pageId: "" })}
                />
              </Label>
              <Label>
                Posição
                <Input
                  type="number"
                  min="0"
                  value={nav.position}
                  onChange={(e) => setNav({ ...nav, position: Number(e.target.value) })}
                />
              </Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={nav.isActive}
                  onChange={(e) => setNav({ ...nav, isActive: e.target.checked })}
                />{" "}
                Ativo
              </label>
              <div className="flex gap-2">
                <Button type="submit">Salvar</Button>
                <Button type="button" variant="outline" onClick={() => setNav(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}
