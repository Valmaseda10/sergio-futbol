// Tipos escritos a mano, reflejando el esquema de supabase/migrations/0001_schema.sql.
// En cuanto el proyecto Supabase real esté enlazado, regenera este archivo con:
//   npx supabase gen types typescript --project-id <tu-project-ref> --schema public > src/lib/types/database.types.ts

export type Rol = "admin" | "staff";
export type TipoEstado = "entrenamiento" | "general";
export type PiernaDominante = "izquierda" | "derecha" | "ambidiestro";
export type Competicion = "liga" | "amistoso" | "copa";
export type LocalVisitante = "local" | "visitante";
export type TipoEventoPartido =
  | "gol"
  | "asistencia"
  | "tarjeta_amarilla"
  | "tarjeta_roja";
export type EstadoSolicitud = "pendiente" | "aprobado" | "rechazado";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          nombre: string;
          email: string;
          rol: Rol;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          nombre: string;
          email: string;
          rol: Rol;
          activo?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["usuarios"]["Insert"]>;
        Relationships: [];
      };
      estados: {
        Row: {
          id: string;
          nombre: string;
          color: string;
          tipo: TipoEstado;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          color: string;
          tipo: TipoEstado;
          activo?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["estados"]["Insert"]>;
        Relationships: [];
      };
      jugadores: {
        Row: {
          id: string;
          nombre: string;
          apellidos: string;
          dorsal: number | null;
          posicion: string | null;
          pierna_dominante: PiernaDominante | null;
          fecha_nacimiento: string | null;
          foto_url: string | null;
          contacto_nombre: string | null;
          contacto_telefono: string | null;
          contacto_email: string | null;
          notas_medicas: string | null;
          fecha_alta: string;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          apellidos: string;
          dorsal?: number | null;
          posicion?: string | null;
          pierna_dominante?: PiernaDominante | null;
          fecha_nacimiento?: string | null;
          foto_url?: string | null;
          contacto_nombre?: string | null;
          contacto_telefono?: string | null;
          contacto_email?: string | null;
          notas_medicas?: string | null;
          fecha_alta?: string;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["jugadores"]["Insert"]>;
        Relationships: [];
      };
      entrenamientos: {
        Row: {
          id: string;
          fecha: string;
          hora_inicio: string | null;
          hora_fin: string | null;
          lugar: string | null;
          objetivos: string | null;
          ejercicios: string | null;
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          fecha: string;
          hora_inicio?: string | null;
          hora_fin?: string | null;
          lugar?: string | null;
          objetivos?: string | null;
          ejercicios?: string | null;
          notas?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["entrenamientos"]["Insert"]
        >;
        Relationships: [];
      };
      asistencias_entrenamiento: {
        Row: {
          id: string;
          entrenamiento_id: string;
          jugador_id: string;
          estado_id: string | null;
          notas: string | null;
        };
        Insert: {
          id?: string;
          entrenamiento_id: string;
          jugador_id: string;
          estado_id?: string | null;
          notas?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["asistencias_entrenamiento"]["Insert"]
        >;
        Relationships: [];
      };
      partidos: {
        Row: {
          id: string;
          fecha: string;
          hora: string | null;
          competicion: Competicion;
          rival: string;
          local_visitante: LocalVisitante;
          lugar: string | null;
          resultado_favor: number | null;
          resultado_contra: number | null;
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          fecha: string;
          hora?: string | null;
          competicion: Competicion;
          rival: string;
          local_visitante: LocalVisitante;
          lugar?: string | null;
          resultado_favor?: number | null;
          resultado_contra?: number | null;
          notas?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["partidos"]["Insert"]>;
        Relationships: [];
      };
      convocatorias: {
        Row: {
          id: string;
          partido_id: string;
          jugador_id: string;
          convocado: boolean;
          motivo_no_convocado: string | null;
        };
        Insert: {
          id?: string;
          partido_id: string;
          jugador_id: string;
          convocado?: boolean;
          motivo_no_convocado?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["convocatorias"]["Insert"]
        >;
        Relationships: [];
      };
      alineaciones: {
        Row: {
          id: string;
          partido_id: string;
          jugador_id: string;
          titular: boolean;
          posicion_jugada: string | null;
          minuto_entra: number | null;
          minuto_sale: number | null;
        };
        Insert: {
          id?: string;
          partido_id: string;
          jugador_id: string;
          titular?: boolean;
          posicion_jugada?: string | null;
          minuto_entra?: number | null;
          minuto_sale?: number | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["alineaciones"]["Insert"]
        >;
        Relationships: [];
      };
      eventos_partido: {
        Row: {
          id: string;
          partido_id: string;
          jugador_id: string;
          tipo: TipoEventoPartido;
          minuto: number | null;
        };
        Insert: {
          id?: string;
          partido_id: string;
          jugador_id: string;
          tipo: TipoEventoPartido;
          minuto?: number | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["eventos_partido"]["Insert"]
        >;
        Relationships: [];
      };
      valoraciones_partido: {
        Row: {
          id: string;
          partido_id: string;
          valoracion_general: string | null;
          rating_equipo: number | null;
        };
        Insert: {
          id?: string;
          partido_id: string;
          valoracion_general?: string | null;
          rating_equipo?: number | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["valoraciones_partido"]["Insert"]
        >;
        Relationships: [];
      };
      valoraciones_jugador: {
        Row: {
          id: string;
          jugador_id: string;
          fecha: string;
          tecnica: number | null;
          fisico: number | null;
          tactica: number | null;
          actitud: number | null;
          notas: string | null;
        };
        Insert: {
          id?: string;
          jugador_id: string;
          fecha?: string;
          tecnica?: number | null;
          fisico?: number | null;
          tactica?: number | null;
          actitud?: number | null;
          notas?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["valoraciones_jugador"]["Insert"]
        >;
        Relationships: [];
      };
      lesiones: {
        Row: {
          id: string;
          jugador_id: string;
          fecha_inicio: string;
          tipo: string;
          fecha_prevista_alta: string | null;
          fecha_alta_real: string | null;
          notas: string | null;
        };
        Insert: {
          id?: string;
          jugador_id: string;
          fecha_inicio: string;
          tipo: string;
          fecha_prevista_alta?: string | null;
          fecha_alta_real?: string | null;
          notas?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["lesiones"]["Insert"]>;
        Relationships: [];
      };
      solicitudes_acceso: {
        Row: {
          id: string;
          nombre: string;
          email: string;
          mensaje: string | null;
          fecha_solicitud: string;
          estado: EstadoSolicitud;
        };
        Insert: {
          id?: string;
          nombre: string;
          email: string;
          mensaje?: string | null;
          fecha_solicitud?: string;
          estado?: EstadoSolicitud;
        };
        Update: Partial<
          Database["public"]["Tables"]["solicitudes_acceso"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_staff_or_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
