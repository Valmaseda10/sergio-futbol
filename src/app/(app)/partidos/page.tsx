import Link from "next/link";
import { Plus, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { capitalizarPrimera } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatearFechaCorta(fecha: string) {
  return capitalizarPrimera(
    new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    }),
  );
}

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const COMPETICION_LABEL: Record<string, string> = {
  liga: "Liga",
  amistoso: "Amistoso",
  copa: "Copa",
};

export default async function PartidosPage() {
  const supabase = await createClient();
  const hoy = hoyISO();

  const [{ data: proximos }, { data: anteriores }] = await Promise.all([
    supabase
      .from("partidos")
      .select(
        "id, fecha, hora, competicion, rival, local_visitante, lugar, resultado_favor, resultado_contra",
      )
      .gte("fecha", hoy)
      .order("fecha", { ascending: true }),
    supabase
      .from("partidos")
      .select(
        "id, fecha, hora, competicion, rival, local_visitante, lugar, resultado_favor, resultado_contra",
      )
      .lt("fecha", hoy)
      .order("fecha", { ascending: false })
      .limit(10),
  ]);

  function renderFila(p: {
    id: string;
    fecha: string;
    competicion: string;
    rival: string;
    local_visitante: string;
    lugar: string | null;
    resultado_favor: number | null;
    resultado_contra: number | null;
  }) {
    const tieneResultado =
      p.resultado_favor != null && p.resultado_contra != null;

    return (
      <li key={p.id}>
        <Link
          href={`/partidos/${p.id}`}
          className="flex items-center gap-3 p-3 hover:bg-muted/50"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {formatearFechaCorta(p.fecha)} ·{" "}
              {p.local_visitante === "local" ? "vs" : "@"} {p.rival}
            </p>
            <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-[10px]">
                {COMPETICION_LABEL[p.competicion]}
              </Badge>
              {p.lugar && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {p.lugar}
                </span>
              )}
            </p>
          </div>
          {tieneResultado && (
            <span className="text-sm font-semibold">
              {p.resultado_favor} - {p.resultado_contra}
            </span>
          )}
        </Link>
      </li>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Partidos</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/partidos/nuevo" />}>
          <Plus className="size-4" />
          Nuevo
        </Button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Próximos
        </h2>
        {!proximos || proximos.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No hay partidos programados.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {proximos.map(renderFila)}
          </ul>
        )}
      </section>

      {anteriores && anteriores.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Anteriores
          </h2>
          <ul className="divide-y rounded-md border">
            {anteriores.map(renderFila)}
          </ul>
        </section>
      )}
    </div>
  );
}
