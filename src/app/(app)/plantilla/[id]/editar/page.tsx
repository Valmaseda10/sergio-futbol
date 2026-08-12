import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JugadorForm } from "@/components/plantilla/jugador-form";

export default async function EditarJugadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: jugador } = await supabase
    .from("jugadores")
    .select("*")
    .eq("id", id)
    .single();

  if (!jugador) {
    notFound();
  }

  const fotoSignedUrl = jugador.foto_url
    ? (
        await supabase.storage
          .from("jugadores")
          .createSignedUrl(jugador.foto_url, 3600)
      ).data?.signedUrl ?? null
    : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Editar jugador</h1>
      <JugadorForm
        jugador={{
          id: jugador.id,
          nombre: jugador.nombre,
          apellidos: jugador.apellidos,
          dorsal: jugador.dorsal?.toString() ?? "",
          posicion: jugador.posicion ?? "",
          pierna_dominante: jugador.pierna_dominante ?? "",
          fecha_nacimiento: jugador.fecha_nacimiento ?? "",
          contacto_nombre: jugador.contacto_nombre ?? "",
          contacto_telefono: jugador.contacto_telefono ?? "",
          contacto_email: jugador.contacto_email ?? "",
          notas_medicas: jugador.notas_medicas ?? "",
          fecha_alta: jugador.fecha_alta,
          fotoSignedUrl,
        }}
      />
    </div>
  );
}
