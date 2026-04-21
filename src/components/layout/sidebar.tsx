"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Shield,
  FileText,
  Wallet,
  CalendarCheck,
  ListChecks,
  Bell,
  Settings,
  History,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { UserRole } from "@/lib/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["superadmin", "segretario", "allenatore"] },
  { href: "/atleti", label: "Atleti", icon: Users, roles: ["superadmin", "segretario", "allenatore"] },
  { href: "/allenatori", label: "Allenatori", icon: UserCog, roles: ["superadmin"] },
  { href: "/squadre", label: "Squadre", icon: Shield, roles: ["superadmin", "segretario", "allenatore"] },
  { href: "/documenti", label: "Documenti", icon: FileText, roles: ["superadmin", "segretario", "allenatore"] },
  { href: "/quote", label: "Quote", icon: Wallet, roles: ["superadmin", "segretario"] },
  { href: "/convocazioni", label: "Convocazioni", icon: CalendarCheck, roles: ["superadmin", "segretario", "allenatore"] },
  { href: "/presenze", label: "Presenze", icon: ListChecks, roles: ["superadmin", "segretario", "allenatore"] },
  { href: "/avvisi", label: "Avvisi", icon: Bell, roles: ["superadmin", "segretario", "allenatore"] },
  { href: "/log", label: "Log attività", icon: History, roles: ["superadmin"] },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings, roles: ["superadmin"] },
];

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-virtus-dark text-neutral-200 min-h-screen">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-neutral-800">
        <div className="h-10 w-10 rounded-full bg-virtus-red flex items-center justify-center text-virtus-yellow font-bold text-xs border-2 border-virtus-yellow">
          VL
        </div>
        <div>
          <div className="text-sm font-semibold text-white leading-tight">
            Virtus Lissone
          </div>
          <div className="text-[11px] text-neutral-400">Polisportiva · 1903</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto sidebar-scroll py-3">
        {NAV.filter((item) => item.roles.includes(role)).map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 text-sm transition-colors",
                active
                  ? "bg-virtus-dark-800 text-virtus-yellow border-l-4 border-virtus-yellow font-medium"
                  : "text-neutral-300 hover:bg-virtus-dark-800 hover:text-white border-l-4 border-transparent",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-3 border-t border-neutral-800 text-[11px] text-neutral-500">
        <Link href="/privacy" className="flex items-center gap-1 hover:text-neutral-300">
          <ShieldCheck className="h-3 w-3" /> Privacy policy
        </Link>
      </div>
    </aside>
  );
}
