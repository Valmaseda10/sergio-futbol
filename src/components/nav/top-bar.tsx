"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Rol } from "@/lib/types/database.types";

export function TopBar({ nombre, rol }: { nombre: string; rol: Rol }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background px-4 py-3">
      <div>
        <p className="text-sm font-semibold leading-tight">Infantil B</p>
        <p className="text-xs text-muted-foreground">
          Cultural y Deportiva Leonesa
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight">{nombre}</p>
          <Badge variant="secondary" className="text-[10px] capitalize">
            {rol}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          aria-label="Cerrar sesión"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
