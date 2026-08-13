"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import { JugadoresList } from "@/components/plantilla/jugadores-list";

export default function PlantillaPage() {
  const jugadores = useLiveQuery(
    () =>
      localDb.jugadores.toArray().then((rows) =>
        rows.sort((a, b) => {
          if (a.dorsal == null && b.dorsal != null) return 1;
          if (a.dorsal != null && b.dorsal == null) return -1;
          if (a.dorsal != null && b.dorsal != null && a.dorsal !== b.dorsal) {
            return a.dorsal - b.dorsal;
          }
          return a.apellidos.localeCompare(b.apellidos);
        }),
      ),
    [],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Plantilla</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/plantilla/nuevo" />}>
          <Plus className="size-4" />
          Nuevo
        </Button>
      </div>
      <JugadoresList jugadores={jugadores ?? []} />
    </div>
  );
}
