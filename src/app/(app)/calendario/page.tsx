"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { localDb, type LocalEntrenamiento, type LocalPartido } from "@/lib/db/local-db";
import { cn } from "@/lib/utils";
import { capitalizarPrimera } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function fechaISO(year: number, month: number, day: number) {
  const d = new Date(year, month, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DIAS_CORTOS = ["L", "M", "X", "J", "V", "S", "D"];

interface Celda {
  fecha: string;
  dia: number;
  delMes: boolean;
}

export default function CalendarioPage() {
  const hoy = hoyISO();
  const ahora = new Date();
  const [year, setYear] = useState(ahora.getFullYear());
  const [month, setMonth] = useState(ahora.getMonth());
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoy);

  const entrenamientos = useLiveQuery(
    () => localDb.entrenamientos.toArray(),
    [],
    [],
  );
  const partidos = useLiveQuery(() => localDb.partidos.toArray(), [], []);

  const entrenosPorFecha = useMemo(() => {
    const map = new Map<string, LocalEntrenamiento[]>();
    for (const e of entrenamientos) {
      const arr = map.get(e.fecha) ?? [];
      arr.push(e);
      map.set(e.fecha, arr);
    }
    return map;
  }, [entrenamientos]);

  const partidosPorFecha = useMemo(() => {
    const map = new Map<string, LocalPartido[]>();
    for (const p of partidos) {
      const arr = map.get(p.fecha) ?? [];
      arr.push(p);
      map.set(p.fecha, arr);
    }
    return map;
  }, [partidos]);

  const celdas = useMemo(() => {
    const primerDiaMes = new Date(year, month, 1);
    // getDay(): 0=domingo..6=sábado; se convierte a lunes=0..domingo=6.
    const offset = (primerDiaMes.getDay() + 6) % 7;
    const diasEnMes = new Date(year, month + 1, 0).getDate();
    const diasMesAnterior = new Date(year, month, 0).getDate();

    const resultado: Celda[] = [];

    for (let i = offset - 1; i >= 0; i--) {
      const dia = diasMesAnterior - i;
      resultado.push({ fecha: fechaISO(year, month - 1, dia), dia, delMes: false });
    }
    for (let dia = 1; dia <= diasEnMes; dia++) {
      resultado.push({ fecha: fechaISO(year, month, dia), dia, delMes: true });
    }
    let diaSiguiente = 1;
    while (resultado.length % 7 !== 0) {
      resultado.push({
        fecha: fechaISO(year, month + 1, diaSiguiente),
        dia: diaSiguiente,
        delMes: false,
      });
      diaSiguiente++;
    }

    return resultado;
  }, [year, month]);

  function irMesAnterior() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function irMesSiguiente() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const nombreMes = capitalizarPrimera(
    new Date(year, month, 1).toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    }),
  );

  const entrenosDia = entrenosPorFecha.get(diaSeleccionado) ?? [];
  const partidosDia = partidosPorFecha.get(diaSeleccionado) ?? [];

  return (
    <div className="space-y-4">
      <Link
        href="/inicio"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Inicio
      </Link>

      <h1 className="text-2xl font-semibold">Calendario</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-3 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={irMesAnterior}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <p className="font-heading text-base capitalize">{nombreMes}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={irMesSiguiente}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
            {DIAS_CORTOS.map((d, i) => (
              <div key={`${d}-${i}`}>{d}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {celdas.map((c) => {
              const tieneEntreno = (entrenosPorFecha.get(c.fecha)?.length ?? 0) > 0;
              const tienePartido = (partidosPorFecha.get(c.fecha)?.length ?? 0) > 0;
              const esHoy = c.fecha === hoy;
              const esSeleccionado = c.fecha === diaSeleccionado;
              return (
                <button
                  key={c.fecha}
                  type="button"
                  onClick={() => setDiaSeleccionado(c.fecha)}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md text-xs",
                    !c.delMes && "text-muted-foreground/40",
                    esSeleccionado && "bg-primary text-primary-foreground",
                    !esSeleccionado && esHoy && "border border-gold font-semibold",
                    !esSeleccionado && "hover:bg-muted",
                  )}
                >
                  <span>{c.dia}</span>
                  {(tieneEntreno || tienePartido) && (
                    <span className="flex gap-0.5">
                      {tieneEntreno && (
                        <span
                          className={cn(
                            "size-1 rounded-full",
                            esSeleccionado ? "bg-primary-foreground" : "bg-primary",
                          )}
                        />
                      )}
                      {tienePartido && (
                        <span
                          className={cn(
                            "size-1 rounded-full",
                            esSeleccionado ? "bg-primary-foreground" : "bg-gold",
                          )}
                        />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          {capitalizarPrimera(
            new Date(`${diaSeleccionado}T00:00:00`).toLocaleDateString("es-ES", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            }),
          )}
        </p>
        {entrenosDia.length === 0 && partidosDia.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nada programado este día.
          </p>
        ) : (
          <div className="space-y-2">
            {entrenosDia.map((e) => (
              <Link
                key={e.id}
                href={`/entrenamientos/${e.id}`}
                className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50"
              >
                <span className="size-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Entrenamiento</p>
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
              </Link>
            ))}
            {partidosDia.map((p) => (
              <Link
                key={p.id}
                href={`/partidos/${p.id}`}
                className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50"
              >
                <span className="size-2 shrink-0 rounded-full bg-gold" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {p.local_visitante === "local" ? "vs" : "@"} {p.rival}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    {p.hora && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {p.hora.slice(0, 5)}
                      </span>
                    )}
                    {p.lugar && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {p.lugar}
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
