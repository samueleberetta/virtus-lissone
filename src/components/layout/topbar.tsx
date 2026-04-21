"use client";

import { LogOut, UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AppUser } from "@/lib/types/database";

const ROLE_LABEL: Record<AppUser["ruolo"], string> = {
  superadmin: "Superadmin",
  segretario: "Segretario",
  allenatore: "Allenatore",
};

export function Topbar({ user }: { user: AppUser }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const displayName =
    [user.nome, user.cognome].filter(Boolean).join(" ") || user.email;

  return (
    <header className="flex items-center justify-between bg-white border-b border-neutral-200 px-6 py-3 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <div className="lg:hidden h-8 w-8 rounded-full bg-virtus-red flex items-center justify-center text-virtus-yellow font-bold text-xs border border-virtus-yellow">
          VL
        </div>
        <h1 className="text-lg font-semibold text-neutral-900">
          Gestionale Virtus Lissone
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-sm font-medium text-neutral-800">
            {displayName}
          </span>
          <span className="text-xs text-neutral-500">{ROLE_LABEL[user.ruolo]}</span>
        </div>
        <UserCircle2 className="h-8 w-8 text-neutral-400" />
        <button
          onClick={handleLogout}
          className="text-sm text-neutral-600 hover:text-virtus-red flex items-center gap-1.5"
          title="Esci"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Esci</span>
        </button>
      </div>
    </header>
  );
}
