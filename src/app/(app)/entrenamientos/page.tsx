"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus,
  CalendarPlus,
  CalendarRange,
  MapPin,
  Clock,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { localDb, type LocalEntrenamiento } from "@/lib/db/local-db";
import { cn } from "@/lib/utils";
import { capitalizarPrimera } from "@/lib/date";
import { temporadaDeFecha } from "@/lib/temporada";
import { useTemporadaSeleccionada } from "@/lib/hooks/use-temporada-seleccionada";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FechaTile } from "@/components/ui/fecha-tile";
import { HorarioSemanalResumen } from "@/components/entrenamientos/horario-semanal-resumen";

function nombreDia(fecha: string) {
  return capitalizarPrimera(
    new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
      weekday: "long",
    }),
  );
}

function claveMes(fecha: string) {
  return fecha.slice(0, 7); // YYYY-MM
}

function nombreMes(clave: string) {
  const [anio, mes] = clave.split("-").map(Number);
  return capitalizarPrimera(
    new Date(anio, mes - 1, 1).toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    }),
  );
}

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function Fila({ e }: { e: LocalEntrenamiento }) {
  return (
    <li key={e.id}>
      <Link
        href={`/entrenamientos/${e.id}`}
        className="flex items-center gap-3 p-3 hover:bg-muted/50"
      >
        <FechaTile fecha={e.fecha} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{nombreDia(e.fecha)}</p>
          <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
            {e.hora_inicio && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {e.hora_inicio.slice(0, 5)}
              </span>
            )}
            {e.lugar && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {e.lugar}
              </span>
            )}
          </p>
        </div>
        {!e.objetivos && <Badge variant="outline">Sin planificar</Badge>}
      </Link>
    </li>
  );
}

export default function EntrenamientosPage() {
  const hoy = hoyISO();

  // El mes actual empieza desplegado; el resto, plegado — así se recogen
  // los meses pasados/futuros y la lista no se hace kilométrica, pero se
  // pueden abrir tocando su cabecera.
  const [mesesAbiertos, setMesesAbiertos] = useState<Set<string>>(
    () => new Set([claveMes(hoy)]),
  );

  function toggleMes(clave: string) {
    setMesesAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) {
        next.delete(clave);
      } else {
        next.add(clave);
      }
      return next;
    });
  }

  const entrenamientos = useLiveQuery(
    () => localDb.entrenamientos.toArray(),
    [],
    [],
  );
  const { temporada } = useTemporadaSeleccionada();

  const entrenamientosTemporada = useMemo(
    () => entrenamientos.filter((e) => temporadaDeFecha(e.fecha) === temporada),
    [entrenamientos, temporada],
  );

  const meses = useMemo(() => {
    const grupos = new Map<string, LocalEntrenamiento[]>();
    for (const e of entrenamientosTemporada) {
      const clave = claveMes(e.fecha);
      if (!grupos.has(clave)) grupos.set(clave, []);
      grupos.get(clave)!.push(e);
    }
    return Array.from(grupos.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([clave, lista]) => ({
        clave,
        entrenamientos: lista.sort((a, b) => a.fecha.localeCompare(b.fecha)),
        esMesActual: clave === claveMes(hoy),
      }));
  }, [entrenamientosTemporada, hoy]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Entrenamientos</h1>
          <Link
            href="/ajustes"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Temporada {temporada.replace("-", "/")}
          </Link>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/calendario" aria-label="Ver calendario" />}
          >
            <CalendarRange className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href="/entrenamientos/ejercicios"
                aria-label="Biblioteca de ejercicios"
              />
            }
          >
            <BookOpen className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/entrenamientos/generar" />}
          >
            <CalendarPlus className="size-4" />
            Generar
          </Button>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/entrenamientos/nuevo" />}
          >
            <Plus className="size-4" />
            Nuevo
          </Button>
        </div>
      </div>

      <HorarioSemanalResumen />

      {meses.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No hay entrenamientos programados.
        </p>
      ) : (
        meses.map(({ clave, entrenamientos: lista, esMesActual }) => {
          const abierto = mesesAbiertos.has(clave);
          return (
            <section key={clave} className="space-y-2">
              <button
                type="button"
                onClick={() => toggleMes(clave)}
                className={
                  esMesActual
                    ? "flex w-full items-center justify-between font-heading text-sm uppercase tracking-wide text-primary"
                    : "flex w-full items-center justify-between text-sm font-medium text-muted-foreground"
                }
              >
                <span>
                  {nombreMes(clave)}{" "}
                  <span className="font-sans text-xs font-normal normal-case tracking-normal text-muted-foreground">
                    ({lista.length})
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 transition-transform",
                    abierto && "rotate-180",
                  )}
                />
              </button>
              {abierto && (
                <ul className="divide-y rounded-md border">
                  {lista.map((e) => (
                    <Fila key={e.id} e={e} />
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
