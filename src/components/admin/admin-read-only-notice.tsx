import { useAdminStore } from "@/components/admin/admin-store-context";
import type { Permission } from "@/domain/access";

export function AdminReadOnlyNotice({ permission }: { permission: Permission }) {
  const { hasPermission } = useAdminStore();
  if (hasPermission(permission)) return null;

  return (
    <p
      className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
      role="status"
    >
      Você tem acesso somente para visualização.
    </p>
  );
}
