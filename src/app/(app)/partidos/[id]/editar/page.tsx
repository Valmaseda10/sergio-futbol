import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PartidoForm } from "@/components/partidos/partido-form";

export default async function EditarPartidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: partido } = await supabase
    .from("partidos")
    .select("*")
    .eq("id", id)
    .single();

  if (!partido) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Editar partido</h1>
      <PartidoForm
        partido={{
          id: partido.id,
          fecha: partido.fecha,
          hora: partido.hora?.slice(0, 5) ?? "",
          competicion: partido.competicion,
          rival: partido.rival,
          local_visitante: partido.local_visitante,
          lugar: partido.lugar ?? "",
          resultado_favor: partido.resultado_favor?.toString() ?? "",
          resultado_contra: partido.resultado_contra?.toString() ?? "",
          notas: partido.notas ?? "",
        }}
      />
    </div>
  );
}
