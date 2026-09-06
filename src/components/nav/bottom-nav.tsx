"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  CalendarDays,
  Trophy,
  Swords,
  LayoutGrid,
  LayoutList,
  Video,
  BarChart3,
  Settings,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/inicio", label: "Inicio", icon: Home },
  { href: "/plantilla", label: "Plantilla", icon: Users },
  { href: "/entrenamientos", label: "Entrenamientos", icon: CalendarDays },
  { href: "/partidos", label: "Partidos", icon: Trophy },
  { href: "/tagueo", label: "Tagueo", icon: Tag },
  { href: "/rivales", label: "Rivales", icon: Swords },
  { href: "/pizarra", label: "Pizarra", icon: LayoutGrid },
  { href: "/campograma", label: "Campograma", icon: LayoutList },
  { href: "/videos", label: "Vídeos", icon: Video },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      aria-label="Navegación principal"
    >
      <ul className="grid grid-cols-11">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="min-w-0">
              <Link
                href={href}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-0.5 px-0.5 py-2 text-center",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="w-full text-[8.5px] leading-[1.15] break-words hyphens-auto">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav
      className="hidden w-56 shrink-0 border-r p-4 md:block print:hidden"
      aria-label="Navegación principal"
    >
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
