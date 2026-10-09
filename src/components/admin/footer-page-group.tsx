import { Button } from "@/components/ui/button";
import { FormHelp } from "@/components/admin/form-help";
import type { StorefrontFooterPage } from "@/domain/storefront-footer";

export function FooterPageGroup({
  idPrefix,
  title,
  pages,
  selectedIds,
  onChange,
  disabled,
}: {
  idPrefix: string;
  title: string;
  pages: StorefrontFooterPage[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
}) {
  function movePage(index: number, offset: -1 | 1) {
    if (disabled) return;
    const next = [...selectedIds];
    const target = index + offset;
    const movedPage = next[index];
    if (!movedPage) return;
    next.splice(index, 1);
    next.splice(target, 0, movedPage);
    onChange(next);
  }

  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">{title}</legend>
      {pages.length ? (
        <div className="grid gap-2">
          {pages.map((page) => {
            const id = `${idPrefix}-${page.id}`;
            return (
              <label key={page.id} htmlFor={id} className="flex items-center gap-2 text-sm">
                <input
                  id={id}
                  type="checkbox"
                  disabled={disabled}
                  checked={selectedIds.includes(page.id)}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...selectedIds, page.id]
                        : selectedIds.filter((selectedId) => selectedId !== page.id),
                    )
                  }
                />
                {page.title}
              </label>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Não há páginas publicadas nesta loja.</p>
      )}
      {selectedIds.length ? (
        <ol className="grid gap-2">
          {selectedIds.map((pageId, index) => {
            const page = pages.find(({ id }) => id === pageId);
            if (!page) {
              return (
                <li
                  key={pageId}
                  className="flex items-center justify-between gap-3 text-sm text-muted-foreground"
                >
                  <span>Página indisponível</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() =>
                      onChange(selectedIds.filter((selectedId) => selectedId !== pageId))
                    }
                  >
                    Remover referência
                  </Button>
                </li>
              );
            }
            return (
              <li key={pageId} className="flex items-center justify-between gap-3 text-sm">
                <span>{page.title}</span>
                <span className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={`Mover ${page.title} para cima em ${title}`}
                    disabled={disabled || index === 0}
                    onClick={() => movePage(index, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label={`Mover ${page.title} para baixo em ${title}`}
                    disabled={disabled || index === selectedIds.length - 1}
                    onClick={() => movePage(index, 1)}
                  >
                    ↓
                  </Button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
      <FormHelp>A ordem desta lista define a ordem visual dos links no Footer.</FormHelp>
    </fieldset>
  );
}
