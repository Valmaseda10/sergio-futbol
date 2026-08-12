import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ConvocatoriaList } from "@/components/partidos/convocatoria-list";

export default async function ConvocatoriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: partido }, { data: jugadores }, { data: convocatorias }] =
    await Promise.all([
      supabase.from("partidos").select("id, rival").eq("id", id).single(),
      supabase
        .from("jugadores")
        .select("id, nombre, apellidos, dorsal, foto_url")
        .eq("activo", true)
        .order("dorsal", { ascending: true, nullsFirst: false })
        .order("apellidos", { ascending: true }),
      supabase
        .from("convocatorias")
        .select("jugador_id")
        .eq("partido_id", id)
        .eq("convocado", true),
    ]);

  if (!partido) {
    notFound();
  }

  const jugadoresConFoto = await Promise.all(
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
      <h1 className="text-2xl font-semibold">Convocatoria vs {partido.rival}</h1>
      <ConvocatoriaList
        partidoId={id}
        jugadores={jugadoresConFoto}
        convocadosIniciales={(convocatorias ?? []).map((c) => c.jugador_id)}
      />
    </div>
  );
}
