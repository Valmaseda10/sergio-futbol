"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Pencil } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EliminarRivalScoutingButton } from "@/components/partidos/eliminar-rival-scouting-button";
import { JugadoresDestacados } from "@/components/partidos/jugadores-destacados";

function Seccion({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm whitespace-pre-wrap">{texto}</CardContent>
    </Card>
  );
}

export default function FichaRivalScoutingPage() {
  const { id } = useParams<{ id: string }>();
  const rival = useLiveQuery(
    async () => (await localDb.rivales_scouting.get(id)) ?? null,
    [id],
  );
  const [fotoSignedUrl, setFotoSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!rival?.foto_url || !navigator.onLine) return;
    const supabase = createClient();
    supabase.storage
      .from("adjuntos")
      .createSignedUrl(rival.foto_url, 3600)
      .then(({ data }) => setFotoSignedUrl(data?.signedUrl ?? null));
  }, [rival?.foto_url]);

  if (rival === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (rival === null) {
    return <p className="text-sm text-muted-foreground">Rival no encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      <Link
        href="/partidos/scouting"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a scouting
      </Link>

      <div className="flex items-center gap-3">
        {fotoSignedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoSignedUrl}
            alt={rival.nombre}
            className="size-14 shrink-0 rounded-full border object-cover"
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full border bg-muted text-xs text-muted-foreground">
            {rival.nombre.slice(0, 2).toUpperCase()}
          </div>
        )}
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold">
          {rival.nombre}
        </h1>
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={
            <Link href={`/partidos/scouting/${rival.id}/editar`} aria-label="Editar" />
          }
        >
          <Pencil className="size-4" />
        </Button>
      </div>

      <Seccion titulo="Sistema de juego" texto={rival.sistema_juego} />
      <Seccion titulo="Fase ofensiva" texto={rival.fase_ofensiva} />
      <Seccion titulo="Fase defensiva" texto={rival.fase_defensiva} />
      <Seccion titulo="ABP" texto={rival.abp} />
      <Seccion titulo="Notas" texto={rival.notas} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jugadores</CardTitle>
        </CardHeader>
        <CardContent>
          <JugadoresDestacados rivalId={rival.id} />
        </CardContent>
      </Card>

      <EliminarRivalScoutingButton id={rival.id} />
    </div>
  );
}
