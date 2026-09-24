import { createContext, useContext } from "react";

import type { StoreAccess } from "@/domain/access";

export interface AdminStoreContextValue {
  /** Slug informado ao backend; null deixa a resolução para a loja atribuída. */
  storeSlug: string | null;
  /** Verdadeiro quando o usuário precisa escolher explicitamente uma loja. */
  requiresStoreSelection: boolean;
  stores: StoreAccess[];
  selectStore: (slug: string | null) => void;
}

export const AdminStoreContext = createContext<AdminStoreContextValue | null>(null);

export function useAdminStore(): AdminStoreContextValue {
  const context = useContext(AdminStoreContext);
  if (!context) throw new Error("useAdminStore precisa estar dentro do Admin Shell.");
  return context;
}
