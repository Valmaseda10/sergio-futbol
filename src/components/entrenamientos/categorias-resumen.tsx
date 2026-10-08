"use client";

// Cuántas veces se ha trabajado cada categoría fija de tarea (Activación,
// Posesión...) y sus minutos totales, sumando las 4 tareas de cada
// entrenamiento pasado a este componente — funciona igual venga la tarea de
// la biblioteca de ejercicios o escrita a mano, porque la categoría es
// independiente de eso.

import {
  CATEGORIAS_TAREA,
  detectarCategoriaPorTexto,
} from "@/lib/validations/categoria-tarea";
import type { LocalEntrenamiento } from "@/lib/db/local-db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Minutos de trabajo que dice un tiempo escrito a mano: "2 x 6'" son 12,
// "3 x 3" son 9 y "5'" son 5. null si no se entiende.
export function minutosDeTiempo(tiempo: string | null): number | null {
  if (!tiempo) return null;
  const serie = tiempo.match(/^\s*(\d+)\s*[x×X]\s*(\d+)/);
  if (serie) return Number(serie[1]) * Number(serie[2]);
  const suelto = tiempo.match(/^\s*(\d+)/);
  return suelto ? Number(suelto[1]) : null;
}

type NumeroTarea = 1 | 2 | 3 | 4;

// Categoría y minutos de cada tarea: los que se hayan puesto a mano en la
// sesión; si faltan, la categoría se deduce del título de la tarea y los
// minutos, de su tiempo ("2 x 6'"), para que las sesiones rellenadas sin
// tocar esos campos también cuenten.
function datosDeTarea(e: LocalEntrenamiento, n: NumeroTarea) {
  const categoria =
    e[`tarea_${n}_categoria`] || detectarCategoriaPorTexto(e[`tarea_${n}`] ?? "");
  const minutos =
    e[`tarea_${n}_minutos`] ?? minutosDeTiempo(e[`tarea_${n}_tiempo`]) ?? 0;
  return { categoria, minutos };
}

export function CategoriasTareasResumen({
  entrenamientos,
}: {
  entrenamientos: LocalEntrenamiento[];
}) {
  if (entrenamientos.length === 0) return null;

  const uso = new Map<string, { veces: number; minutos: number }>();
  for (const entrenamiento of entrenamientos) {
    const tareas = ([1, 2, 3, 4] as const).map((n) => datosDeTarea(entrenamiento, n));
    // Trabajo extra que no tiene su propio bloque con diagrama (se describe
    // a mano en "notas"), pero también cuenta aquí.
    tareas.push({
      categoria: entrenamiento.extra_categoria,
      minutos: entrenamiento.extra_minutos ?? 0,
    });
    for (const { categoria, minutos } of tareas) {
      if (!categoria) continue;
      const actual = uso.get(categoria) ?? { veces: 0, minutos: 0 };
      actual.veces += 1;
      actual.minutos += minutos;
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
