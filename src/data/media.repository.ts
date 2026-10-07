import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { MediaAsset, MediaSourceType } from "@/domain/media";
import { MEDIA_BUCKET } from "@/domain/media";
import type { Database, Tables } from "@/integrations/supabase/types";

type AppClient = SupabaseClient<Database>;
type MediaRow = Tables<"media_assets">;

const signedUrlLifetimeSeconds = 3600;
const maxUploadSize = 50 * 1024 * 1024;

function toMediaSourceType(value: string): MediaSourceType {
  if (value === "upload" || value === "external") return value;
  throw new Error(`Unsupported media source type: ${value}`);
}

function toAsset(row: MediaRow, imageUrl: string): MediaAsset {
  return {
    id: row.id,
    storeId: row.store_id,
    sourceType: toMediaSourceType(row.source_type),
    filename: row.filename,
    mimeType: row.mime_type,
    size: row.size,
    width: row.width,
    height: row.height,
    alt: row.alt,
    imageUrl,
    createdAt: row.created_at,
  };
}

async function imageUrl(
  client: AppClient,
  row: Pick<MediaRow, "source_type" | "external_url" | "storage_path">,
): Promise<string> {
  if (row.source_type === "external") return row.external_url!;
  const { data, error } = await client.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(row.storage_path!, signedUrlLifetimeSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function readMediaAssets(client: AppClient, storeId: string): Promise<MediaAsset[]> {
  const { data, error } = await client
    .from("media_assets")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all(data.map(async (row) => toAsset(row, await imageUrl(client, row))));
}

export async function createMediaUpload(
  client: AppClient,
  storeId: string,
  filename: string,
): Promise<{ path: string; token: string }> {
  const safeFilename = filename
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 180);
  if (!safeFilename) throw new Error("O nome do arquivo não é válido.");

  const path = `${storeId}/${randomUUID()}-${safeFilename}`;
  const { data, error } = await client.storage
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  if (error) throw error;
  return { path, token: data.token };
}

export async function saveUploadedMedia(
  client: AppClient,
  storeId: string,
  values: {
    path: string;
    mimeType: string;
    size: number;
    width: number | null;
    height: number | null;
  },
): Promise<MediaAsset> {
  const prefix = `${storeId}/`;
  const filename = values.path.startsWith(prefix) ? values.path.slice(prefix.length) : "";
  if (!/^[0-9a-f-]{36}-[a-zA-Z0-9._-]{1,180}$/i.test(filename))
    throw new Error("O caminho de upload não pertence à loja autorizada.");

  const { data: existing, error: existingError } = await client
    .from("media_assets")
    .select("*")
    .eq("store_id", storeId)
    .eq("storage_path", values.path)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return toAsset(existing, await imageUrl(client, existing));

  try {
    const { data: files, error: listError } = await client.storage
      .from(MEDIA_BUCKET)
      .list(storeId, { search: filename });
    if (listError) throw listError;
    const file = files.find((item) => item.name === filename);
    if (!file) throw new Error("O arquivo enviado não foi encontrado no Storage.");

    const metadata = file.metadata as Record<string, unknown> | null;
    const storedSize = Number(metadata?.["size"] ?? values.size);
    const storedMimeType = String(metadata?.["mimetype"] ?? values.mimeType);
    if (storedSize <= 0 || storedSize > maxUploadSize)
      throw new Error("O arquivo deve ter até 50 MB.");
    if (!storedMimeType.toLowerCase().startsWith("image/"))
      throw new Error("Somente arquivos de imagem são aceitos.");

    const { data, error } = await client
      .from("media_assets")
      .insert({
        store_id: storeId,
        source_type: "upload",
        storage_path: values.path,
        external_url: null,
        filename: filename.slice(37),
        mime_type: storedMimeType,
        size: storedSize,
        width: values.width,
        height: values.height,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toAsset(data, await imageUrl(client, data));
  } catch (error) {
    const { data: registered, error: lookupError } = await client
      .from("media_assets")
      .select("id")
      .eq("store_id", storeId)
      .eq("storage_path", values.path)
      .maybeSingle();
    if (lookupError) {
      console.error("Could not verify the media upload registration before cleanup.", lookupError);
    } else if (!registered) {
      const { error: cleanupError } = await client.storage.from(MEDIA_BUCKET).remove([values.path]);
      if (cleanupError)
        console.error("Could not clean up an unregistered media upload.", cleanupError);
    }
    throw error;
  }
}

export async function createExternalMedia(
  client: AppClient,
  storeId: string,
  values: { url: string; alt: string | null },
): Promise<MediaAsset> {
  const url = new URL(values.url);
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("Use uma URL externa HTTP ou HTTPS.");
  const filename = url.pathname.split("/").filter(Boolean).at(-1)?.slice(0, 255) || url.hostname;
  const { data, error } = await client
    .from("media_assets")
    .insert({
      store_id: storeId,
      source_type: "external",
      storage_path: null,
      external_url: url.toString(),
      filename,
      mime_type: null,
      size: null,
      width: null,
      height: null,
      alt: values.alt,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toAsset(data, url.toString());
}

export async function updateMediaAlt(
  client: AppClient,
  storeId: string,
  id: string,
  alt: string | null,
) {
  const { error } = await client
    .from("media_assets")
    .update({ alt })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("id")
    .single();
  if (error) throw error;
}

export async function deleteMediaAsset(client: AppClient, storeId: string, id: string) {
  const { data: asset, error: readError } = await client
    .from("media_assets")
    .select("storage_path")
    .eq("id", id)
    .eq("store_id", storeId)
    .maybeSingle();
  if (readError) throw readError;
  if (!asset) throw new Error("A mídia não foi encontrada na loja autorizada.");

  const { error } = await client.from("media_assets").delete().eq("id", id).eq("store_id", storeId);
  if (error) throw error;

  if (asset.storage_path) {
    const { error: storageError } = await client.storage
      .from(MEDIA_BUCKET)
      .remove([asset.storage_path]);
    if (storageError) throw storageError;
  }
}

export async function resolveMediaReferences(
  client: AppClient,
  storeId: string,
  ids: string[],
  options: { tolerateUnavailable?: boolean } = {},
): Promise<Map<string, { url: string; alt: string | null }>> {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) return new Map();
  const { data, error } = await client
    .from("media_assets")
    .select("id, store_id, source_type, external_url, storage_path, alt")
    .eq("store_id", storeId)
    .in("id", uniqueIds);
  if (error) throw error;
  if (!options.tolerateUnavailable) {
    const resolved = await Promise.all(
      data.map(
        async (row) => [row.id, { url: await imageUrl(client, row), alt: row.alt }] as const,
      ),
    );
    return new Map(resolved);
  }

  const outcomes = await Promise.allSettled(
    data.map(async (row) => [row.id, { url: await imageUrl(client, row), alt: row.alt }] as const),
  );
  const resolved = new Map<string, { url: string; alt: string | null }>();
  outcomes.forEach((outcome, index) => {
    if (outcome.status === "fulfilled") {
      resolved.set(...outcome.value);
    } else {
      console.error("Could not resolve a product media asset.", {
        assetId: data[index]?.id,
        error: outcome.reason,
      });
    }
  });
  return resolved;
}
