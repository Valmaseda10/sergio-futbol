// Espejo local (IndexedDB via Dexie) del esquema de Supabase, para lectura y
// escritura sin conexión. Se mantiene sincronizado por src/lib/db/sync.ts.
//
// Tablas deliberadamente NO incluidas (se quedan online-only):
// - usuarios / solicitudes_acceso: la gestión de usuarios requiere la
//   service_role key, que nunca debe llegar al cliente.

import Dexie, { type Table } from "dexie";
import type {
  Database,
  TipoEventoPartido,
} from "@/lib/types/database.types";

type Tables = Database["public"]["Tables"];

export type LocalJugador = Tables["jugadores"]["Row"];
export type LocalEntrenamiento = Tables["entrenamientos"]["Row"];
export type LocalAsistencia = Tables["asistencias_entrenamiento"]["Row"];
export type LocalEstado = Tables["estados"]["Row"];
export type LocalPartido = Tables["partidos"]["Row"];
export type LocalConvocatoria = Tables["convocatorias"]["Row"];
export type LocalAlineacion = Tables["alineaciones"]["Row"];
export type LocalEventoPartido = Tables["eventos_partido"]["Row"];
export type LocalValoracionPartido = Tables["valoraciones_partido"]["Row"];
export type LocalValoracionJugador = Tables["valoraciones_jugador"]["Row"];
export type LocalVideo = Tables["videos"]["Row"];
export type LocalLesion = Tables["lesiones"]["Row"];
export type LocalLesionSesion = Tables["lesion_sesiones_readaptacion"]["Row"];
export type LocalRivalScouting = Tables["rivales_scouting"]["Row"];
export type LocalRivalJugadorDestacado =
  Tables["rivales_jugadores_destacados"]["Row"];

export const SYNCED_TABLES = [
  "jugadores",
  "entrenamientos",
  "asistencias_entrenamiento",
  "estados",
  "partidos",
  "convocatorias",
  "alineaciones",
  "eventos_partido",
  "valoraciones_partido",
  "valoraciones_jugador",
  "videos",
  "lesiones",
  "lesion_sesiones_readaptacion",
  "rivales_scouting",
  "rivales_jugadores_destacados",
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

export type OutboxOp = "insert" | "update" | "delete";

// Tablas de unión con restricción unique(col1,col2) además de su id sintético:
// si dos dispositivos crean la misma pareja con ids distintos, un insert
// normal violaría esa constraint. Se envían como upsert sobre esa clave.
export const CONFLICT_TARGETS: Partial<Record<SyncedTable, string>> = {
  asistencias_entrenamiento: "entrenamiento_id,jugador_id",
  convocatorias: "partido_id,jugador_id",
  alineaciones: "partido_id,jugador_id",
};

export interface OutboxEntry {
  id?: number;
  table: SyncedTable;
  op: OutboxOp;
  recordId: string;
  payload?: Record<string, unknown>;
  createdAt: number;
}

export interface MetaEntry {
  key: string;
  value: string;
}

class LocalDb extends Dexie {
  jugadores!: Table<LocalJugador, string>;
  entrenamientos!: Table<LocalEntrenamiento, string>;
  asistencias_entrenamiento!: Table<LocalAsistencia, string>;
  estados!: Table<LocalEstado, string>;
  partidos!: Table<LocalPartido, string>;
  convocatorias!: Table<LocalConvocatoria, string>;
  alineaciones!: Table<LocalAlineacion, string>;
  eventos_partido!: Table<LocalEventoPartido, string>;
  valoraciones_partido!: Table<LocalValoracionPartido, string>;
  valoraciones_jugador!: Table<LocalValoracionJugador, string>;
  videos!: Table<LocalVideo, string>;
  lesiones!: Table<LocalLesion, string>;
  lesion_sesiones_readaptacion!: Table<LocalLesionSesion, string>;
  rivales_scouting!: Table<LocalRivalScouting, string>;
  rivales_jugadores_destacados!: Table<LocalRivalJugadorDestacado, string>;
  outbox!: Table<OutboxEntry, number>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super("infantil-b-db");

    this.version(1).stores({
      jugadores: "id, dorsal, apellidos, activo",
      entrenamientos: "id, fecha",
      asistencias_entrenamiento: "id, entrenamiento_id, jugador_id",
      estados: "id, tipo, activo",
      partidos: "id, fecha",
      convocatorias: "id, partido_id, jugador_id",
      alineaciones: "id, partido_id, jugador_id",
      eventos_partido: "id, partido_id, jugador_id, tipo",
      valoraciones_partido: "id, partido_id",
      valoraciones_jugador: "id, jugador_id, fecha",
      outbox: "++id, table, createdAt",
      meta: "key",
    });

    this.version(2).stores({
      videos: "id, tipo, partido_id, fecha",
    });

    this.version(3).stores({
      lesiones: "id, jugador_id, fecha_inicio",
      lesion_sesiones_readaptacion: "id, lesion_id, fecha",
      rivales_scouting: "id, nombre",
      rivales_jugadores_destacados: "id, rival_id, categoria",
    });

    this.version(4).stores({
      goles_partido: "id, partido_id, a_favor, tipo_gol",
    });

    // goles_partido se unifica dentro de eventos_partido (a_favor, tipo_gol,
    // pos_x, pos_y ahora viven ahí); se elimina la tabla independiente.
    this.version(5).stores({
      goles_partido: null,
    });
  }
}

export const localDb = new LocalDb();

export function isTipoEventoPartido(v: string): v is TipoEventoPartido {
  return ["gol", "asistencia", "tarjeta_amarilla", "tarjeta_roja"].includes(v);
}
