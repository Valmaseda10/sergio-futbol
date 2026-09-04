"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus,
  CalendarPlus,
  CalendarRange,
  MapPin,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Folder,
} from "lucide-react";
import { localDb, type LocalEntrenamiento } from "@/lib/db/local-db";
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
  const searchParams = useSearchParams();
  const mesSeleccionado = searchParams.get("mes");

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

  const mesActual = mesSeleccionado
    ? meses.find((m) => m.clave === mesSeleccionado)
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          {mesActual ? (
            <>
              <Link
                href="/entrenamientos"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
                Meses
              </Link>
              <h1 className="text-2xl font-semibold">
                {nombreMes(mesActual.clave)}
              </h1>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">Entrenamientos</h1>
              <Link
                href="/ajustes"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Temporada {temporada.replace("-", "/")}
              </Link>
            </>
          )}
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

      {!mesActual && <HorarioSemanalResumen />}

      {mesActual ? (
        mesActual.entrenamientos.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No hay entrenamientos ese mes.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {mesActual.entrenamientos.map((e) => (
              <Fila key={e.id} e={e} />
            ))}
          </ul>
        )
      ) : meses.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No hay entrenamientos programados.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {meses.map(({ clave, entrenamientos: lista, esMesActual }) => (
            <li key={clave}>
              <Link
                href={`/entrenamientos?mes=${clave}`}
                className="flex items-center gap-3 p-3 hover:bg-muted/50"
              >
                <Folder
                  className={
                    esMesActual
                      ? "size-5 shrink-0 text-primary"
                      : "size-5 shrink-0 text-muted-foreground"
                  }
                />
                <span
                  className={
                    esMesActual
                      ? "flex-1 font-heading text-sm uppercase tracking-wide text-primary"
                      : "flex-1 text-sm font-medium"
                  }
                >
                  {nombreMes(clave)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {lista.length}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
