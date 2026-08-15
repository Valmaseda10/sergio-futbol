"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { capitalizarPrimera } from "@/lib/date";
import { AsistenciaGrid } from "@/components/entrenamientos/asistencia-grid";

function formatearFechaCorta(fecha: string) {
  return capitalizarPrimera(
    new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }),
  );
}

export default function AsistenciaPage() {
  const { id } = useParams<{ id: string }>();

  const entrenamiento = useLiveQuery(
    async () => (await localDb.entrenamientos.get(id)) ?? null,
    [id],
  );
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
  const estados = useLiveQuery(
    () =>
      localDb.estados
        .filter((e) => e.activo && e.tipo === "entrenamiento")
        .toArray()
        .then((rows) => rows.sort((a, b) => a.nombre.localeCompare(b.nombre))),
    [],
    [],
  );
  const jugadoresParaGrid = useMemo(
    () => jugadores.map(({ foto_url, ...j }) => ({ ...j, foto_url })),
    [jugadores],
  );

  if (entrenamiento === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (entrenamiento === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Entrenamiento no encontrado.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/entrenamientos/${id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver al entrenamiento
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">
          {formatearFechaCorta(entrenamiento.fecha)}
        </h1>
        <p className="text-sm text-muted-foreground">
          Todos cuentan como asistidos salvo que marques lo contrario.
        </p>
      </div>
      <AsistenciaGrid
        entrenamientoId={id}
        fecha={entrenamiento.fecha}
        jugadores={jugadoresParaGrid}
        estados={estados}
      />
    </div>
  );
}
