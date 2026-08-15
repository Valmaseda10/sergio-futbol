"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useTemporadaSeleccionada } from "@/lib/hooks/use-temporada-seleccionada";
import { temporadaCorta } from "@/lib/temporada";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crest } from "@/components/branding/crest";
import { SyncStatusBadge } from "@/components/sync/sync-status";
import type { Rol } from "@/lib/types/database.types";

export function TopBar({ nombre, rol }: { nombre: string; rol: Rol }) {
  const router = useRouter();
  const supabase = createClient();
  const { temporada } = useTemporadaSeleccionada();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-[#1c1512] px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] text-[#f3ece7] print:hidden">
      <Link href="/inicio" className="flex min-w-0 items-center gap-2.5">
        <Crest size={30} />
        <div className="min-w-0">
          <p className="truncate font-heading text-sm uppercase tracking-wide leading-tight">
            Infantil B {temporadaCorta(temporada)}
          </p>
          <p className="truncate text-[11px] text-[#c9bdb6]">
            Panel del entrenador
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        <SyncStatusBadge />
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight">{nombre}</p>
          <Badge className="border-transparent bg-[#3a2e14] text-[10px] capitalize text-[#d9a857]">
            {rol}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          aria-label="Cerrar sesión"
          className="text-[#f3ece7] hover:bg-white/10 hover:text-[#f3ece7]"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
