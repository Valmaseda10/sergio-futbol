"use client";

// Cuántas veces se ha trabajado cada categoría fija de tarea (Activación,
// Posesión...) y sus minutos totales, sumando las 4 tareas de cada
// entrenamiento pasado a este componente — funciona igual venga la tarea de
// la biblioteca de ejercicios o escrita a mano, porque la categoría es
// independiente de eso.

import { CATEGORIAS_TAREA } from "@/lib/validations/categoria-tarea";
import type { LocalEntrenamiento } from "@/lib/db/local-db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SLOTS_TAREA = [
  ["tarea_1_categoria", "tarea_1_minutos"],
  ["tarea_2_categoria", "tarea_2_minutos"],
  ["tarea_3_categoria", "tarea_3_minutos"],
  ["tarea_4_categoria", "tarea_4_minutos"],
] as const;

export function CategoriasTareasResumen({
  entrenamientos,
}: {
  entrenamientos: LocalEntrenamiento[];
}) {
  if (entrenamientos.length === 0) return null;

  const uso = new Map<string, { veces: number; minutos: number }>();
  for (const entrenamiento of entrenamientos) {
    for (const [campoCategoria, campoMinutos] of SLOTS_TAREA) {
      const categoria = entrenamiento[campoCategoria];
      if (!categoria) continue;
      const actual = uso.get(categoria) ?? { veces: 0, minutos: 0 };
      actual.veces += 1;
      actual.minutos += entrenamiento[campoMinutos] ?? 0;
      uso.set(categoria, actual);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tareas trabajadas</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {CATEGORIAS_TAREA.map((c) => {
            const datos = uso.get(c.value);
            return (
              <li
                key={c.value}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="font-medium">{c.label}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {datos
                    ? `${datos.veces} ${datos.veces === 1 ? "vez" : "veces"} · ${datos.minutos} min`
                    : "Sin trabajar"}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
