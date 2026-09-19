import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
}

export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) throw error;
  return data.session !== null;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (error.name === "AuthSessionMissingError") return null;
    throw error;
  }

  return data.user;
}

export function observeSession(
  listener: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange(listener);
  return () => data.subscription.unsubscribe();
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
