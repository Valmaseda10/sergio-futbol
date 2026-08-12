import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AlineacionCampo } from "@/components/partidos/alineacion-campo";

export default async function AlineacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: partido }, { data: convocatorias }, { data: alineaciones }] =
    await Promise.all([
      supabase.from("partidos").select("id, rival").eq("id", id).single(),
      supabase
        .from("convocatorias")
        .select("jugador_id")
        .eq("partido_id", id)
        .eq("convocado", true),
      supabase
        .from("alineaciones")
        .select("jugador_id, titular, posicion_jugada")
        .eq("partido_id", id)
        .eq("titular", true),
    ]);

  if (!partido) {
    notFound();
  }

  const convocadoIds = (convocatorias ?? []).map((c) => c.jugador_id);
  const { data: jugadores } =
    convocadoIds.length > 0
      ? await supabase
          .from("jugadores")
          .select("id, nombre, apellidos, dorsal, foto_url")
          .in("id", convocadoIds)
      : { data: [] };

  const convocados = await Promise.all(
    (jugadores ?? []).map(async ({ foto_url, ...jugador }) => ({
      ...jugador,
      fotoSignedUrl: foto_url
        ? (
            await supabase.storage
              .from("jugadores")
              .createSignedUrl(foto_url, 3600)
          ).data?.signedUrl ?? null
        : null,
    })),
  );

  return (
    <div className="space-y-4">
      <Link
        href={`/partidos/${id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver al partido
      </Link>
      <h1 className="text-2xl font-semibold">Alineación vs {partido.rival}</h1>

      {convocados.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay convocatoria.{" "}
          <Link
            href={`/partidos/${id}/convocatoria`}
            className="font-medium underline"
          >
            Convoca a los jugadores primero
          </Link>
          .
        </p>
      ) : (
        <AlineacionCampo
          partidoId={id}
          convocados={convocados}
          titularesIniciales={(alineaciones ?? []).map((a) => ({
            jugadorId: a.jugador_id,
            posicion: a.posicion_jugada ?? "",
          }))}
        />
      )}
    </div>
  );
}
