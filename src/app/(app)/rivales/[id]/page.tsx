"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, Printer } from "lucide-react";
import { localDb } from "@/lib/db/local-db";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EliminarRivalButton } from "@/components/rivales/eliminar-rival-button";
import { JugadoresDestacados } from "@/components/rivales/jugadores-destacados";
import { EquipacionRival } from "@/components/rivales/equipacion-rival";
import { PdfWatermark } from "@/components/branding/pdf-watermark";

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

export default function FichaRivalPage() {
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
      <PdfWatermark />
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
          className="print:hidden"
          aria-label="Exportar a PDF"
          onClick={() => window.print()}
        >
          <Printer className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="print:hidden"
          nativeButton={false}
          render={<Link href={`/rivales/${rival.id}/editar`} aria-label="Editar" />}
        >
          <Pencil className="size-4" />
        </Button>
      </div>
      <p className="hidden text-xs text-muted-foreground print:block">
        Informe de scouting — generado el{" "}
        {new Date().toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
      </p>

      <EquipacionRival
        rivalId={rival.id}
        colorCamiseta={rival.color_camiseta}
        colorPantalon={rival.color_pantalon}
        colorMedias={rival.color_medias}
      />

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

      <div className="print:hidden">
        <EliminarRivalButton id={rival.id} />
      </div>
    </div>
  );
}
