import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EntrenamientoForm } from "@/components/entrenamientos/entrenamiento-form";

export default async function EditarEntrenamientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: entrenamiento } = await supabase
    .from("entrenamientos")
    .select("*")
    .eq("id", id)
    .single();

  if (!entrenamiento) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Editar entrenamiento</h1>
      <EntrenamientoForm
        entrenamiento={{
          id: entrenamiento.id,
          fecha: entrenamiento.fecha,
          hora_inicio: entrenamiento.hora_inicio?.slice(0, 5) ?? "",
          hora_fin: entrenamiento.hora_fin?.slice(0, 5) ?? "",
          lugar: entrenamiento.lugar ?? "",
          objetivos: entrenamiento.objetivos ?? "",
          ejercicios: entrenamiento.ejercicios ?? "",
          notas: entrenamiento.notas ?? "",
        }}
      />
    </div>
  );
}
