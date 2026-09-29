import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Link2, Pencil, Trash2, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";

import {
  completeCurrentStoreMediaUpload,
  createCurrentStoreExternalMedia,
  deleteCurrentStoreMedia,
  getCurrentStoreMedia,
  startCurrentStoreMediaUpload,
  updateCurrentStoreMedia,
} from "@/auth/media.functions";
import { useAdminStore } from "@/components/admin/admin-store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormHelp } from "@/components/admin/form-help";
import { supabase } from "@/integrations/supabase/client";
import { MEDIA_BUCKET } from "@/domain/media";

const mediaQueryKey = (slug: string | null) => ["store", "current", "media", slug] as const;
const maxFileSize = 50 * 1024 * 1024;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function formatSize(size: number | null) {
  if (size === null) return "Tamanho externo";
  return new Intl.NumberFormat("pt-BR", {
    style: "unit",
    unit: "byte",
    unitDisplay: "narrow",
  }).format(size);
}

export function MediaLibraryPanel() {
  const { storeSlug, requiresStoreSelection } = useAdminStore();
  const queryClient = useQueryClient();
  const listMedia = useServerFn(getCurrentStoreMedia);
  const startUpload = useServerFn(startCurrentStoreMediaUpload);
  const completeUpload = useServerFn(completeCurrentStoreMediaUpload);
  const createExternal = useServerFn(createCurrentStoreExternalMedia);
  const updateMedia = useServerFn(updateCurrentStoreMedia);
  const deleteMedia = useServerFn(deleteCurrentStoreMedia);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const mediaQuery = useQuery({
    queryKey: mediaQueryKey(storeSlug),
    queryFn: () => listMedia({ data: { slug: storeSlug } }),
    enabled: !requiresStoreSelection || storeSlug !== null,
  });

  async function refresh(message: string) {
    await queryClient.invalidateQueries({ queryKey: mediaQueryKey(storeSlug) });
    setFeedback(message);
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFeedback("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size <= 0 || file.size > maxFileSize) {
      setFeedback("O arquivo deve ter até 50 MB.");
      return;
    }

    setPending(true);
    setFeedback(null);
    try {
      const dimensions = await readImageDimensions(file);
      const upload = await startUpload({
        data: { slug: storeSlug, filename: file.name, mimeType: file.type, size: file.size },
      });
      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type });
      if (error) throw error;
      await completeUpload({
        data: {
          slug: storeSlug,
          path: upload.path,
          mimeType: file.type,
          size: file.size,
          ...dimensions,
        },
      });
      await refresh("Mídia enviada.");
    } catch (error) {
      setFeedback(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  function run(action: () => Promise<unknown>, message: string) {
    setPending(true);
    setFeedback(null);
    void action()
      .then(() => refresh(message))
      .catch((error: unknown) => setFeedback(errorMessage(error)))
      .finally(() => setPending(false));
  }

  function addExternal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(
      () =>
        createExternal({
          data: {
            slug: storeSlug,
            url: String(form.get("externalUrl")),
            alt: String(form.get("externalAlt") ?? "").trim() || null,
          },
        }),
      "URL adicionada.",
    );
    event.currentTarget.reset();
  }

  if (requiresStoreSelection && storeSlug === null)
    return <p className="text-sm text-muted-foreground">Selecione uma loja autorizada.</p>;
  if (mediaQuery.isPending)
    return <p className="text-sm text-muted-foreground">Carregando mídia…</p>;
  if (mediaQuery.isError)
    return <p className="text-sm text-destructive">{errorMessage(mediaQuery.error)}</p>;

  const assets = mediaQuery.data;
  return (
    <section className="space-y-6" aria-label="Biblioteca de mídia">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold">Mídia</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A Biblioteca de mídia guarda imagens que podem ser reutilizadas pela loja. Enviar uma
            imagem para a biblioteca não a associa automaticamente a um produto ou página.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90">
          <Upload aria-hidden="true" className="size-4" />
          Enviar mídia
          <input
            className="sr-only"
            type="file"
            accept="image/*"
            disabled={pending}
            onChange={(event) => {
              void handleUpload(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </header>

      <FormHelp variant="callout">
        Envie uma imagem para armazená-la na biblioteca desta loja. Depois do upload, a mídia pode
        ser utilizada em cadastros compatíveis.
      </FormHelp>

      <form className="grid gap-3 border-b pb-5 sm:grid-cols-[1fr_1fr_auto]" onSubmit={addExternal}>
        <Label className="grid gap-2 text-sm">
          URL externa
          <Input
            name="externalUrl"
            type="url"
            placeholder="https://..."
            maxLength={2000}
            required
          />
          <FormHelp tooltip="A imagem continua hospedada no site de origem.">
            Cadastre o endereço de uma imagem hospedada fora do StoreMesh. Exemplo:
            https://exemplo.com/imagens/camiseta-azul.jpg
          </FormHelp>
        </Label>
        <Label className="grid gap-2 text-sm">
          Alt
          <Input name="externalAlt" maxLength={500} />
          <FormHelp tooltip="Descrição textual da imagem para acessibilidade.">
            Descreva a imagem em uma frase útil para acessibilidade. Exemplo: Camiseta azul de manga
            curta vista de frente. Não use uma lista de palavras-chave de SEO.
          </FormHelp>
        </Label>
        <Button className="self-end" disabled={pending}>
          <Link2 aria-hidden="true" />
          Adicionar URL
        </Button>
      </form>

      {feedback ? (
        <p className="text-sm text-muted-foreground" role="status">
          {feedback}
        </p>
      ) : null}
      {assets.length ? (
        <FormHelp>
          Excluir uma mídia remove o item da biblioteca. Verifique antes se ela ainda é utilizada.
        </FormHelp>
      ) : null}
      {assets.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <li key={asset.id} className="overflow-hidden border bg-card">
              <img
                className="aspect-[4/3] w-full bg-muted object-cover"
                src={asset.imageUrl}
                alt={asset.alt ?? asset.filename}
                loading="lazy"
              />
              <div className="space-y-2 p-3">
                <p className="truncate text-sm font-medium" title={asset.filename}>
                  {asset.filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {asset.mimeType ?? "URL externa"}
                  {asset.width && asset.height ? ` · ${asset.width} × ${asset.height}` : ""}
                  {` · ${formatSize(asset.size)}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Origem: {asset.sourceType === "upload" ? "Upload" : "Externa"}
                </p>
                <div className="flex gap-2 border-t pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    aria-label={`Editar texto alternativo de ${asset.filename}`}
                    onClick={() => {
                      const alt = window.prompt("Texto alternativo", asset.alt ?? "");
                      if (alt !== null)
                        run(
                          () =>
                            updateMedia({
                              data: { slug: storeSlug, id: asset.id, alt: alt.trim() || null },
                            }),
                          "Texto alternativo atualizado.",
                        );
                    }}
                  >
                    <Pencil aria-hidden="true" />
                    Editar alt
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    aria-label={`Excluir ${asset.filename}`}
                    onClick={() =>
                      run(
                        () => deleteMedia({ data: { slug: storeSlug, id: asset.id } }),
                        "Mídia removida.",
                      )
                    }
                  >
                    <Trash2 aria-hidden="true" />
                    Excluir
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border border-dashed p-8 text-center">
          <ImagePlus aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma mídia cadastrada nesta loja.</p>
        </div>
      )}
    </section>
  );
}
