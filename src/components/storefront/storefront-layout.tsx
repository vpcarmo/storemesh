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
import { isValidHttpUrl } from "@/domain/storefront-theme";

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
  alignment,
}: {
  items: StorefrontNavigationItem[];
  currentPageId?: string;
  onNavigate?: () => void;
  alignment?: "left" | "center" | "right";
}) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Navegação da loja"
      className="storefront-navigation"
      {...(alignment === undefined ? {} : { "data-alignment": alignment })}
    >
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
  const themeStyle = useContext(StorefrontThemeStyleContext);
  const headerLayout = String(themeStyle?.["--storefront-header-layout"] ?? "stacked");
  const navigationAlignment = String(
    themeStyle?.["--storefront-header-navigation-alignment"] ?? "left",
  ) as "left" | "center" | "right";
  const showStoreName = themeStyle?.["--storefront-header-show-store-name"] !== "false";

  return (
    <header className="storefront-header">
      <div
        className="storefront-header-inner"
        data-layout={headerLayout}
        data-navigation-alignment={navigationAlignment}
      >
        <div className="storefront-header-row">
          <div
            className="storefront-brand"
            data-has-logo={Boolean(logoUrl)}
            data-show-name={showStoreName}
          >
            {logoUrl ? (
              <img
                key={logoUrl}
                src={logoUrl}
                alt={showStoreName ? "" : storeName}
                className="storefront-logo"
                onError={(event) => {
                  hideBrokenImage(event);
                  event.currentTarget.parentElement?.classList.add("has-broken-logo");
                }}
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
          alignment={navigationAlignment}
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
    typeof href === "string" && isValidHttpUrl(href) ? [{ id: label, label, href }] : [],
  );
}

export function StorefrontFooter({
  storeName,
  settings,
  helpLinks = [],
  institutionalLinks = [],
  copyrightYear,
}: {
  storeName: string;
  settings: StoreSettings | null;
  helpLinks?: StorefrontNavigationItem[];
  institutionalLinks?: StorefrontNavigationItem[];
  copyrightYear: number;
}) {
  const themeStyle = useContext(StorefrontThemeStyleContext);
  const address = settings ? textFromObject(settings.address) : null;
  const socials = settings ? socialItems(settings.socialLinks) : [];
  const displayName = settings?.displayName?.trim() || storeName;
  const hasContact = Boolean(
    address ||
    settings?.contactEmail?.trim() ||
    settings?.phone?.trim() ||
    settings?.whatsapp?.trim(),
  );
  const showLogo = themeStyle?.["--storefront-footer-show-logo"] === "true";
  const showDescription = themeStyle?.["--storefront-footer-show-description"] !== "false";
  const columns = String(themeStyle?.["--storefront-footer-columns"] ?? "auto");
  const contentBlockCount =
    1 +
    Number(hasContact) +
    Number(socials.length > 0) +
    Number(helpLinks.length > 0) +
    Number(institutionalLinks.length > 0);
  const visibleColumns =
    columns === "auto" ? "auto" : String(Math.min(Number(columns), contentBlockCount));
  const footerAlignment = String(themeStyle?.["--storefront-footer-alignment"] ?? "left");
  const footerSpacing = String(themeStyle?.["--storefront-footer-spacing"] ?? "comfortable");

  return (
    <footer
      className="storefront-footer"
      data-alignment={footerAlignment}
      data-spacing={footerSpacing}
    >
      <div className="storefront-footer-inner" data-columns={visibleColumns}>
        <div className="storefront-footer-brand">
          {showLogo && settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt=""
              className="storefront-footer-logo"
              onError={hideBrokenImage}
            />
          ) : null}
          <p className="storefront-footer-title">{displayName}</p>
          {showDescription && settings?.shortDescription ? (
            <p className="storefront-footer-description">{settings.shortDescription}</p>
          ) : null}
        </div>
        {helpLinks.length ? (
          <section className="storefront-footer-group">
            <h2>AJUDA</h2>
            <StorefrontNavigation items={helpLinks} />
          </section>
        ) : null}
        {institutionalLinks.length ? (
          <section className="storefront-footer-group">
            <h2>INSTITUCIONAL</h2>
            <StorefrontNavigation items={institutionalLinks} />
          </section>
        ) : null}
        {socials.length ? (
          <section className="storefront-footer-group">
            <h2>SIGA A LOJA</h2>
            <StorefrontNavigation items={socials} />
          </section>
        ) : null}
        {hasContact ? (
          <section className="storefront-footer-group">
            <h2>Contato</h2>
            {address ? <p>{address}</p> : null}
            {settings?.contactEmail ? <p>{settings.contactEmail}</p> : null}
            {settings?.phone ? <p>{settings.phone}</p> : null}
            {settings?.whatsapp ? <p>{settings.whatsapp}</p> : null}
          </section>
        ) : null}
      </div>
      <p className="storefront-footer-copyright">
        © {copyrightYear} {displayName} — Todos os direitos reservados.
      </p>
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
