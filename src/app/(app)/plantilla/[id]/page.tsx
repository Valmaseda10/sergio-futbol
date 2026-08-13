"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Pencil } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JugadorAvatar } from "@/components/plantilla/jugador-avatar";
import { BajaReactivarButton } from "@/components/plantilla/baja-reactivar-button";
import { ValoracionesJugador } from "@/components/plantilla/valoraciones-jugador";

function formatearFecha(fecha: string | null) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const PIERNA_LABEL: Record<string, string> = {
  izquierda: "Izquierda",
  derecha: "Derecha",
  ambidiestro: "Ambidiestro",
};

export default function FichaJugadorPage() {
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

  const nombreCompleto = `${jugador.nombre} ${jugador.apellidos}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <JugadorAvatar
          src={fotoSignedUrl}
          nombre={jugador.nombre}
          apellidos={jugador.apellidos}
          className="size-16"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold">
              {nombreCompleto}
            </h1>
            {!jugador.activo && <Badge variant="outline">Inactivo</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {jugador.dorsal != null ? `Dorsal ${jugador.dorsal} · ` : ""}
            {jugador.posicion || "Sin posición"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <Link href={`/plantilla/${jugador.id}/editar`} aria-label="Editar" />
          }
        >
          <Pencil className="size-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Fecha de nacimiento</p>
            <p>{formatearFecha(jugador.fecha_nacimiento)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Pierna dominante</p>
            <p>
              {jugador.pierna_dominante
                ? PIERNA_LABEL[jugador.pierna_dominante]
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Fecha de alta</p>
            <p>{formatearFecha(jugador.fecha_alta)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <p className="text-muted-foreground">Nombre</p>
            <p>{jugador.contacto_nombre || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Teléfono</p>
            {jugador.contacto_telefono ? (
              <a
                href={`tel:${jugador.contacto_telefono}`}
                className="text-primary underline"
              >
                {jugador.contacto_telefono}
              </a>
            ) : (
              <p>—</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            {jugador.contacto_email ? (
              <a
                href={`mailto:${jugador.contacto_email}`}
                className="break-all text-primary underline"
              >
                {jugador.contacto_email}
              </a>
            ) : (
              <p>—</p>
            )}
          </div>
        </CardContent>
      </Card>

      {jugador.notas_medicas && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas médicas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">
            {jugador.notas_medicas}
          </CardContent>
        </Card>
      )}

      <ValoracionesJugador jugadorId={jugador.id} />

      <BajaReactivarButton
        jugadorId={jugador.id}
        activo={jugador.activo}
        nombreCompleto={nombreCompleto}
      />
    </div>
  );
}
