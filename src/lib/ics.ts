// Generación mínima de un feed .ics (RFC 5545) para el calendario suscribible
// del equipo. Usa hora "flotante" (sin zona horaria) porque tanto el staff
// como los jugadores están siempre en la misma zona (España peninsular), lo
// que evita tener que resolver cambios de horario de verano/invierno aquí.

export interface EventoCalendario {
  uid: string;
  titulo: string;
  fecha: string; // YYYY-MM-DD
  horaInicio: string | null; // HH:MM[:SS]
  duracionMinutos: number;
  lugar: string | null;
  avisoMinutosAntes?: number;
}

function formatearFechaHora(fecha: string, hora: string) {
  const [anio, mes, dia] = fecha.split("-");
  const [h, m] = hora.split(":");
  return `${anio}${mes}${dia}T${h.padStart(2, "0")}${(m ?? "00").padStart(2, "0")}00`;
}

function formatearFechaSolo(fecha: string) {
  return fecha.replaceAll("-", "");
}

function escaparTexto(texto: string) {
  return texto.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function sumarMinutos(fecha: string, hora: string, minutos: number) {
  const base = new Date(`${fecha}T${hora.length === 5 ? `${hora}:00` : hora}`);
  base.setMinutes(base.getMinutes() + minutos);
  const anio = base.getFullYear();
  const mes = String(base.getMonth() + 1).padStart(2, "0");
  const dia = String(base.getDate()).padStart(2, "0");
  const h = String(base.getHours()).padStart(2, "0");
  const m = String(base.getMinutes()).padStart(2, "0");
  return `${anio}${mes}${dia}T${h}${m}00`;
}

function construirEvento(ev: EventoCalendario, dtstamp: string): string {
  const lineas = ["BEGIN:VEVENT", `UID:${ev.uid}`, `DTSTAMP:${dtstamp}`];

  if (ev.horaInicio) {
    lineas.push(`DTSTART:${formatearFechaHora(ev.fecha, ev.horaInicio)}`);
    lineas.push(`DTEND:${sumarMinutos(ev.fecha, ev.horaInicio, ev.duracionMinutos)}`);
  } else {
    lineas.push(`DTSTART;VALUE=DATE:${formatearFechaSolo(ev.fecha)}`);
  }

  lineas.push(`SUMMARY:${escaparTexto(ev.titulo)}`);
  if (ev.lugar) lineas.push(`LOCATION:${escaparTexto(ev.lugar)}`);

  if (ev.horaInicio && ev.avisoMinutosAntes) {
    lineas.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escaparTexto(ev.titulo)}`,
      `TRIGGER:-PT${ev.avisoMinutosAntes}M`,
      "END:VALARM",
    );
  }

  lineas.push("END:VEVENT");
  return lineas.join("\r\n");
}

export function construirIcs(
  nombreCalendario: string,
  eventos: EventoCalendario[],
): string {
  const dtstamp = `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Infantil B//Calendario//ES",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escaparTexto(nombreCalendario)}`,
    ...eventos.map((ev) => construirEvento(ev, dtstamp)),
    "END:VCALENDAR",
  ];
  return lineas.join("\r\n");
}
