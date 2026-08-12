import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ValoracionForm } from "@/components/partidos/valoracion-form";

export default async function ValoracionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: partido }, { data: valoracion }] = await Promise.all([
    supabase.from("partidos").select("id, rival").eq("id", id).single(),
    supabase
      .from("valoraciones_partido")
      .select("valoracion_general, rating_equipo")
      .eq("partido_id", id)
      .maybeSingle(),
  ]);

  if (!partido) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/partidos/${id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver al partido
      </Link>
      <h1 className="text-2xl font-semibold">Valoración vs {partido.rival}</h1>
      <ValoracionForm
        partidoId={id}
        valoracionInicial={valoracion?.valoracion_general ?? ""}
        ratingInicial={valoracion?.rating_equipo?.toString() ?? ""}
      />
    </div>
  );
}
