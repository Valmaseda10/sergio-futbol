import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { JugadoresList } from "@/components/plantilla/jugadores-list";

export default async function PlantillaPage() {
  const supabase = await createClient();
  const { data: jugadores } = await supabase
    .from("jugadores")
    .select("id, nombre, apellidos, dorsal, posicion, activo, foto_url")
    .order("dorsal", { ascending: true, nullsFirst: false })
    .order("apellidos", { ascending: true });

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Plantilla</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/plantilla/nuevo" />}>
          <Plus className="size-4" />
          Nuevo
        </Button>
      </div>
      <JugadoresList jugadores={jugadoresConFoto} />
    </div>
  );
}
