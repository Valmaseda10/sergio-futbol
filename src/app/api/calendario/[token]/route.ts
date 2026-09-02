import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { construirIcs, type EventoCalendario } from "@/lib/ics";
import { clubConfig } from "@/lib/club-config";

const AVISO_MINUTOS_ANTES = 60;
const DURACION_ENTRENAMIENTO_DEFECTO_MIN = 90;
const DURACION_PARTIDO_MIN = 70;

// Dominio usado como sufijo de los UID del calendario (solo tiene que ser
// estable y único, no hace falta que resuelva). Se deriva de la URL pública
// configurada para este despliegue en vez de tener un dominio fijo en el
// código, que dejaría de ser válido en cuanto se despliegue para otro club.
function dominioParaUid(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return "panel-entrenador.local";
  try {
    return new URL(siteUrl).host;
  } catch {
    return "panel-entrenador.local";
  }
}

function minutosEntre(horaInicio: string, horaFin: string) {
  const [h1, m1] = horaInicio.split(":").map(Number);
  const [h2, m2] = horaFin.split(":").map(Number);
  const minutos = h2 * 60 + m2 - (h1 * 60 + m1);
  return minutos > 0 ? minutos : DURACION_ENTRENAMIENTO_DEFECTO_MIN;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const admin = createAdminClient();

  const { data: usuario } = await admin
    .from("usuarios")
    .select("id, activo")
    .eq("calendario_token", token)
    .maybeSingle();

  if (!usuario || !usuario.activo) {
    return new Response("Not found", { status: 404 });
  }

  const [{ data: entrenamientos }, { data: partidos }] = await Promise.all([
    admin
      .from("entrenamientos")
      .select("id, fecha, hora_inicio, hora_fin, lugar"),
    admin
      .from("partidos")
      .select("id, fecha, hora, rival, lugar, local_visitante, competicion"),
  ]);

  const dominioUid = dominioParaUid();

  const eventos: EventoCalendario[] = [
    ...(entrenamientos ?? []).map((e): EventoCalendario => ({
      uid: `entrenamiento-${e.id}@${dominioUid}`,
      titulo: "Entrenamiento",
      fecha: e.fecha,
      horaInicio: e.hora_inicio,
      duracionMinutos:
        e.hora_inicio && e.hora_fin
          ? minutosEntre(e.hora_inicio, e.hora_fin)
          : DURACION_ENTRENAMIENTO_DEFECTO_MIN,
      lugar: e.lugar,
      avisoMinutosAntes: AVISO_MINUTOS_ANTES,
    })),
    ...(partidos ?? []).map((p): EventoCalendario => ({
      uid: `partido-${p.id}@${dominioUid}`,
      titulo: `${p.local_visitante === "local" ? "vs" : "@"} ${p.rival}`,
      fecha: p.fecha,
      horaInicio: p.hora,
      duracionMinutos: DURACION_PARTIDO_MIN,
      lugar: p.lugar,
      avisoMinutosAntes: AVISO_MINUTOS_ANTES,
    })),
  ];

  const ics = construirIcs(clubConfig.nombreEquipo, eventos);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="calendario.ics"',
      "Cache-Control": "no-store",
    },
  });
}
