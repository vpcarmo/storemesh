import { useContext, useEffect, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import type { StoreSettings } from "@/domain/store-settings";
import type { StorefrontNavigationItem } from "@/domain/storefront";
import { hideBrokenImage } from "@/lib/image";
import { StorefrontThemeStyleContext } from "@/components/storefront/storefront-theme-context";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function NavigationItem({
  item,
  isCurrent,
  onNavigate,
}: {
  item: StorefrontNavigationItem;
  isCurrent: boolean;
  onNavigate?: () => void;
}) {
  return item.href ? (
    <li>
      <a
        aria-current={isCurrent ? "page" : undefined}
        className={`storefront-nav-link${isCurrent ? " is-current" : ""}`}
        href={item.href}
        onClick={onNavigate}
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
  onNavigate,
}: {
  items: StorefrontNavigationItem[];
  currentPageId?: string;
  onNavigate?: () => void;
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
            {...(onNavigate === undefined ? {} : { onNavigate })}
          />
        ))}
      </ul>
    </nav>
  );
}

function StorefrontMobileNavigation({
  items,
  currentPageId,
}: {
  items: StorefrontNavigationItem[];
  currentPageId?: string;
}) {
  const [open, setOpen] = useState(false);
  const themeStyle = useContext(StorefrontThemeStyleContext);
  if (!themeStyle) {
    throw new Error("Storefront theme tokens are required for mobile navigation.");
  }

  useEffect(() => {
    const desktopBreakpoint = window.matchMedia("(min-width: 40rem)");
    const closeOnDesktop = () => {
      if (desktopBreakpoint.matches) setOpen(false);
    };

    closeOnDesktop();
    desktopBreakpoint.addEventListener("change", closeOnDesktop);
    return () => desktopBreakpoint.removeEventListener("change", closeOnDesktop);
  }, []);

  if (items.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-expanded={open}
          aria-label="Abrir menu"
          className="storefront-mobile-menu-trigger"
          type="button"
        >
          <Menu aria-hidden="true" size={22} />
        </button>
      </SheetTrigger>
      <SheetContent
        closeLabel="Fechar menu"
        className="storefront-mobile-sheet"
        side="right"
        style={{
          ...themeStyle,
          width: "min(88vw, 24rem)",
          backgroundColor: "var(--storefront-surface)",
          color: "var(--storefront-text)",
          fontFamily: "var(--storefront-font-body)",
          boxShadow: "var(--storefront-shadow)",
        }}
      >
        <SheetHeader className="storefront-mobile-sheet-header">
          <SheetTitle
            style={{
              color: "var(--storefront-text)",
              fontFamily: "var(--storefront-font-heading)",
            }}
          >
            Menu
          </SheetTitle>
          <SheetDescription
            style={{ color: "color-mix(in oklab, var(--storefront-text) 72%, transparent)" }}
          >
            Navegação da loja
          </SheetDescription>
        </SheetHeader>
        <div className="storefront-mobile-navigation">
          <StorefrontNavigation
            items={items}
            {...(currentPageId === undefined ? {} : { currentPageId })}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
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
            <span className="storefront-brand-name">{storeName}</span>
          </div>
          <div className="storefront-header-controls">
            {hasActions ? (
              <div className="storefront-header-actions">
                {searchSlot}
                {accountSlot}
                {cartSlot}
              </div>
            ) : null}
            <StorefrontMobileNavigation
              items={navigation}
              {...(currentPageId === undefined ? {} : { currentPageId })}
            />
          </div>
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
  const hasContact = Boolean(
    settings?.contactEmail?.trim() || settings?.phone?.trim() || settings?.whatsapp?.trim(),
  );

  return (
    <footer className="storefront-footer">
      <div className="storefront-footer-inner">
        <div>
          <p className="storefront-footer-title">{settings?.displayName ?? storeName}</p>
          {settings?.shortDescription ? <p>{settings.shortDescription}</p> : null}
          {address ? <p>{address}</p> : null}
        </div>
        {hasContact ? (
          <div>
            {settings?.contactEmail ? <p>{settings.contactEmail}</p> : null}
            {settings?.phone ? <p>{settings.phone}</p> : null}
            {settings?.whatsapp ? <p>{settings.whatsapp}</p> : null}
          </div>
        ) : null}
        <StorefrontNavigation items={socials} />
        <StorefrontNavigation items={institutionalLinks} />
        <StorefrontNavigation items={policyLinks} />
      </div>
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
