"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, HeartPulse, ArrowLeftRight, GalleryVerticalEnd } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { Button } from "@/components/ui/button";
import { JugadoresList, type ClasificacionJugador } from "@/components/plantilla/jugadores-list";

const UMBRAL_DESTACADO = 8;
const UMBRAL_DEBIL = 4;

export default function PlantillaPage() {
  const jugadores = useLiveQuery(
    () =>
      localDb.jugadores.toArray().then((rows) =>
        rows.sort((a, b) => {
          if (a.dorsal == null && b.dorsal != null) return 1;
          if (a.dorsal != null && b.dorsal == null) return -1;
          if (a.dorsal != null && b.dorsal != null && a.dorsal !== b.dorsal) {
            return a.dorsal - b.dorsal;
          }
          return a.apellidos.localeCompare(b.apellidos);
        }),
      ),
    [],
    [],
  );
  const valoraciones = useLiveQuery(
    () => localDb.valoraciones_jugador.toArray(),
    [],
    [],
  );

  // Un jugador se marca como destacado/débil según la media de su última
  // valoración periódica (técnica/físico/táctica/actitud), no un campo
  // aparte — así no hay que mantener dos fuentes de verdad.
  const clasificacionPorJugador = useMemo(() => {
    const porJugador = new Map<string, (typeof valoraciones)[number][]>();
    for (const v of valoraciones) {
      const arr = porJugador.get(v.jugador_id) ?? [];
      arr.push(v);
      porJugador.set(v.jugador_id, arr);
    }
    const resultado = new Map<string, ClasificacionJugador>();
    for (const [jugadorId, vs] of porJugador) {
      const ultima = vs.slice().sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      const valores = [
        ultima.tecnica,
        ultima.fisico,
        ultima.tactica,
        ultima.actitud,
      ].filter((v): v is number => v != null);
      if (valores.length === 0) continue;
      const media = valores.reduce((a, b) => a + b, 0) / valores.length;
      if (media >= UMBRAL_DESTACADO) resultado.set(jugadorId, "destacado");
      else if (media <= UMBRAL_DEBIL) resultado.set(jugadorId, "debil");
    }
    return resultado;
  }, [valoraciones]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Plantilla</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/plantilla/cartel" aria-label="Cartel de plantilla" />}
          >
            <GalleryVerticalEnd className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/plantilla/comparar" aria-label="Comparar jugadores" />}
          >
            <ArrowLeftRight className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/plantilla/lesiones" />}
          >
            <HeartPulse className="size-4" />
            Lesiones
          </Button>
          <Button size="sm" nativeButton={false} render={<Link href="/plantilla/nuevo" />}>
            <Plus className="size-4" />
            Nuevo
          </Button>
        </div>
      </div>
      <JugadoresList
        jugadores={jugadores ?? []}
        clasificacionPorJugador={clasificacionPorJugador}
      />
    </div>
  );
}
