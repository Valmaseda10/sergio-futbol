"use client";

import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { JugadaAbpForm } from "@/components/plan-partido/jugada-abp-form";

export default function EditarJugadaAbpPage() {
  const { id } = useParams<{ id: string }>();
  const jugada = useLiveQuery(
    async () => (await localDb.jugadas_abp.get(id)) ?? null,
    [id],
  );

  if (jugada === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }
  if (jugada === null) {
    return <p className="text-sm text-muted-foreground">Jugada no encontrada.</p>;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Editar jugada de ABP</h1>
      <JugadaAbpForm key={jugada.id} jugada={jugada} />
    </div>
  );
}
