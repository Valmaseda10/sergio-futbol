import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { capitalizarPrimera } from "@/lib/date";
import { AsistenciaGrid } from "@/components/entrenamientos/asistencia-grid";

function formatearFechaCorta(fecha: string) {
  return capitalizarPrimera(
    new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }),
  );
}

export default async function AsistenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: entrenamiento }, { data: jugadores }, { data: estados }, { data: asistencias }] =
    await Promise.all([
      supabase.from("entrenamientos").select("id, fecha").eq("id", id).single(),
      supabase
        .from("jugadores")
        .select("id, nombre, apellidos, dorsal, foto_url")
        .eq("activo", true)
        .order("dorsal", { ascending: true, nullsFirst: false })
        .order("apellidos", { ascending: true }),
      supabase
        .from("estados")
        .select("id, nombre, color")
        .eq("activo", true)
        .order("nombre", { ascending: true }),
      supabase
        .from("asistencias_entrenamiento")
        .select("jugador_id, estado_id")
        .eq("entrenamiento_id", id),
    ]);

  if (!entrenamiento) {
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

  const asistenciasIniciales = Object.fromEntries(
    (asistencias ?? [])
      .filter((a) => a.estado_id)
      .map((a) => [a.jugador_id, a.estado_id as string]),
  );

  return (
    <div className="space-y-4">
      <Link
        href={`/entrenamientos/${id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver al entrenamiento
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">
          {formatearFechaCorta(entrenamiento.fecha)}
        </h1>
        <p className="text-sm text-muted-foreground">
          Todos cuentan como asistidos salvo que marques lo contrario.
        </p>
      </div>
      <AsistenciaGrid
        entrenamientoId={id}
        jugadores={jugadoresConFoto}
        estados={estados ?? []}
        asistenciasIniciales={asistenciasIniciales}
      />
    </div>
  );
}
