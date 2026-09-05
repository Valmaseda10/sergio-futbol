"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Trash2, ArrowUpCircle, ArrowDownCircle, MapPin } from "lucide-react";
import { crearEventoLocal, eliminarEventoLocal } from "@/app/(app)/partidos/local-actions";
import { localDb, type LocalEventoPartido } from "@/lib/db/local-db";
import type { TipoAbp, TipoEventoPartido, TipoGol } from "@/lib/types/database.types";
import { TIPOS_GOL, TIPO_GOL_LABEL, TIPOS_ABP, TIPO_ABP_LABEL } from "@/lib/validations/gol";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  CampoMiniSelector,
  CampoMiniSelectorDoble,
  CampoMiniDisplay,
} from "@/components/partidos/campo-mini-selector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
  alias: string | null;
  dorsal: number | null;
}

function nombreMostrado(j: Jugador) {
  return j.alias || `${j.nombre} ${j.apellidos}`;
}

const TIPO_LABEL: Record<TipoEventoPartido, string> = {
  gol: "Gol",
  asistencia: "Asistencia",
  tarjeta_amarilla: "Tarjeta amarilla",
  tarjeta_roja: "Tarjeta roja",
  cambio_entra: "Entra al campo",
  cambio_sale: "Sale del campo",
  autogol: "Autogol",
};

// Los cambios de jugador se registran ahora en su propio apartado (Cambios),
// no aquí: cambio_entra/cambio_sale se quedan en TIPO_LABEL solo por si
// queda algún evento histórico de ese tipo que mostrar, pero no son
// seleccionables al añadir uno nuevo.
const TIPOS_SELECCIONABLES: TipoEventoPartido[] = [
  "gol",
  "asistencia",
  "tarjeta_amarilla",
  "tarjeta_roja",
  "autogol",
];

function IndicadorTipo({ tipo }: { tipo: TipoEventoPartido }) {
  if (tipo === "tarjeta_amarilla") {
    return <span className="h-3.5 w-2.5 shrink-0 rounded-[2px] bg-amber-400" />;
  }
  if (tipo === "tarjeta_roja") {
    return <span className="h-3.5 w-2.5 shrink-0 rounded-[2px] bg-destructive" />;
  }
  if (tipo === "gol") {
    return <span className="size-2.5 shrink-0 rounded-full bg-primary" />;
  }
  if (tipo === "autogol") {
    return (
      <span className="size-2.5 shrink-0 rounded-full border-2 border-destructive" />
    );
  }
  if (tipo === "cambio_entra") {
    return <ArrowUpCircle className="size-3.5 shrink-0 text-pitch" />;
  }
  if (tipo === "cambio_sale") {
    return <ArrowDownCircle className="size-3.5 shrink-0 text-muted-foreground" />;
  }
  return <span className="size-2.5 shrink-0 rounded-full bg-gold" />;
}

