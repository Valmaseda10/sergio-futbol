"use client";

// Las dos categorías de la sección Rivales: la lista de equipos (fichas de scouting) y la
// clasificación de la liga.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const PESTANAS = [
  { href: "/rivales", etiqueta: "Equipos", icono: ListChecks },
  { href: "/rivales/clasificacion", etiqueta: "Clasificación", icono: Trophy },
] as const;

export function RivalesPestanas() {
  const ruta = usePathname();
  const enClasificacion = ruta.startsWith("/rivales/clasificacion");
  return (
    <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Rivales">
      {PESTANAS.map((p) => {
        const activa = p.href === "/rivales/clasificacion" ? enClasificacion : !enClasificacion;
        return (
          <Link
            key={p.href}
            href={p.href}
            role="tab"
            aria-selected={activa}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium",
              activa ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            <p.icono className="size-4" />
            {p.etiqueta}
          </Link>
        );
      })}
    </div>
  );
}
