"use client";

// Tabla compacta arriba del todo, al lado del campograma, para apuntar un
// comentario rápido de fase ofensiva/defensiva, ABP o notas generales sin
// tener que entrar en Editar — se guarda solo al salir del campo (blur),
// igual que los colores de la Equipación se guardan al cambiarlos.

import { useState } from "react";
import { actualizarNotasRivalLocal } from "@/app/(app)/rivales/local-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// `field-sizing: content` (que ya usa el <Textarea> compartido) no lo
// soporta Safari todavía, así que en iPad/iPhone —el uso principal de la
// app— el hueco se quedaría en 4 líneas fijas con scroll interno para leer
// el resto. Se ajusta la altura a mano con el scrollHeight, que sí funciona
// en cualquier navegador, tanto al escribir como nada más cargar el texto
// que ya hubiera guardado.
function ajustarAltura(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

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
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {FILAS.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <textarea
              ref={ajustarAltura}
              rows={4}
              value={valores[key]}
              onChange={(e) => {
                setValores((prev) => ({ ...prev, [key]: e.target.value }));
                ajustarAltura(e.target);
              }}
              onBlur={(e) => handleBlur(key, e.target.value)}
              placeholder="Añade un comentario..."
              className="field-sizing-content w-full resize-none overflow-hidden rounded-md border bg-transparent p-1.5 text-sm outline-none placeholder:text-muted-foreground hover:bg-muted/50 focus:bg-muted/50 print:hidden"
            />
            <p className="hidden text-sm whitespace-pre-wrap print:block">
              {valores[key]}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
