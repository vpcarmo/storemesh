import type { StorefrontSectionDefinition } from "@/domain/storefront";

export const PAGE_STATUSES = ["draft", "published", "archived"] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

export const HOME_BACKUP_SLUG_PATTERN = /^home-backup-\d{17}(?:-\d+)?$/;

export function isHomeBackupSlug(slug: string): boolean {
  return HOME_BACKUP_SLUG_PATTERN.test(slug);
}

export interface WebsitePage {
  id: string;
  storeId: string;
  title: string;
  slug: string;
  status: PageStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  sections: StorefrontSectionDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface NavigationItem {
  id: string;
  storeId: string;
  label: string;
  pageId: string | null;
  externalUrl: string | null;
  position: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function defaultPageSections(
  title: string,
  description: string | null,
): StorefrontSectionDefinition[] {
  return [{ id: "introduction", type: "hero", title, description }];
}
