"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { CampogramaCampoUnificado } from "@/components/campograma/campograma-campo-unificado";

export default function NuevoCampogramaPage() {
  const jugadores = useLiveQuery(
    () =>
      localDb.jugadores
        .filter((j) => j.activo)
        .toArray()
        .then((rows) =>
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
      <h1 className="text-2xl font-semibold">Nuevo campograma</h1>
      <CampogramaCampoUnificado jugadores={jugadores} />
    </div>
  );
}
