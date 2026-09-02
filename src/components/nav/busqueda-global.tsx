"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Search, User, CalendarRange, Dumbbell } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { capitalizarPrimera } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JugadorAvatar } from "@/components/plantilla/jugador-avatar";

const LIMITE_POR_GRUPO = 6;

const MARCAS_COMBINACION = new RegExp(
  "[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]",
  "g",
);

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(MARCAS_COMBINACION, "").toLowerCase();
}

function formatearFechaCorta(fecha: string) {
  return capitalizarPrimera(
    new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  );
}

export function BusquedaGlobal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const jugadores = useLiveQuery(
    () => localDb.jugadores.filter((j) => j.activo).toArray(),
    [],
    [],
  );
  const partidos = useLiveQuery(() => localDb.partidos.toArray(), [], []);
  const entrenamientos = useLiveQuery(
    () => localDb.entrenamientos.toArray(),
    [],
    [],
  );

  const termino = normalizar(query.trim());

  const resultadosJugadores = useMemo(() => {
    if (!termino) return [];
    return jugadores
      .filter((j) => {
        const texto = normalizar(
          `${j.nombre} ${j.apellidos} ${j.alias ?? ""} ${j.dorsal ?? ""}`,
        );
        return texto.includes(termino);
      })
      .slice(0, LIMITE_POR_GRUPO);
  }, [jugadores, termino]);

  const resultadosPartidos = useMemo(() => {
    if (!termino) return [];
    return partidos
      .filter((p) => normalizar(`${p.rival} ${p.lugar ?? ""}`).includes(termino))
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, LIMITE_POR_GRUPO);
  }, [partidos, termino]);

  const resultadosEntrenamientos = useMemo(() => {
    if (!termino) return [];
    return entrenamientos
      .filter((e) =>
        normalizar(`${e.lugar ?? ""} ${formatearFechaCorta(e.fecha)}`).includes(
          termino,
        ),
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, LIMITE_POR_GRUPO);
  }, [entrenamientos, termino]);

  const hayResultados =
    resultadosJugadores.length > 0 ||
    resultadosPartidos.length > 0 ||
    resultadosEntrenamientos.length > 0;

  function cerrar() {
    setOpen(false);
    setQuery("");
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Buscar"
        className="text-[#f3ece7] hover:bg-white/10 hover:text-[#f3ece7]"
      >
        <Search className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : cerrar())}>
        <DialogContent className="top-[10%] translate-y-0 gap-3">
          <DialogHeader>
            <DialogTitle>Buscar</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Jugador, rival, lugar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {termino === "" ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Escribe para buscar jugadores, partidos o entrenamientos.
            </p>
          ) : !hayResultados ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin resultados para &quot;{query}&quot;.
            </p>
          ) : (
            <div className="max-h-96 space-y-4 overflow-y-auto">
              {resultadosJugadores.length > 0 && (
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                    <User className="size-3.5" />
                    Jugadores
                  </p>
                  {resultadosJugadores.map((j) => (
                    <Link
                      key={j.id}
                      href={`/plantilla/${j.id}`}
                      onClick={cerrar}
                      className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted"
                    >
                      <JugadorAvatar
                        src={null}
                        nombre={j.nombre}
                        apellidos={j.apellidos}
                        className="size-7"
                      />
                      {j.dorsal != null ? `${j.dorsal} · ` : ""}
                      {j.alias || `${j.nombre} ${j.apellidos}`}
                    </Link>
                  ))}
                </div>
              )}

              {resultadosPartidos.length > 0 && (
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                    <CalendarRange className="size-3.5" />
                    Partidos
                  </p>
                  {resultadosPartidos.map((p) => (
                    <Link
                      key={p.id}
                      href={`/partidos/${p.id}`}
                      onClick={cerrar}
                      className="flex items-center justify-between gap-2 rounded-md p-2 text-sm hover:bg-muted"
                    >
                      <span>
                        {p.local_visitante === "local" ? "vs" : "@"} {p.rival}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatearFechaCorta(p.fecha)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {resultadosEntrenamientos.length > 0 && (
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                    <Dumbbell className="size-3.5" />
                    Entrenamientos
                  </p>
                  {resultadosEntrenamientos.map((e) => (
                    <Link
                      key={e.id}
                      href={`/entrenamientos/${e.id}`}
                      onClick={cerrar}
                      className="flex items-center justify-between gap-2 rounded-md p-2 text-sm hover:bg-muted"
                    >
                      <span>{e.lugar || "Entrenamiento"}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatearFechaCorta(e.fecha)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
