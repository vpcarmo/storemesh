import { Link as LinkIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { StoreSettings } from "@/domain/store-settings";
import type { StorefrontNavigationItem } from "@/domain/storefront";

function NavigationItem({ item }: { item: StorefrontNavigationItem }) {
  return item.href ? (
    <a className="storefront-nav-link" href={item.href}>
      {item.label}
    </a>
  ) : (
    <span className="storefront-nav-label">{item.label}</span>
  );
}

export function StorefrontNavigation({ items }: { items: StorefrontNavigationItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Navegação da loja" className="storefront-navigation">
      {items.map((item) => (
        <NavigationItem key={item.id} item={item} />
      ))}
    </nav>
  );
}

export function StorefrontHeader({
  storeName,
  logoUrl,
  navigation,
  searchSlot,
  accountSlot,
  cartSlot,
}: {
  storeName: string;
  logoUrl: string | null;
  navigation: StorefrontNavigationItem[];
  searchSlot?: ReactNode;
  accountSlot?: ReactNode;
  cartSlot?: ReactNode;
}) {
  return (
    <header className="storefront-header">
      <div className="storefront-header-row">
        <div className="storefront-brand">
          {logoUrl ? <img src={logoUrl} alt="" className="storefront-logo" /> : null}
          <span>{storeName}</span>
        </div>
        <div className="storefront-header-actions">
          {searchSlot}
          {accountSlot}
          {cartSlot}
        </div>
      </div>
      <StorefrontNavigation items={navigation} />
    </header>
  );
}

function textFromObject(value: StoreSettings["address"]): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value["formatted"];
  return typeof candidate === "string" && candidate.trim() ? candidate : null;
}

function socialItems(value: StoreSettings["socialLinks"]): StorefrontNavigationItem[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.entries(value).flatMap(([label, href]) =>
    typeof href === "string" && /^https?:\/\//.test(href)
      ? [{ id: label, label, href }]
      : [],
  );
}

export function StorefrontFooter({
  storeName,
  settings,
  institutionalLinks = [],
  policyLinks = [],
}: {
  storeName: string;
  settings: StoreSettings | null;
  institutionalLinks?: StorefrontNavigationItem[];
  policyLinks?: StorefrontNavigationItem[];
}) {
  const address = settings ? textFromObject(settings.address) : null;
  const socials = settings ? socialItems(settings.socialLinks) : [];

  return (
    <footer className="storefront-footer">
      <div>
        <p className="storefront-footer-title">{settings?.displayName ?? storeName}</p>
        {settings?.shortDescription ? <p>{settings.shortDescription}</p> : null}
        {address ? <p>{address}</p> : null}
      </div>
      <div>
        {settings?.contactEmail ? <p>{settings.contactEmail}</p> : null}
        {settings?.phone ? <p>{settings.phone}</p> : null}
        {settings?.whatsapp ? <p>{settings.whatsapp}</p> : null}
      </div>
      <StorefrontNavigation items={socials} />
      <StorefrontNavigation items={institutionalLinks} />
      <StorefrontNavigation items={policyLinks} />
    </footer>
  );
}

export function StorefrontLayout({
  header,
  children,
  footer,
}: {
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="storefront-layout">
      {header}
      <main>{children}</main>
      {footer}
      <span className="sr-only">
        <LinkIcon aria-hidden="true" />
      </span>
    </div>
  );
}