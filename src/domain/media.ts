export type MediaSourceType = "upload" | "external";

export const MEDIA_BUCKET = "storemesh-media";

export interface MediaAsset {
  id: string;
  storeId: string;
  sourceType: MediaSourceType;
  filename: string;
  mimeType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  imageUrl: string;
  createdAt: string;
}
