"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { PenTool, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DiagramaEditor } from "@/components/entrenamientos/diagrama-editor";
import { diagramaASvg, type Diagrama } from "@/lib/ficha-entrenamiento";
import { localDb, type LocalJugadaAbp } from "@/lib/db/local-db";
import {
  FASES_ABP,
  leerDiagramaAbp,
  leerJugadoresAbp,
  type FaseAbp,
  type JugadorAbp,
} from "@/lib/plan-partido";
import {
  actualizarJugadaAbpLocal,
  crearJugadaAbpLocal,
} from "@/app/(app)/plan-partido/local-actions";
import { cn } from "@/lib/utils";

const sinJugador = "";

export function JugadaAbpForm({ jugada }: { jugada?: LocalJugadaAbp }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(jugada?.nombre ?? "");
  const [fase, setFase] = useState<FaseAbp>(jugada?.fase ?? "ofensivo");
  const [diagrama, setDiagrama] = useState<Diagrama | null>(
    jugada ? leerDiagramaAbp(jugada.diagrama) : null,
  );
  const [filas, setFilas] = useState<JugadorAbp[]>(
    jugada ? leerJugadoresAbp(jugada.jugadores) : [],
  );
  const [notas, setNotas] = useState(jugada?.notas ?? "");
  const [dibujando, setDibujando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const jugadores = useLiveQuery(
    () =>
      localDb.jugadores
        .filter((j) => j.activo)
        .toArray()
        .then((rows) => rows.sort((a, b) => a.nombre.localeCompare(b.nombre))),
    [],
    [],
  );

  function editarFila(i: number, parche: Partial<JugadorAbp>) {
    setFilas((prev) => prev.map((f, k) => (k === i ? { ...f, ...parche } : f)));
  }

  function anadirFila() {
    // La siguiente etiqueta numérica libre (1, 2, 3…), como en las hojas.
    const usadas = new Set(filas.map((f) => f.etiqueta));
    let n = 1;
    while (usadas.has(String(n))) n++;
    setFilas((prev) => [...prev, { etiqueta: String(n), jugador_id: null, texto: "" }]);
  }

  async function guardar() {
    setGuardando(true);
    const datos = { nombre, fase, diagrama, jugadores: filas, notas };
    const resultado = jugada
      ? await actualizarJugadaAbpLocal(jugada.id, datos)
      : await crearJugadaAbpLocal(datos);
    setGuardando(false);
    if ("error" in resultado) {
      toast.error(resultado.error);
      return;
    }
    toast.success("Jugada guardada");
    router.push("/plan-partido/abp");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="nombre-abp">Nombre de la jugada</Label>
            <Input
              id="nombre-abp"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: CORNER OFE 1, ABP DEFENSIVO – FALTA LATERAL…"
            />
          </div>
          <div className="space-y-2">
            <Label>Fase</Label>
            <div className="flex gap-2" role="radiogroup" aria-label="Fase">
              {FASES_ABP.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  role="radio"
                  aria-checked={fase === f.value}
                  onClick={() => setFase(f.value)}
                  className={cn(
                    "flex-1 rounded-full border px-3 py-1.5 text-sm font-semibold",
                    fase === f.value
                      ? "text-white"
                      : "border-input text-muted-foreground hover:bg-muted",
                  )}
                  style={
                    fase === f.value
                      ? { backgroundColor: f.color, borderColor: f.color }
                      : undefined
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between">
            <Label>Dibujo</Label>
            <Button type="button" size="sm" variant="outline" onClick={() => setDibujando(true)}>
              <PenTool className="size-4" />
              {diagrama ? "Editar dibujo" : "Dibujar"}
            </Button>
          </div>
          {diagrama ? (
            <div
              className="overflow-hidden rounded-md [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: diagramaASvg(diagrama) }}
            />
          ) : (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Todavía no has dibujado nada. Pulsa &quot;Dibujar&quot; para colocar
              jugadores, flechas y zonas sobre el área.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Numera los jugadores del dibujo (1, 2, 3…) con la etiqueta y apunta abajo
            quién es cada número.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <Label>Quién hace qué</Label>
          {filas.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Añade una fila por cada número o rol (1, 2, 3, Lanzador…) y elige el jugador.
            </p>
          )}
          <div className="space-y-2">
            {filas.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={f.etiqueta}
                  onChange={(e) => editarFila(i, { etiqueta: e.target.value })}
                  className="w-16 shrink-0 text-center"
                  placeholder="Nº"
                  aria-label="Número o rol"
                />
                <select
                  value={f.jugador_id ?? sinJugador}
                  onChange={(e) =>
                    editarFila(i, { jugador_id: e.target.value || null })
                  }
                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                  aria-label="Jugador"
                >
                  <option value={sinJugador}>— Escribir a mano —</option>
                  {jugadores.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.alias || j.nombre} {j.apellidos}
                    </option>
                  ))}
                </select>
                {!f.jugador_id && (
                  <Input
                    value={f.texto}
                    onChange={(e) => editarFila(i, { texto: e.target.value })}
                    className="min-w-0 flex-1"
                    placeholder="Nombre"
                    aria-label="Nombre escrito a mano"
                  />
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0 text-destructive"
                  aria-label="Quitar fila"
                  onClick={() => setFilas((prev) => prev.filter((_, k) => k !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={anadirFila}>
            <Plus className="size-4" />
            Añadir fila
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 pt-6">
          <Label htmlFor="notas-abp">Notas (opcional)</Label>
          <Textarea
            id="notas-abp"
            rows={3}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Detalles de la jugada, señal para activarla, variantes…"
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="button" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar jugada"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/plan-partido/abp")}
          disabled={guardando}
        >
          Cancelar
        </Button>
      </div>

      {dibujando && (
        <DiagramaEditor
          key={diagrama ? "con" : "sin"}
          abierto
          numeroTarea={0}
          titulo="Dibujo de la jugada"
          inicial={diagrama}
          onCerrar={() => setDibujando(false)}
          onGuardar={(d) => {
            setDiagrama(d);
            setDibujando(false);
          }}
        />
      )}
    </div>
  );
}
