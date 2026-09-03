"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { ChevronLeft, Trash2 } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { eliminarCampogramaLocal } from "@/app/(app)/campograma/local-actions";
import { CampogramaEditor, type CampogramaInicial } from "@/components/campograma/campograma-editor";
import {
  CampogramaRivalCampo,
  type CampogramaRivalInicial,
} from "@/components/campograma/campograma-rival-campo";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EditarCampogramaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [borrando, setBorrando] = useState(false);

  const campograma = useLiveQuery(
    async () => (await localDb.campogramas.get(id)) ?? null,
    [id],
  );
  const filas = useLiveQuery(
    () => localDb.campograma_jugadores.where("campograma_id").equals(id).toArray(),
    [id],
    [],
  );
  const filasRival = useLiveQuery(
    () => localDb.campograma_rivales.where("campograma_id").equals(id).toArray(),
    [id],
    [],
  );
  const jugadores = useLiveQuery(
    () =>
      localDb.jugadores
        .filter((j) => j.activo)
        .toArray()
        .then((rows) =>
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

  const inicial: CampogramaInicial | undefined = useMemo(() => {
    if (!campograma) return undefined;
    return {
      id: campograma.id,
      nombre: campograma.nombre,
      notas: campograma.notas,
      titulares: filas
        .filter((f) => f.titular && f.pos_x != null && f.pos_y != null)
        .map((f) => ({
          jugadorId: f.jugador_id,
          posicion: f.posicion_jugada,
          left: f.pos_x as number,
          top: f.pos_y as number,
        })),
      suplentesIds: filas
        .filter((f) => !f.titular)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        .map((f) => f.jugador_id),
    };
  }, [campograma, filas]);

  const inicialRival: CampogramaRivalInicial = useMemo(
    () => ({
      titulares: filasRival
        .filter((f) => f.pos_x != null && f.pos_y != null)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        .map((f) => ({
          nombre: f.nombre,
          dorsal: f.dorsal,
          posicion: f.posicion_jugada,
          left: f.pos_x as number,
          top: f.pos_y as number,
        })),
    }),
    [filasRival],
  );

  async function handleEliminar() {
    setBorrando(true);
    const result = await eliminarCampogramaLocal(id);
    setBorrando(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Campograma eliminado");
    router.push("/campograma");
  }

  if (campograma === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (campograma === null) {
    return <p className="text-sm text-muted-foreground">Campograma no encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/campograma"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Campograma
        </Link>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="ghost" size="icon-sm" disabled={borrando} aria-label="Eliminar campograma" />
            }
          >
            <Trash2 className="size-4 text-destructive" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar &quot;{campograma.nombre}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleEliminar}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <h1 className="text-2xl font-semibold">{campograma.nombre}</h1>

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Nuestra alineación</h2>
          {inicial && <CampogramaEditor jugadores={jugadores} inicial={inicial} />}
        </div>
        <CampogramaRivalCampo campogramaId={id} inicial={inicialRival} />
      </div>
    </div>
  );
}
