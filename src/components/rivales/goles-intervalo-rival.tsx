"use client";

// Goles a favor/en contra del rival por tramos de minutos, apuntados a mano
// viendo sus actas/resultados (no hay forma de sacarlo automático de la web
// de la federación). Se guarda solo al salir del campo (blur), igual que
// NotasRival, y se puede descargar como imagen para pegarla en el informe
// pre-partido (además de salir en el PDF de toda la ficha).

import { useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { actualizarGolesIntervaloRivalLocal } from "@/app/(app)/rivales/local-actions";
import type { IntervaloGol } from "@/lib/types/database.types";
import { capturarComoPng, descargarDataUrl } from "@/lib/capturar-imagen";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TRAMOS: { value: IntervaloGol; label: string }[] = [
  { value: "0-15", label: "0'-15'" },
  { value: "15-30", label: "15'-30'" },
  { value: "30-45", label: "30'-45'" },
  { value: "45-60", label: "45'-60'" },
  { value: "60+", label: "60'-+70'" },
];

// No se usa requestAnimationFrame: si el móvil se bloquea o se cambia de
// app justo al pulsar "Descargar" (la pestaña deja de estar visible), los
// rAF se quedan parados indefinidamente y la descarga nunca llega a
// lanzarse. setTimeout sí se dispara en segundo plano.
function esperarRenderizado() {
  return new Promise<void>((resolve) => setTimeout(resolve, 50));
}

// toPng puede quedarse colgado sin avisar (nunca resuelve ni rechaza) si por
// lo que sea el navegador no llega a cargar la imagen intermedia que genera
// por dentro — mejor avisar pasados unos segundos que dejar el botón
// "Generando..." para siempre.
function conLimiteDeTiempo<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

export function GolesIntervaloRival({
  rivalId,
  rivalNombre,
}: {
  rivalId: string;
  rivalNombre: string;
}) {
  const filas = useLiveQuery(
    () =>
      localDb.rivales_goles_intervalo.where("rival_id").equals(rivalId).toArray(),
    [rivalId],
    [],
  );
  const porTramo = useMemo(
    () => new Map(filas.map((f) => [f.intervalo, f])),
    [filas],
  );

  const [valores, setValores] = useState<
    Record<IntervaloGol, { favor: string; contra: string }>
  >(() =>
    Object.fromEntries(
      TRAMOS.map((t) => [t.value, { favor: "", contra: "" }]),
    ) as Record<IntervaloGol, { favor: string; contra: string }>,
  );

  const tablaRef = useRef<HTMLDivElement>(null);
  // Mientras se genera la imagen se ocultan los inputs y se enseñan los
  // números en texto plano (igual que al imprimir), para que la captura
  // salga como una tabla limpia y no con las cajas de edición.
  const [capturando, setCapturando] = useState(false);

  function valor(tramo: IntervaloGol, campo: "favor" | "contra") {
    const editado = valores[tramo][campo];
    if (editado !== "") return editado;
    const guardado = porTramo.get(tramo);
    const num = campo === "favor" ? guardado?.goles_favor : guardado?.goles_contra;
    return num != null ? String(num) : "";
  }

  function handleChange(tramo: IntervaloGol, campo: "favor" | "contra", texto: string) {
    setValores((prev) => ({ ...prev, [tramo]: { ...prev[tramo], [campo]: texto } }));
  }

  function handleBlur(tramo: IntervaloGol, campo: "favor" | "contra", texto: string) {
    const num = texto.trim() === "" ? 0 : Math.max(0, Number(texto));
    if (Number.isNaN(num)) return;
    actualizarGolesIntervaloRivalLocal(rivalId, tramo, {
      [campo === "favor" ? "goles_favor" : "goles_contra"]: num,
    });
  }

  async function handleDescargar() {
    if (!tablaRef.current) return;
    setCapturando(true);
    try {
      await esperarRenderizado();
      const dataUrl = await conLimiteDeTiempo(
        capturarComoPng(tablaRef.current),
        8000,
      );
      const nombreArchivo = rivalNombre
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      descargarDataUrl(dataUrl, `goles-por-tramos-${nombreArchivo || "rival"}.png`);
    } catch {
      toast.error("No se ha podido generar la imagen");
    } finally {
      setCapturando(false);
    }
  }

  const totalFavor = TRAMOS.reduce(
    (acc, t) => acc + (porTramo.get(t.value)?.goles_favor ?? 0),
    0,
  );
  const totalContra = TRAMOS.reduce(
    (acc, t) => acc + (porTramo.get(t.value)?.goles_contra ?? 0),
    0,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Goles del rival por tramos</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="print:hidden"
          disabled={capturando}
          onClick={handleDescargar}
          aria-label="Descargar como imagen"
        >
          <Download className="size-4 text-muted-foreground" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={tablaRef} className={cn(capturando && "bg-card p-2")}>
          {capturando && (
            <p className="pb-2 text-sm font-medium">
              {rivalNombre} — Goles por tramos
            </p>
          )}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                <th className="p-2 text-left font-medium">Tramo</th>
                <th className="p-2 text-center font-medium text-pitch">A favor</th>
                <th className="p-2 text-center font-medium text-destructive">
                  En contra
                </th>
              </tr>
            </thead>
            <tbody>
              {TRAMOS.map((t) => (
                <tr key={t.value} className="border-b last:border-b-0">
                  <td className="p-2 font-medium">{t.label}</td>
                  <td className="p-1 text-center">
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={valor(t.value, "favor")}
                      onChange={(e) => handleChange(t.value, "favor", e.target.value)}
                      onBlur={(e) => handleBlur(t.value, "favor", e.target.value)}
                      className={cn(
                        "mx-auto w-16 text-center print:hidden",
                        capturando && "hidden",
                      )}
                    />
                    <p
                      className={cn(
                        "hidden text-center print:block",
                        capturando && "block",
                      )}
                    >
                      {porTramo.get(t.value)?.goles_favor ?? 0}
                    </p>
                  </td>
                  <td className="p-1 text-center">
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={valor(t.value, "contra")}
                      onChange={(e) => handleChange(t.value, "contra", e.target.value)}
                      onBlur={(e) => handleBlur(t.value, "contra", e.target.value)}
                      className={cn(
                        "mx-auto w-16 text-center print:hidden",
                        capturando && "hidden",
                      )}
                    />
                    <p
                      className={cn(
                        "hidden text-center print:block",
                        capturando && "block",
                      )}
                    >
                      {porTramo.get(t.value)?.goles_contra ?? 0}
                    </p>
                  </td>
                </tr>
              ))}
              <tr className="bg-muted/30 font-medium">
                <td className="p-2">Total</td>
                <td className="p-2 text-center tabular-nums text-pitch">
                  {totalFavor}
                </td>
                <td className="p-2 text-center tabular-nums text-destructive">
                  {totalContra}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
