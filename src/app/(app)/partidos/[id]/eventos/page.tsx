import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EventosList } from "@/components/partidos/eventos-list";

export default async function EventosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: partido }, { data: convocatorias }, { data: eventos }] =
    await Promise.all([
      supabase.from("partidos").select("id, rival").eq("id", id).single(),
      supabase
        .from("convocatorias")
        .select("jugador_id")
        .eq("partido_id", id)
        .eq("convocado", true),
      supabase
        .from("eventos_partido")
        .select("id, jugador_id, tipo, minuto")
        .eq("partido_id", id),
    ]);

  if (!partido) {
    notFound();
  }

  const convocadoIds = (convocatorias ?? []).map((c) => c.jugador_id);
  const { data: convocadosData } =
    convocadoIds.length > 0
      ? await supabase
          .from("jugadores")
          .select("id, nombre, apellidos, dorsal")
          .in("id", convocadoIds)
      : { data: [] };
  const convocados = convocadosData ?? [];

  return (
    <div className="space-y-4">
      <Link
        href={`/partidos/${id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver al partido
      </Link>
      <h1 className="text-2xl font-semibold">Eventos vs {partido.rival}</h1>

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
        <EventosList
          partidoId={id}
          convocados={convocados}
          eventosIniciales={eventos ?? []}
        />
      )}
    </div>
  );
}
