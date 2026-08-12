import Link from "next/link";
import { Plus, CalendarPlus, MapPin, Clock } from "lucide-react";
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

export default async function EntrenamientosPage() {
  const supabase = await createClient();
  const hoy = hoyISO();

  const [{ data: proximos }, { data: anteriores }] = await Promise.all([
    supabase
      .from("entrenamientos")
      .select("id, fecha, hora_inicio, lugar, objetivos")
      .gte("fecha", hoy)
      .order("fecha", { ascending: true }),
    supabase
      .from("entrenamientos")
      .select("id, fecha, hora_inicio, lugar, objetivos")
      .lt("fecha", hoy)
      .order("fecha", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Entrenamientos</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/entrenamientos/generar" />}
          >
            <CalendarPlus className="size-4" />
            Generar
          </Button>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/entrenamientos/nuevo" />}
          >
            <Plus className="size-4" />
            Nuevo
          </Button>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Próximos
        </h2>
        {!proximos || proximos.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No hay entrenamientos programados.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {proximos.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/entrenamientos/${e.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {formatearFechaCorta(e.fecha)}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      {e.hora_inicio && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {e.hora_inicio.slice(0, 5)}
                        </span>
                      )}
                      {e.lugar && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {e.lugar}
                        </span>
                      )}
                    </p>
                  </div>
                  {!e.objetivos && (
                    <Badge variant="outline">Sin planificar</Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {anteriores && anteriores.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Anteriores
          </h2>
          <ul className="divide-y rounded-md border">
            {anteriores.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/entrenamientos/${e.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {formatearFechaCorta(e.fecha)}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      {e.hora_inicio && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {e.hora_inicio.slice(0, 5)}
                        </span>
                      )}
                      {e.lugar && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {e.lugar}
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
