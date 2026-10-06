import type { ReactNode } from "react";

import type { StoreSettings } from "@/domain/store-settings";
import type { StorefrontNavigationItem } from "@/domain/storefront";
import { hideBrokenImage } from "@/lib/image";

function NavigationItem({
  item,
  isCurrent,
}: {
  item: StorefrontNavigationItem;
  isCurrent: boolean;
}) {
  return item.href ? (
    <li>
      <a
        aria-current={isCurrent ? "page" : undefined}
        className={`storefront-nav-link${isCurrent ? " is-current" : ""}`}
        href={item.href}
      >
        {item.label}
      </a>
    </li>
  ) : (
    <li>
      <span className="storefront-nav-label">{item.label}</span>
    </li>
  );
}

export function StorefrontNavigation({
  items,
  currentPageId,
}: {
  items: StorefrontNavigationItem[];
  currentPageId?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Navegação da loja" className="storefront-navigation">
      <ul>
        {items.map((item) => (
          <NavigationItem
            key={item.id}
            item={item}
            isCurrent={Boolean(currentPageId && item.pageId === currentPageId)}
          />
        ))}
      </ul>
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
  currentPageId,
}: {
  storeName: string;
  logoUrl: string | null;
  navigation: StorefrontNavigationItem[];
  searchSlot?: ReactNode;
  accountSlot?: ReactNode;
  cartSlot?: ReactNode;
  currentPageId?: string;
}) {
  const hasActions = Boolean(searchSlot || accountSlot || cartSlot);

  return (
    <header className="storefront-header">
      <div className="storefront-header-inner">
        <div className="storefront-header-row">
          <div className="storefront-brand">
            {logoUrl ? (
              <img
                key={logoUrl}
                src={logoUrl}
                alt=""
                className="storefront-logo"
                onError={hideBrokenImage}
              />
            ) : null}
            <span>{storeName}</span>
          </div>
          {hasActions ? (
            <div className="storefront-header-actions">
              {searchSlot}
              {accountSlot}
              {cartSlot}
            </div>
          ) : null}
        </div>
        <StorefrontNavigation
          items={navigation}
          {...(currentPageId === undefined ? {} : { currentPageId })}
        />
      </div>
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
    typeof href === "string" && /^https?:\/\//.test(href) ? [{ id: label, label, href }] : [],
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
    </div>
  );
}
