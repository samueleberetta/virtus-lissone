import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppUser, UserRole } from "@/lib/types/database";

export async function getSessionUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, email, nome, cognome, ruolo, attivo")
    .eq("id", user.id)
    .single();

  return (data as AppUser) ?? null;
}

export async function requireUser(): Promise<AppUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: UserRole[]): Promise<AppUser> {
  const user = await requireUser();
  if (!roles.includes(user.ruolo)) redirect("/dashboard");
  return user;
}

export function canManageData(role: UserRole): boolean {
  return role === "superadmin" || role === "segretario";
}

export function isSuperadmin(role: UserRole): boolean {
  return role === "superadmin";
}
