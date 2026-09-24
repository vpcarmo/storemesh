export function AdminPlaceholder({
  title,
  description,
  items = [],
}: {
  title: string;
  description: string;
  items?: string[];
}) {
  return (
    <section className="rounded-xl border border-dashed border-border p-6" aria-label={title}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">{description}</p>
      {items.length ? (
        <ul className="mt-4 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2 text-muted-foreground">
              {item}
              <span className="rounded-full border border-border px-2 py-0.5 text-xs">Em breve</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Em breve</p>
      )}
    </section>
  );
}
