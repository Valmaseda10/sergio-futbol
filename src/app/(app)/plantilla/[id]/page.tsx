"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, Printer } from "lucide-react";
import { localDb, type LocalPartido } from "@/lib/db/local-db";
import { createClient } from "@/lib/supabase/client";
import { calcularStatsJugadores } from "@/lib/estadisticas";
import { temporadaActual, enTemporada } from "@/lib/temporada";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { JugadorAvatar } from "@/components/plantilla/jugador-avatar";
import { BajaReactivarButton } from "@/components/plantilla/baja-reactivar-button";
import { ValoracionesJugador } from "@/components/plantilla/valoraciones-jugador";
import { AsistenciaJugador } from "@/components/plantilla/asistencia-jugador";
import { LesionesJugador } from "@/components/plantilla/lesiones-jugador";
import { VideosJugador } from "@/components/plantilla/videos-jugador";
import { EventosJugador } from "@/components/plantilla/eventos-jugador";
import { PdfWatermark } from "@/components/branding/pdf-watermark";
import { posicionLabel, demarcacionDePosicion } from "@/lib/posiciones";
import { cn } from "@/lib/utils";

type TipoEventoConDetalle =
  | "gol"
  | "asistencia"
  | "tarjeta_amarilla"
  | "tarjeta_roja";

type CategoriaDialogoPartidos =
  | "convocado"
  | "desconvocado"
  | "gol_encajado"
  | TipoEventoConDetalle;

// Un partido con cuántas veces ha pasado ahí ese evento (2 goles en el mismo
// partido cuentan como un solo partido en la lista, con un "×2" al lado).
interface PartidoConCantidad {
  partido: LocalPartido;
  cantidad: number;
}

const DIALOGO_PARTIDOS_TITULO: Record<CategoriaDialogoPartidos, string> = {
  convocado: "Partidos convocado",
  desconvocado: "Partidos no convocado",
  gol: "Partidos con gol",
  asistencia: "Partidos con asistencia",
  gol_encajado: "Partidos con gol encajado",
  tarjeta_amarilla: "Partidos con tarjeta amarilla",
  tarjeta_roja: "Partidos con tarjeta roja",
};

function hoyISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatearFechaCorta(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TileEstadisticaClicable({
  label,
  valor,
  onClick,
}: {
  label: string;
  valor: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="print:pointer-events-none"
      disabled={valor === 0}
      onClick={onClick}
    >
      <p
        className={cn(
          "font-heading text-xl tabular-nums",
          valor > 0 && "underline underline-offset-4",
        )}
      >
        {valor}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </button>
  );
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const PIERNA_LABEL: Record<string, string> = {
  izquierda: "Izquierda",
  derecha: "Derecha",
  ambidiestro: "Ambidiestro",
};

export default function FichaJugadorPage() {
  const { id } = useParams<{ id: string }>();
  const jugador = useLiveQuery(
    async () => (await localDb.jugadores.get(id)) ?? null,
    [id],
  );
  const [fotoSignedUrl, setFotoSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!jugador?.foto_url || !navigator.onLine) return;
    const supabase = createClient();
    supabase.storage
      .from("jugadores")
      .createSignedUrl(jugador.foto_url, 3600)
      .then(({ data }) => setFotoSignedUrl(data?.signedUrl ?? null));
  }, [jugador?.foto_url]);

  const hoy = hoyISO();
  const temporada = temporadaActual(hoy);
  const [faseSel, setFaseSel] = useState<"todas" | "pretemporada" | "liga">(
    "todas",
  );

  const eventos = useLiveQuery(() => localDb.eventos_partido.toArray(), [], []);
  const convocatorias = useLiveQuery(
    () => localDb.convocatorias.filter((c) => c.convocado).toArray(),
    [],
    [],
  );
  const alineaciones = useLiveQuery(() => localDb.alineaciones.toArray(), [], []);
  const partidos = useLiveQuery(() => localDb.partidos.toArray(), [], []);
  const entrenamientos = useLiveQuery(
    () => localDb.entrenamientos.toArray(),
    [],
    [],
  );
  const asistencias = useLiveQuery(
    () => localDb.asistencias_entrenamiento.toArray(),
    [],
    [],
  );
  const estados = useLiveQuery(() => localDb.estados.toArray(), [], []);

  const statsTemporada = useMemo(() => {
    if (!jugador) return null;

    const partidoIdsTemporada = new Set(
      partidos
        .filter(
          (p) =>
            enTemporada(p.fecha, temporada) &&
            (faseSel === "todas" || p.fase === faseSel),
        )
        .map((p) => p.id),
    );
    const entrenamientosTemporada = entrenamientos.filter((e) =>
      enTemporada(e.fecha, temporada),
    );
    const entrenamientoIdsTemporada = new Set(
      entrenamientosTemporada.map((e) => e.id),
    );
    const nombrePorEstado = new Map(estados.map((e) => [e.id, e.nombre]));
    const asistenciasConNombre = asistencias
      .filter(
        (a) => a.estado_id && entrenamientoIdsTemporada.has(a.entrenamiento_id),
      )
      .map((a) => ({
        entrenamiento_id: a.entrenamiento_id,
        jugador_id: a.jugador_id,
        estado_nombre: nombrePorEstado.get(a.estado_id as string) ?? "",
      }));

    return calcularStatsJugadores(
      [jugador],
      eventos.filter((e) => partidoIdsTemporada.has(e.partido_id)),
      convocatorias.filter((c) => partidoIdsTemporada.has(c.partido_id)),
      alineaciones.filter((a) => partidoIdsTemporada.has(a.partido_id)),
      entrenamientosTemporada.filter((e) => e.fecha <= hoy),
      asistenciasConNombre,
      hoy,
    )[0];
  }, [
    jugador,
    partidos,
    entrenamientos,
    estados,
    asistencias,
    eventos,
    convocatorias,
    alineaciones,
    temporada,
    faseSel,
    hoy,
  ]);

  // Partidos convocado/desconvocado (dentro del filtro de temporada/fase),
  // para el detalle de esas dos estadísticas. Desconvocado exige que ya se
  // decidiera la convocatoria (al menos un convocado=true para ese partido)
  // y que el jugador ya estuviera de alta — un partido futuro sin
  // convocatoria decidida todavía no cuenta como desconvocatoria de nadie.
  const { partidosConvocado, partidosDesconvocado } = useMemo(() => {
    if (!jugador) return { partidosConvocado: [], partidosDesconvocado: [] };

    const partidosFiltrados = partidos.filter(
      (p) =>
        enTemporada(p.fecha, temporada) &&
        (faseSel === "todas" || p.fase === faseSel),
    );
    const partidoIdsConConvocatoriaDecidida = new Set(
      convocatorias.map((c) => c.partido_id),
    );
    const convocadoPartidoIdsJugador = new Set(
      convocatorias
        .filter((c) => c.jugador_id === jugador.id)
        .map((c) => c.partido_id),
    );

    const ordenPorFechaDesc = (a: LocalPartido, b: LocalPartido) =>
      b.fecha.localeCompare(a.fecha);

    return {
      partidosConvocado: partidosFiltrados
        .filter((p) => convocadoPartidoIdsJugador.has(p.id))
        .sort(ordenPorFechaDesc)
        .map((partido): PartidoConCantidad => ({ partido, cantidad: 1 })),
      partidosDesconvocado: partidosFiltrados
        .filter(
          (p) =>
            partidoIdsConConvocatoriaDecidida.has(p.id) &&
            p.fecha >= jugador.fecha_alta &&
            !convocadoPartidoIdsJugador.has(p.id),
        )
        .sort(ordenPorFechaDesc)
        .map((partido): PartidoConCantidad => ({ partido, cantidad: 1 })),
    };
  }, [jugador, partidos, convocatorias, temporada, faseSel]);

  // Partidos en los que ha marcado gol/asistencia/tarjeta (dentro del mismo
  // filtro de temporada/fase), con cuántas veces en cada uno — 2 goles en el
  // mismo partido salen como una fila con "×2", no como dos filas iguales.
  const partidosPorEvento = useMemo(() => {
    const vacio: Record<TipoEventoConDetalle, PartidoConCantidad[]> = {
      gol: [],
      asistencia: [],
      tarjeta_amarilla: [],
      tarjeta_roja: [],
    };
    if (!jugador) return vacio;

    const partidoIdsTemporada = new Set(
      partidos
        .filter(
          (p) =>
            enTemporada(p.fecha, temporada) &&
            (faseSel === "todas" || p.fase === faseSel),
        )
        .map((p) => p.id),
    );
    const eventosJugador = eventos.filter(
      (e) => e.jugador_id === jugador.id && partidoIdsTemporada.has(e.partido_id),
    );
    const partidosPorId = new Map(partidos.map((p) => [p.id, p]));

    function partidosDe(tipo: TipoEventoConDetalle) {
      const cantidadPorPartidoId = new Map<string, number>();
      for (const e of eventosJugador) {
        if (e.tipo !== tipo) continue;
        cantidadPorPartidoId.set(
          e.partido_id,
          (cantidadPorPartidoId.get(e.partido_id) ?? 0) + 1,
        );
      }
      return Array.from(cantidadPorPartidoId.entries())
        .map(([partidoId, cantidad]) => {
          const partido = partidosPorId.get(partidoId);
          return partido ? { partido, cantidad } : null;
        })
        .filter((p): p is PartidoConCantidad => !!p)
        .sort((a, b) => b.partido.fecha.localeCompare(a.partido.fecha));
    }

    return {
      gol: partidosDe("gol"),
      asistencia: partidosDe("asistencia"),
      tarjeta_amarilla: partidosDe("tarjeta_amarilla"),
      tarjeta_roja: partidosDe("tarjeta_roja"),
    };
  }, [jugador, partidos, eventos, temporada, faseSel]);

  const esPortero = demarcacionDePosicion(jugador?.posicion ?? null) === "portero";

  // Para porteros, en qué partidos encajó algún gol mientras estaba en el
  // campo — reutiliza calcularStatsJugadores partido a partido (ya sabe
  // calcular la ventana dentro/fuera) en vez de reimplementar esa lógica.
  const partidosConGolEncajado = useMemo(() => {
    if (!jugador || !esPortero) return [];

    const partidoIdsTemporada = new Set(
      partidos
        .filter(
          (p) =>
            enTemporada(p.fecha, temporada) &&
            (faseSel === "todas" || p.fase === faseSel),
        )
        .map((p) => p.id),
    );
    const alineacionesJugador = alineaciones.filter(
      (a) => a.jugador_id === jugador.id && partidoIdsTemporada.has(a.partido_id),
    );
    const partidosPorId = new Map(partidos.map((p) => [p.id, p]));

    return alineacionesJugador
      .map((a) => {
        const eventosPartido = eventos.filter((e) => e.partido_id === a.partido_id);
        const stats = calcularStatsJugadores(
          [jugador],
          eventosPartido,
          [],
          [a],
          [],
          [],
          hoy,
        )[0];
        const partido = partidosPorId.get(a.partido_id);
        return partido && stats.golesEncajados > 0
          ? { partido, cantidad: stats.golesEncajados }
          : null;
      })
      .filter((p): p is PartidoConCantidad => !!p)
      .sort((a, b) => b.partido.fecha.localeCompare(a.partido.fecha));
  }, [jugador, esPortero, partidos, alineaciones, eventos, temporada, faseSel, hoy]);

  const [dialogoPartidos, setDialogoPartidos] = useState<CategoriaDialogoPartidos | null>(
    null,
  );

  if (jugador === undefined) {
    return <p className="text-sm text-muted-foreground">Cargando...</p>;
  }

  if (jugador === null) {
    return <p className="text-sm text-muted-foreground">Jugador no encontrado.</p>;
  }

  const nombreCompleto = `${jugador.nombre} ${jugador.apellidos}`;

  return (
    <div className="space-y-4">
      <PdfWatermark />
      <div className="flex items-center gap-4">
        <JugadorAvatar
          src={fotoSignedUrl}
          nombre={jugador.nombre}
          apellidos={jugador.apellidos}
          className="size-16"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold">
              {nombreCompleto}
            </h1>
            {!jugador.activo && <Badge variant="outline">Inactivo</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {jugador.dorsal != null ? `Dorsal ${jugador.dorsal} · ` : ""}
            {posicionLabel(jugador.posicion)}
            {jugador.alias ? ` · "${jugador.alias}"` : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="print:hidden"
          aria-label="Exportar a PDF"
          onClick={() => window.print()}
        >
          <Printer className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="print:hidden"
          nativeButton={false}
          render={
            <Link href={`/plantilla/${jugador.id}/editar`} aria-label="Editar" />
          }
        >
          <Pencil className="size-4" />
        </Button>
      </div>
      <p className="hidden text-xs text-muted-foreground print:block">
        Ficha generada el{" "}
        {new Date(`${hoy}T00:00:00`).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
      </p>

      {statsTemporada && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Temporada {temporada}</CardTitle>
            <Select
              value={faseSel}
              onValueChange={(v) => setFaseSel(v as typeof faseSel)}
            >
              <SelectTrigger className="w-[10.5rem] print:hidden">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Total</SelectItem>
                <SelectItem value="pretemporada">
                  Pretemporada (amistosos)
                </SelectItem>
                <SelectItem value="liga">Liga</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-3 text-center">
            <div className="grid grid-cols-5 gap-y-3">
              <TileEstadisticaClicable
                label="Convocados"
                valor={statsTemporada.convocatorias}
                onClick={() => setDialogoPartidos("convocado")}
              />
              <TileEstadisticaClicable
                label="Desconvocados"
                valor={partidosDesconvocado.length}
                onClick={() => setDialogoPartidos("desconvocado")}
              />
              {[
                { label: "Titular", valor: statsTemporada.titularidades },
                { label: "Suplente", valor: statsTemporada.suplencias },
                { label: "Minutos", valor: statsTemporada.minutosAprox },
              ].map((d) => (
                <div key={d.label}>
                  <p className="font-heading text-xl tabular-nums">{d.valor}</p>
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-y-3">
              {esPortero ? (
                <TileEstadisticaClicable
                  label="G. encajados"
                  valor={statsTemporada.golesEncajados}
                  onClick={() => setDialogoPartidos("gol_encajado")}
                />
              ) : (
                <TileEstadisticaClicable
                  label="Goles"
                  valor={statsTemporada.goles}
                  onClick={() => setDialogoPartidos("gol")}
                />
              )}
              <TileEstadisticaClicable
                label="Asist."
                valor={statsTemporada.asistencias}
                onClick={() => setDialogoPartidos("asistencia")}
              />
              <div>
                <p className="font-heading text-xl tabular-nums">
                  {statsTemporada.goles + statsTemporada.asistencias}
                </p>
                <p className="text-xs text-muted-foreground">G+A</p>
              </div>
              <TileEstadisticaClicable
                label="T. amarillas"
                valor={statsTemporada.tarjetasAmarillas}
                onClick={() => setDialogoPartidos("tarjeta_amarilla")}
              />
              <TileEstadisticaClicable
                label="T. rojas"
                valor={statsTemporada.tarjetasRojas}
                onClick={() => setDialogoPartidos("tarjeta_roja")}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Fecha de nacimiento</p>
            <p>{formatearFecha(jugador.fecha_nacimiento)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Pierna dominante</p>
            <p>
              {jugador.pierna_dominante
                ? PIERNA_LABEL[jugador.pierna_dominante]
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Fecha de alta</p>
            <p>{formatearFecha(jugador.fecha_alta)}</p>
          </div>
          {jugador.equipo_anterior && (
            <div>
              <p className="text-muted-foreground">Equipo anterior</p>
              <p>{jugador.equipo_anterior}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Padre</p>
            <div>
              <p className="text-muted-foreground">Nombre</p>
              <p>{jugador.contacto_padre_nombre || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Teléfono</p>
              {jugador.contacto_padre_telefono ? (
                <a
                  href={`tel:${jugador.contacto_padre_telefono}`}
                  className="text-primary underline"
                >
                  {jugador.contacto_padre_telefono}
                </a>
              ) : (
                <p>—</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Madre</p>
            <div>
              <p className="text-muted-foreground">Nombre</p>
              <p>{jugador.contacto_madre_nombre || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Teléfono</p>
              {jugador.contacto_madre_telefono ? (
                <a
                  href={`tel:${jugador.contacto_madre_telefono}`}
                  className="text-primary underline"
                >
                  {jugador.contacto_madre_telefono}
                </a>
              ) : (
                <p>—</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            {jugador.contacto_email ? (
              <a
                href={`mailto:${jugador.contacto_email}`}
                className="break-all text-primary underline"
              >
                {jugador.contacto_email}
              </a>
            ) : (
              <p>—</p>
            )}
          </div>
        </CardContent>
      </Card>

      {jugador.notas_medicas && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas médicas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">
            {jugador.notas_medicas}
          </CardContent>
        </Card>
      )}

      <EventosJugador jugadorId={jugador.id} />

      <AsistenciaJugador jugadorId={jugador.id} />

      <LesionesJugador jugadorId={jugador.id} />

      <ValoracionesJugador jugadorId={jugador.id} />

      <VideosJugador jugadorId={jugador.id} />

      <div className="print:hidden">
        <BajaReactivarButton
          jugadorId={jugador.id}
          activo={jugador.activo}
          nombreCompleto={nombreCompleto}
        />
      </div>

      <Dialog
        open={dialogoPartidos !== null}
        onOpenChange={(open) => !open && setDialogoPartidos(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogoPartidos && DIALOGO_PARTIDOS_TITULO[dialogoPartidos]}
            </DialogTitle>
          </DialogHeader>
          <ul className="max-h-[60vh] divide-y overflow-y-auto">
            {(dialogoPartidos === "convocado"
              ? partidosConvocado
              : dialogoPartidos === "desconvocado"
                ? partidosDesconvocado
                : dialogoPartidos === "gol_encajado"
                  ? partidosConGolEncajado
                  : dialogoPartidos
                    ? partidosPorEvento[dialogoPartidos]
                    : []
            ).map(({ partido: p, cantidad }) => (
              <li key={p.id}>
                <Link
                  href={`/partidos/${p.id}`}
                  onClick={() => setDialogoPartidos(null)}
                  className="flex items-center gap-3 py-2 text-sm hover:bg-muted/50"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    vs {p.rival}
                  </span>
                  {cantidad > 1 && (
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums">
                      ×{cantidad}
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatearFechaCorta(p.fecha)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
