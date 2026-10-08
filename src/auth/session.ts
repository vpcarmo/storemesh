import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

let inviteSessionUserId: string | null = null;

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw error;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = new URL("/auth/reset-password", window.location.origin).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    if (error.name === "AuthSessionMissingError") return null;
    throw error;
  }

  return data.user;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;
  return data.session;
}

function getAuthCallbackParams(): URLSearchParams {
  const params = new URLSearchParams(window.location.search);
  const fragmentParams = new URLSearchParams(window.location.hash.slice(1));
  fragmentParams.forEach((value, key) => params.set(key, value));
  return params;
}

export function hasExpiredInviteCallback(): boolean {
  return getAuthCallbackParams().get("error_code") === "otp_expired";
}

function clearAuthCallbackParams(): void {
  const url = new URL(window.location.href);
  for (const param of [
    "access_token",
    "refresh_token",
    "expires_in",
    "expires_at",
    "token_type",
    "provider_token",
    "provider_refresh_token",
    "type",
    "error",
    "error_code",
    "error_description",
  ]) {
    url.searchParams.delete(param);
  }
  url.hash = "";
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
}

export async function getInviteSession(): Promise<Session | null> {
  const params = getAuthCallbackParams();
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (params.get("type") === "invite" && accessToken && refreshToken) {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      if (!data.session) {
        throw new Error("O Supabase Auth não retornou uma sessão após processar o convite.");
      }
      inviteSessionUserId = data.session.user.id;
    } finally {
      clearAuthCallbackParams();
    }
  }

  const session = await getCurrentSession();
  return session?.user.id === inviteSessionUserId ? session : null;
}

export function observeSession(
  listener: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") inviteSessionUserId = null;
    listener(event, session);
  });
  return () => data.subscription.unsubscribe();
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
