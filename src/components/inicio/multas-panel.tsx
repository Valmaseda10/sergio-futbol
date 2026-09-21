"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Gavel, Trash2 } from "lucide-react";
import {
  crearMultaLocal,
  eliminarMultaLocal,
  resolverMultasJugadorLocal,
} from "@/app/(app)/inicio/local-actions";
import { localDb } from "@/lib/db/local-db";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS_NORMA,
  CATEGORIA_NORMA_LABEL,
  NORMAS,
  PUNTOS_CASTIGO,
} from "@/lib/validations/norma";
import type { CategoriaNorma } from "@/lib/types/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NORMA_OTRA = "__otra__";

export function MultasPanel() {
  const jugadores = useLiveQuery(
    () =>
      localDb.jugadores
        .filter((j) => j.activo)
        .toArray()
        .then((rows) =>
          rows.sort((a, b) => (a.dorsal ?? 99) - (b.dorsal ?? 99)),
        ),
    [],
    [],
  );
  const jugadoresPorId = useMemo(
    () => new Map(jugadores.map((j) => [j.id, j])),
    [jugadores],
  );

  const multas = useLiveQuery(
    () =>
      localDb.multas
        .filter((m) => !m.resuelta)
        .toArray()
        .then((rows) => rows.sort((a, b) => b.created_at.localeCompare(a.created_at))),
    [],
    [],
  );

  const [jugadorId, setJugadorId] = useState("");
  const [normaSel, setNormaSel] = useState("");
  const [normaLibre, setNormaLibre] = useState("");
  const [puntosLibre, setPuntosLibre] = useState("1");
  const [guardando, setGuardando] = useState(false);
  const [pendiente, setPendiente] = useState<string | null>(null);

  const esOtra = normaSel === NORMA_OTRA;
  const normaElegida = NORMAS.find(
    (n) => `${n.categoria}::${n.texto}` === normaSel,
  );

  const totalesPorJugador = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of multas) {
      map.set(m.jugador_id, (map.get(m.jugador_id) ?? 0) + m.puntos);
    }
    return [...map.entries()]
      .map(([jugadorId, puntos]) => ({ jugadorId, puntos }))
      .sort((a, b) => b.puntos - a.puntos);
  }, [multas]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!jugadorId || !normaSel) return;

    const categoria: CategoriaNorma = esOtra
      ? "generales"
      : (normaSel.split("::")[0] as CategoriaNorma);
    const norma = esOtra ? normaLibre.trim() : (normaElegida?.texto ?? "");
    const puntos = esOtra ? Number(puntosLibre) : (normaElegida?.puntos ?? 1);

    if (!norma) return;

    setGuardando(true);
    const result = await crearMultaLocal({ jugador_id: jugadorId, categoria, norma, puntos });
    setGuardando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setNormaSel("");
    setNormaLibre("");
    setPuntosLibre("1");
  }

  async function handleResolver(id: string) {
    setPendiente(id);
    await resolverMultasJugadorLocal(id);
    setPendiente(null);
  }

  async function handleEliminar(id: string) {
    setPendiente(id);
    await eliminarMultaLocal(id);
    setPendiente(null);
  }

  function nombreJugador(id: string) {
    const j = jugadoresPorId.get(id);
    if (!j) return "?";
    return `${j.dorsal != null ? `${j.dorsal} · ` : ""}${j.nombre} ${j.apellidos}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gavel className="size-4" />
          Multas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={jugadorId} onValueChange={(v) => setJugadorId(v ?? "")}>
              <SelectTrigger className="sm:flex-1">
                <SelectValue placeholder="Jugador" />
              </SelectTrigger>
              <SelectContent>
                {jugadores.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.dorsal != null ? `${j.dorsal} · ` : ""}
                    {j.nombre} {j.apellidos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={normaSel} onValueChange={(v) => setNormaSel(v ?? "")}>
              <SelectTrigger className="sm:flex-[2]">
                <SelectValue placeholder="Falta cometida" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS_NORMA.map((cat) => (
                  <SelectGroup key={cat.value}>
                    <SelectLabel>{cat.label}</SelectLabel>
                    {NORMAS.filter((n) => n.categoria === cat.value).map((n) => (
                      <SelectItem
                        key={`${n.categoria}::${n.texto}`}
                        value={`${n.categoria}::${n.texto}`}
                      >
                        {n.texto} ({n.puntos} pt{n.puntos > 1 ? "s" : ""})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                <SelectGroup>
                  <SelectLabel>Otra</SelectLabel>
                  <SelectItem value={NORMA_OTRA}>Otra falta...</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {esOtra && (
            <div className="flex gap-2">
              <Input
                value={normaLibre}
                onChange={(e) => setNormaLibre(e.target.value)}
                placeholder="Describe la falta..."
                className="flex-1"
              />
              <Input
                type="number"
                min={1}
                max={10}
                value={puntosLibre}
                onChange={(e) => setPuntosLibre(e.target.value)}
                className="w-20"
                aria-label="Puntos"
              />
            </div>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={
              guardando ||
              !jugadorId ||
              !normaSel ||
              (esOtra && !normaLibre.trim())
            }
          >
            Añadir
          </Button>
        </form>

        {totalesPorJugador.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {totalesPorJugador.map(({ jugadorId, puntos }) => (
              <div
                key={jugadorId}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                  puntos >= PUNTOS_CASTIGO
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "text-muted-foreground",
                )}
              >
                <span className="font-medium">{nombreJugador(jugadorId)}</span>
                <span>· {puntos} pts</span>
                {puntos >= PUNTOS_CASTIGO && (
                  <button
                    type="button"
                    disabled={pendiente === jugadorId}
                    onClick={() => handleResolver(jugadorId)}
                    className="ml-1 font-semibold underline underline-offset-2"
                  >
                    Castigo cumplido
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {multas.length > 0 && (
          <ul className="space-y-1 border-t pt-3">
            {multas.map((m) => (
              <li key={m.id} className="flex items-center gap-2 py-0.5 text-sm">
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {nombreJugador(m.jugador_id)}
                  </span>{" "}
                  — {m.norma} ({CATEGORIA_NORMA_LABEL[m.categoria]}, {m.puntos} pt
                  {m.puntos > 1 ? "s" : ""})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pendiente === m.id}
                  onClick={() => handleEliminar(m.id)}
                  aria-label="Eliminar multa"
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
