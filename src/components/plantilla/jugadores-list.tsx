"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { JugadorAvatar } from "@/components/plantilla/jugador-avatar";
import {
  DEMARCACION_LABEL,
  DEMARCACION_ORDEN,
  demarcacionDePosicion,
  posicionLabel,
} from "@/lib/posiciones";

interface JugadorListItem {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number | null;
  posicion: string | null;
  activo: boolean;
  foto_url: string | null;
}

export function JugadoresList({
  jugadores,
}: {
  jugadores: JugadorListItem[];
}) {
  const [search, setSearch] = useState("");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [fotoUrls, setFotoUrls] = useState<Record<string, string>>({});

  const rutasFoto = useMemo(
    () => jugadores.map((j) => j.foto_url).filter((v): v is string => !!v),
    [jugadores],
  );
  const rutasFotoKey = rutasFoto.join(",");

  useEffect(() => {
    if (rutasFoto.length === 0 || !navigator.onLine) return;
    const supabase = createClient();
    supabase.storage
      .from("jugadores")
      .createSignedUrls(rutasFoto, 3600)
      .then(({ data }) => {
        if (!data) return;
        setFotoUrls((prev) => {
          const next = { ...prev };
          for (const d of data) {
            if (d.signedUrl && d.path) next[d.path] = d.signedUrl;
          }
          return next;
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutasFotoKey]);

  const filtrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    return jugadores.filter((j) => {
      if (!mostrarInactivos && !j.activo) return false;
      if (!term) return true;
      const nombreCompleto = `${j.nombre} ${j.apellidos}`.toLowerCase();
      const dorsal = j.dorsal?.toString() ?? "";
      return nombreCompleto.includes(term) || dorsal === term;
    });
  }, [jugadores, search, mostrarInactivos]);

  const grupos = useMemo(() => {
    const sinClasificar: JugadorListItem[] = [];
    const porDemarcacion = new Map<string, JugadorListItem[]>(
      DEMARCACION_ORDEN.map((d) => [d, []]),
    );
    for (const j of filtrados) {
      const demarcacion = demarcacionDePosicion(j.posicion);
      if (demarcacion) {
        porDemarcacion.get(demarcacion)!.push(j);
      } else {
        sinClasificar.push(j);
      }
    }
    const resultado = DEMARCACION_ORDEN.map((d) => ({
      label: DEMARCACION_LABEL[d],
      jugadores: porDemarcacion.get(d)!,
    })).filter((g) => g.jugadores.length > 0);
    if (sinClasificar.length > 0) {
      resultado.push({ label: "Sin clasificar", jugadores: sinClasificar });
    }
    return resultado;
  }, [filtrados]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o dorsal..."
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="mostrar-inactivos"
          checked={mostrarInactivos}
          onCheckedChange={setMostrarInactivos}
        />
        <Label htmlFor="mostrar-inactivos" className="text-sm font-normal">
          Mostrar inactivos
        </Label>
      </div>

      {filtrados.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay jugadores que coincidan con la búsqueda.
        </p>
      ) : (
        <div className="space-y-4">
          {grupos.map((grupo) => (
            <section key={grupo.label} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {grupo.label}
              </h2>
              <ul className="divide-y rounded-md border">
                {grupo.jugadores.map((j) => (
                  <li key={j.id}>
                    <Link
                      href={`/plantilla/${j.id}`}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50"
                    >
                      <JugadorAvatar
                        src={j.foto_url ? fotoUrls[j.foto_url] ?? null : null}
                        nombre={j.nombre}
                        apellidos={j.apellidos}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {j.nombre} {j.apellidos}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {posicionLabel(j.posicion)}
                        </p>
                      </div>
                      {j.dorsal != null && (
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-gold font-heading text-sm text-foreground tabular-nums">
                          {j.dorsal}
                        </span>
                      )}
                      {!j.activo && <Badge variant="outline">Inactivo</Badge>}
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
