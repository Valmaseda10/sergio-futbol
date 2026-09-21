"use client";

// Goles a favor/en contra del rival por tramos de minutos, apuntados a mano
// viendo sus actas/resultados (no hay forma de sacarlo automático de la web
// de la federación). Se guarda solo al salir del campo (blur), igual que
// NotasRival, y sale en la ficha del rival — que ya se puede exportar a PDF
// con el botón de arriba — para pegarlo en el informe pre-partido.

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { actualizarGolesIntervaloRivalLocal } from "@/app/(app)/rivales/local-actions";
import type { IntervaloGol } from "@/lib/types/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const TRAMOS: { value: IntervaloGol; label: string }[] = [
  { value: "0-15", label: "0'-15'" },
  { value: "15-30", label: "15'-30'" },
  { value: "30-45", label: "30'-45'" },
  { value: "45-60", label: "45'-60'" },
  { value: "60+", label: "60'-+70'" },
];

export function GolesIntervaloRival({ rivalId }: { rivalId: string }) {
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
      <CardHeader>
        <CardTitle className="text-base">Goles del rival por tramos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
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
                    className="mx-auto w-16 text-center print:hidden"
                  />
                  <p className="hidden text-center print:block">
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
                    className="mx-auto w-16 text-center print:hidden"
                  />
                  <p className="hidden text-center print:block">
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
      </CardContent>
    </Card>
  );
}