export function EventosList({
  partidoId,
  convocados,
}: {
  partidoId: string;
  convocados: Jugador[];
}) {
  // Los eventos de cambio (cambio_sale/cambio_entra) se gestionan y se ven
  // en el apartado Cambios, no aquí, para no duplicar la misma información
  // en dos sitios.
  const eventos = useLiveQuery(
    () =>
      localDb.eventos_partido
        .where("partido_id")
        .equals(partidoId)
        .filter((e) => e.tipo !== "cambio_sale" && e.tipo !== "cambio_entra")
        .toArray(),
    [partidoId],
    [],
  );
  const [jugadorId, setJugadorId] = useState("");
  const [tipo, setTipo] = useState<TipoEventoPartido>("gol");
  const [minuto, setMinuto] = useState("");
  const [aFavor, setAFavor] = useState(true);
  const [tipoGol, setTipoGol] = useState<TipoGol | "">("");
  const [abpTipo, setAbpTipo] = useState<TipoAbp | "">("");
  const [posicionGol, setPosicionGol] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [posicionCentro, setPosicionCentro] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [notaGol, setNotaGol] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [eventoVer, setEventoVer] = useState<LocalEventoPartido | null>(null);

  const jugadoresPorId = new Map(convocados.map((j) => [j.id, j]));

  const esGol = tipo === "gol" || tipo === "autogol";
  const jugadorRequerido = tipo !== "gol" || aFavor;
  const usaDoblePunto = tipoGol === "centro_lateral" || tipoGol === "abp";

  function resetGolCampos() {
    setAFavor(true);
    setTipoGol("");
    setAbpTipo("");
    setPosicionGol(null);
    setPosicionCentro(null);
    setNotaGol("");
  }

  function handlePickCentroGol(pos: { top: number; left: number }) {
    if (!posicionCentro) {
      setPosicionCentro(pos);
      return;
    }
    if (!posicionGol) {
      setPosicionGol(pos);
      return;
    }
    setPosicionCentro(pos);
    setPosicionGol(null);
  }

  async function handleAdd() {
    if (jugadorRequerido && !jugadorId) {
      toast.error("Elige un jugador");
      return;
    }

    setEnviando(true);
    const result = await crearEventoLocal(
      partidoId,
      jugadorRequerido ? jugadorId : null,
      tipo,
      minuto,
      esGol
        ? {
            aFavor: tipo === "autogol" ? false : aFavor,
            tipoGol: tipoGol || null,
            posX: posicionGol?.left ?? null,
            posY: posicionGol?.top ?? null,
            abpTipo: tipoGol === "abp" ? abpTipo || null : null,
            posXCentro: usaDoblePunto ? posicionCentro?.left ?? null : null,
            posYCentro: usaDoblePunto ? posicionCentro?.top ?? null : null,
            notas: notaGol.trim() || null,
          }
        : undefined,
    );
    setEnviando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Evento añadido");
    setJugadorId("");
    setMinuto("");
    resetGolCampos();
  }

  async function handleDelete(e: React.MouseEvent, eventoId: string) {
    e.stopPropagation();
    setBorrando(eventoId);
    await eliminarEventoLocal(eventoId);
    setBorrando(null);
  }

  const jugadorEventoVer = eventoVer?.jugador_id
    ? jugadoresPorId.get(eventoVer.jugador_id)
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {TIPOS_SELECCIONABLES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTipo(t);
                    resetGolCampos();
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-md border py-2 text-xs font-medium",
                    tipo === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  <IndicadorTipo tipo={t} />
                  {TIPO_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {tipo === "gol" && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAFavor(true)}
                className={cn(
                  "rounded-md border py-2 text-sm font-medium",
                  aFavor
                    ? "border-pitch bg-pitch/10 text-pitch"
                    : "text-muted-foreground",
                )}
              >
                A favor
              </button>
              <button
                type="button"
                onClick={() => {
                  setAFavor(false);
                  setJugadorId("");
                }}
                className={cn(
                  "rounded-md border py-2 text-sm font-medium",
                  !aFavor
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "text-muted-foreground",
                )}
              >
                En contra (rival)
              </button>
            </div>
          )}

          {jugadorRequerido ? (
            <div className="space-y-2">
              <Label>Jugador</Label>
              <Select value={jugadorId} onValueChange={(v) => setJugadorId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un convocado">
                    {(value) => {
                      const j = jugadoresPorId.get(value as string);
                      if (!j) return "Selecciona un convocado";
                      return `${j.dorsal != null ? `${j.dorsal} · ` : ""}${nombreMostrado(j)}`;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {convocados.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.dorsal != null ? `${j.dorsal} · ` : ""}
                      {nombreMostrado(j)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Gol del rival: no hace falta seleccionar jugador propio.
            </p>
          )}

          {esGol && (
            <>
              <div className="space-y-2">
                <Label>Cómo ha sido (opcional)</Label>
                <Select
                  value={tipoGol}
                  onValueChange={(v) => {
                    setTipoGol((v as TipoGol) ?? "");
                    setAbpTipo("");
                    setPosicionGol(null);
                    setPosicionCentro(null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sin especificar">
                      {(value) => TIPO_GOL_LABEL[value as TipoGol] ?? "Sin especificar"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_GOL.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {tipoGol === "abp" && (
                <div className="space-y-2">
                  <Label>Tipo de ABP</Label>
                  <Select
                    value={abpTipo}
                    onValueChange={(v) => setAbpTipo((v as TipoAbp) ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sin especificar">
                        {(value) => TIPO_ABP_LABEL[value as TipoAbp] ?? "Sin especificar"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_ABP.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {usaDoblePunto ? (
                <div className="space-y-2">
                  <Label>¿Desde dónde ha sido? (opcional)</Label>
                  <p className="text-xs text-muted-foreground">
                    {tipoGol === "centro_lateral"
                      ? "Toca primero el origen del centro (C), luego dónde ha sido el gol (G)."
                      : "Toca primero desde dónde se ha sacado la ABP (C), luego dónde ha sido el gol (G)."}
                  </p>
                  <CampoMiniSelectorDoble
                    centro={posicionCentro}
                    gol={posicionGol}
                    onPick={handlePickCentroGol}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>¿Desde dónde ha sido? (opcional)</Label>
                  <CampoMiniSelector value={posicionGol} onChange={setPosicionGol} />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notaGol">Nota (opcional)</Label>
                <Textarea
                  id="notaGol"
                  rows={2}
                  placeholder="Ej: rechace tras córner, portero se equivoca..."
                  value={notaGol}
                  onChange={(e) => setNotaGol(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="minuto">Minuto (opcional)</Label>
            <Input
              id="minuto"
              type="number"
              min={0}
              max={130}
              value={minuto}
              onChange={(e) => setMinuto(e.target.value)}
            />
          </div>
          <Button onClick={handleAdd} disabled={enviando} className="w-full">
            {enviando ? "Añadiendo..." : "Añadir evento"}
          </Button>
        </CardContent>
      </Card>

      {eventos.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Todavía no hay eventos registrados.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {eventos
            .slice()
            .sort((a, b) => (a.minuto ?? 999) - (b.minuto ?? 999))
            .map((evento) => {
              const jugador = evento.jugador_id
                ? jugadoresPorId.get(evento.jugador_id)
                : null;
              return (
                <li
                  key={evento.id}
                  onClick={() => setEventoVer(evento)}
                  className="flex cursor-pointer items-center gap-3 p-3 text-sm hover:bg-muted/50"
                >
                  <span className="w-9 shrink-0 font-heading tabular-nums text-muted-foreground">
                    {evento.minuto != null ? `${evento.minuto}'` : "—"}
                  </span>
                  <IndicadorTipo tipo={evento.tipo} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">
                      {TIPO_LABEL[evento.tipo]}
                    </span>{" "}
                    — {jugador ? nombreMostrado(jugador) : evento.tipo === "gol" ? "Rival" : "?"}
                    {evento.tipo_gol && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {TIPO_GOL_LABEL[evento.tipo_gol]}
                        {evento.abp_tipo && ` (${TIPO_ABP_LABEL[evento.abp_tipo]})`}
                      </span>
                    )}
                    {evento.notas && (
                      <span className="text-muted-foreground italic">
                        {" "}
                        · {evento.notas}
                      </span>
                    )}
                  </span>
                  {evento.pos_x != null && evento.pos_y != null && (
                    <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={borrando === evento.id}
                    onClick={(e) => handleDelete(e, evento.id)}
                    aria-label="Eliminar evento"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
        </ul>
      )}

      <Dialog
        open={eventoVer !== null}
        onOpenChange={(open) => !open && setEventoVer(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {eventoVer && TIPO_LABEL[eventoVer.tipo]}
            </DialogTitle>
          </DialogHeader>
          {eventoVer && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Jugador: </span>
                {jugadorEventoVer
                  ? nombreMostrado(jugadorEventoVer)
                  : eventoVer.tipo === "gol"
                    ? "Rival"
                    : "—"}
              </p>
              {eventoVer.tipo === "gol" && (
                <p>
                  <span className="text-muted-foreground">Resultado: </span>
                  {eventoVer.a_favor ? "A favor" : "En contra (rival)"}
                </p>
              )}
              {eventoVer.tipo_gol && (
                <p>
                  <span className="text-muted-foreground">Cómo ha sido: </span>
                  {TIPO_GOL_LABEL[eventoVer.tipo_gol]}
                  {eventoVer.abp_tipo && ` — ${TIPO_ABP_LABEL[eventoVer.abp_tipo]}`}
                </p>
              )}
              {eventoVer.minuto != null && (
                <p>
                  <span className="text-muted-foreground">Minuto: </span>
                  {eventoVer.minuto}&apos;
                </p>
              )}
              {eventoVer.notas && (
                <p>
                  <span className="text-muted-foreground">Nota: </span>
                  {eventoVer.notas}
                </p>
              )}
              {(eventoVer.pos_x != null || eventoVer.pos_x_centro != null) && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {eventoVer.pos_x_centro != null
                      ? eventoVer.tipo_gol === "centro_lateral"
                        ? "C = origen del centro · G = dónde ha sido el gol"
                        : "C = desde dónde se ha sacado · G = dónde ha sido el gol"
                      : "Dónde ha sido"}
                  </p>
                  <CampoMiniDisplay
                    centro={
                      eventoVer.pos_x_centro != null && eventoVer.pos_y_centro != null
                        ? { left: eventoVer.pos_x_centro, top: eventoVer.pos_y_centro }
                        : null
                    }
                    gol={
                      eventoVer.pos_x != null && eventoVer.pos_y != null
                        ? { left: eventoVer.pos_x, top: eventoVer.pos_y }
                        : null
                    }
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
