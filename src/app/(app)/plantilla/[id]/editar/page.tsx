"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { localDb } from "@/lib/db/local-db";
import { createClient } from "@/lib/supabase/client";
import { JugadorForm } from "@/components/plantilla/jugador-form";

export default function EditarJugadorPage() {
  const { id } = useParams<{ id: string }>();
  const jugador = useLiveQuery(
    async () => (await localDb.jugadores.get(id)) ?? null,
    [id],
  );
  const [fotoSignedUrl, setFotoSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!jugador?.foto_url || !navigator.onLine) return;
    const supabase = createClient();
    supabase.storage
      .from("jugadores")
      .createSignedUrl(jugador.foto_url, 3600)
      .then(({ data }) => setFotoSignedUrl(data?.signedUrl ?? null));
  }, [jugador?.foto_url]);

  if (jugador === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (jugador === null) {
    return <p className="text-sm text-muted-foreground">Jugador no encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Editar jugador</h1>
      <JugadorForm
        jugador={{
          id: jugador.id,
          nombre: jugador.nombre,
          apellidos: jugador.apellidos,
          dorsal: jugador.dorsal?.toString() ?? "",
          posicion: jugador.posicion ?? "",
          pierna_dominante: jugador.pierna_dominante ?? "",
          fecha_nacimiento: jugador.fecha_nacimiento ?? "",
          contacto_nombre: jugador.contacto_nombre ?? "",
          contacto_telefono: jugador.contacto_telefono ?? "",
          contacto_email: jugador.contacto_email ?? "",
          notas_medicas: jugador.notas_medicas ?? "",
          fecha_alta: jugador.fecha_alta,
          fotoSignedUrl,
        }}
      />
    </div>
  );
}
