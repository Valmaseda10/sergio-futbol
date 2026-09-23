"use client";

// Tabla compacta arriba del todo, al lado del campograma, para apuntar un
// comentario rápido de fase ofensiva/defensiva, ABP o notas generales sin
// tener que entrar en Editar — se guarda solo al salir del campo (blur),
// igual que los colores de la Equipación se guardan al cambiarlos.

import { useState } from "react";
import { actualizarNotasRivalLocal } from "@/app/(app)/rivales/local-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FILAS = [
  { key: "fase_ofensiva" as const, label: "Fase ofensiva" },
  { key: "fase_defensiva" as const, label: "Fase defensiva" },
  { key: "transicion_ofensiva" as const, label: "TRANSICIÓN OFENSIVA" },
  { key: "transicion_defensiva" as const, label: "TRANSICIÓN DEFENSIVA" },
  { key: "abp" as const, label: "ABP" },
  { key: "notas" as const, label: "Notas" },
];

type ClaveNota = (typeof FILAS)[number]["key"];

export function NotasRival({
  rivalId,
  faseOfensiva,
  faseDefensiva,
  transicionOfensiva,
  transicionDefensiva,
  abp,
  notas,
}: {
  rivalId: string;
  faseOfensiva: string | null;
  faseDefensiva: string | null;
  transicionOfensiva: string | null;
  transicionDefensiva: string | null;
  abp: string | null;
  notas: string | null;
}) {
  const [valores, setValores] = useState<Record<ClaveNota, string>>({
    fase_ofensiva: faseOfensiva ?? "",
    fase_defensiva: faseDefensiva ?? "",
    transicion_ofensiva: transicionOfensiva ?? "",
    transicion_defensiva: transicionDefensiva ?? "",
    abp: abp ?? "",
    notas: notas ?? "",
  });

  function handleBlur(key: ClaveNota, valor: string) {
    actualizarNotasRivalLocal(rivalId, { [key]: valor.trim() || null });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notas del rival</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {FILAS.map(({ key, label }) => (
              <tr key={key} className="border-t first:border-t-0">
                <td className="w-24 shrink-0 p-2 align-top text-xs font-medium text-muted-foreground">
                  {label}
                </td>
                <td className="p-2 pl-0">
                  <textarea
                    rows={4}
                    value={valores[key]}
                    onChange={(e) =>
                      setValores((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    onBlur={(e) => handleBlur(key, e.target.value)}
                    placeholder="Añade un comentario..."
                    className="w-full resize-none rounded-md bg-transparent p-1 text-sm outline-none placeholder:text-muted-foreground hover:bg-muted/50 focus:bg-muted/50 print:hidden"
                  />
                  <p className="hidden text-sm whitespace-pre-wrap print:block">
                    {valores[key]}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
