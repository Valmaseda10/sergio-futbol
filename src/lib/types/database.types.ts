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
  | "tarjeta_roja"
  | "cambio_entra"
  | "cambio_sale"
  | "autogol";
export type EstadoSolicitud = "pendiente" | "aprobado" | "rechazado";
export type TipoVideo = "partido" | "clip";
export type CategoriaJugadorDestacado = "top" | "flojo";
export type TipoGol =
  | "juego_asociativo"
  | "transicion_ofensiva"
  | "juego_vertical"
  | "centro_lateral"
  | "error_propio"
  | "abp"
  | "situacion_1v1";
export type TipoAbp =
  | "corner"
  | "falta_lateral"
  | "falta_directa"
  | "saque_banda"
  | "penalti";

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
          calendario_token: string;
        };
        Insert: {
          id: string;
          nombre: string;
          email: string;
          rol: Rol;
          activo?: boolean;
          created_at?: string;
          calendario_token?: string;
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
      etiquetas: {
        Row: {
          id: string;
          nombre: string;
          color: string;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          color: string;
          activo?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["etiquetas"]["Insert"]>;
        Relationships: [];
      };
      etiquetas_partido: {
        Row: {
          id: string;
          partido_id: string;
          etiqueta_id: string;
          jugador_id: string | null;
          minuto: number | null;
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          partido_id: string;
          etiqueta_id: string;
          jugador_id?: string | null;
          minuto?: number | null;
          notas?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["etiquetas_partido"]["Insert"]
        >;
        Relationships: [];
      };
      ejercicios: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          descripcion?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ejercicios"]["Insert"]>;
        Relationships: [];
      };
      jugadores: {
        Row: {
          id: string;
          nombre: string;
          apellidos: string;
          alias: string | null;
          dorsal: number | null;
          posicion: string | null;
          pierna_dominante: PiernaDominante | null;
          fecha_nacimiento: string | null;
          foto_url: string | null;
          equipo_anterior: string | null;
          contacto_padre_nombre: string | null;
          contacto_padre_telefono: string | null;
          contacto_madre_nombre: string | null;
          contacto_madre_telefono: string | null;
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
          alias?: string | null;
          dorsal?: number | null;
          posicion?: string | null;
          pierna_dominante?: PiernaDominante | null;
          fecha_nacimiento?: string | null;
          foto_url?: string | null;
          equipo_anterior?: string | null;
          contacto_padre_nombre?: string | null;
          contacto_padre_telefono?: string | null;
          contacto_madre_nombre?: string | null;
          contacto_madre_telefono?: string | null;
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
          tarea_1: string | null;
          tarea_2: string | null;
          tarea_3: string | null;
          tarea_4: string | null;
          notas: string | null;
          documento_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          fecha: string;
          hora_inicio?: string | null;
          hora_fin?: string | null;
          lugar?: string | null;
          objetivos?: string | null;
          tarea_1?: string | null;
          tarea_2?: string | null;
          tarea_3?: string | null;
          tarea_4?: string | null;
          notas?: string | null;
          documento_url?: string | null;
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
          foto_rival_url: string | null;
          rival_scouting_id: string | null;
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
          foto_rival_url?: string | null;
          rival_scouting_id?: string | null;
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
          jugador_id: string | null;
          nombre_libre: string | null;
          titular: boolean;
          posicion_jugada: string | null;
          minuto_entra: number | null;
          minuto_sale: number | null;
          pos_x: number | null;
          pos_y: number | null;
        };
        Insert: {
          id?: string;
          partido_id: string;
          jugador_id?: string | null;
          nombre_libre?: string | null;
          titular?: boolean;
          posicion_jugada?: string | null;
          minuto_entra?: number | null;
          minuto_sale?: number | null;
          pos_x?: number | null;
          pos_y?: number | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["alineaciones"]["Insert"]
        >;
        Relationships: [];
      };
      alineaciones_finales: {
        Row: {
          id: string;
          partido_id: string;
          jugador_id: string | null;
          nombre_libre: string | null;
          titular: boolean;
          posicion_jugada: string | null;
          pos_x: number | null;
          pos_y: number | null;
        };
        Insert: {
          id?: string;
          partido_id: string;
          jugador_id?: string | null;
          nombre_libre?: string | null;
          titular?: boolean;
          posicion_jugada?: string | null;
          pos_x?: number | null;
          pos_y?: number | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["alineaciones_finales"]["Insert"]
        >;
        Relationships: [];
      };
      campogramas: {
        Row: {
          id: string;
          nombre: string;
          notas: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          notas?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["campogramas"]["Insert"]>;
        Relationships: [];
      };
      campograma_jugadores: {
        Row: {
          id: string;
          campograma_id: string;
          jugador_id: string;
          titular: boolean;
          posicion_jugada: string | null;
          pos_x: number | null;
          pos_y: number | null;
          orden: number | null;
        };
        Insert: {
          id?: string;
          campograma_id: string;
          jugador_id: string;
          titular?: boolean;
          posicion_jugada?: string | null;
          pos_x?: number | null;
          pos_y?: number | null;
          orden?: number | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["campograma_jugadores"]["Insert"]
        >;
        Relationships: [];
      };
      campograma_rivales: {
        Row: {
          id: string;
          campograma_id: string;
          nombre: string;
          dorsal: number | null;
          posicion_jugada: string | null;
          pos_x: number | null;
          pos_y: number | null;
          orden: number | null;
        };
        Insert: {
          id?: string;
          campograma_id: string;
          nombre: string;
          dorsal?: number | null;
          posicion_jugada?: string | null;
          pos_x?: number | null;
          pos_y?: number | null;
          orden?: number | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["campograma_rivales"]["Insert"]
        >;
        Relationships: [];
      };
      eventos_partido: {
        Row: {
          id: string;
          partido_id: string;
          jugador_id: string | null;
          tipo: TipoEventoPartido;
          minuto: number | null;
          a_favor: boolean;
          tipo_gol: TipoGol | null;
          pos_x: number | null;
          pos_y: number | null;
          abp_tipo: TipoAbp | null;
          pos_x_centro: number | null;
          pos_y_centro: number | null;
          cambio_grupo_id: string | null;
          nombre_libre: string | null;
          notas: string | null;
        };
        Insert: {
          id?: string;
          partido_id: string;
          jugador_id?: string | null;
          tipo: TipoEventoPartido;
          minuto?: number | null;
          a_favor?: boolean;
          tipo_gol?: TipoGol | null;
          pos_x?: number | null;
          pos_y?: number | null;
          abp_tipo?: TipoAbp | null;
          pos_x_centro?: number | null;
          pos_y_centro?: number | null;
          cambio_grupo_id?: string | null;
          nombre_libre?: string | null;
          notas?: string | null;
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
          mecanismo: string | null;
          fecha_prevista_alta: string | null;
          fecha_alta_real: string | null;
          notas: string | null;
        };
        Insert: {
          id?: string;
          jugador_id: string;
          fecha_inicio: string;
          tipo: string;
          mecanismo?: string | null;
          fecha_prevista_alta?: string | null;
          fecha_alta_real?: string | null;
          notas?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["lesiones"]["Insert"]>;
        Relationships: [];
      };
      lesion_sesiones_readaptacion: {
        Row: {
          id: string;
          lesion_id: string;
          fecha: string;
          horario: string | null;
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lesion_id: string;
          fecha?: string;
          horario?: string | null;
          notas?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["lesion_sesiones_readaptacion"]["Insert"]
        >;
        Relationships: [];
      };
      rivales_scouting: {
        Row: {
          id: string;
          nombre: string;
          foto_url: string | null;
          sistema_juego: string | null;
          fase_ofensiva: string | null;
          fase_defensiva: string | null;
          abp: string | null;
          notas: string | null;
          color_camiseta: string | null;
          color_pantalon: string | null;
          color_medias: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          foto_url?: string | null;
          sistema_juego?: string | null;
          fase_ofensiva?: string | null;
          fase_defensiva?: string | null;
          abp?: string | null;
          notas?: string | null;
          color_camiseta?: string | null;
          color_pantalon?: string | null;
          color_medias?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["rivales_scouting"]["Insert"]
        >;
        Relationships: [];
      };
      rivales_jugadores_destacados: {
        Row: {
          id: string;
          rival_id: string;
          nombre: string;
          dorsal: number | null;
          categoria: CategoriaJugadorDestacado;
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rival_id: string;
          nombre: string;
          dorsal?: number | null;
          categoria: CategoriaJugadorDestacado;
          notas?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["rivales_jugadores_destacados"]["Insert"]
        >;
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
          user_id: string | null;
        };
        Insert: {
          id?: string;
          nombre: string;
          email: string;
          mensaje?: string | null;
          fecha_solicitud?: string;
          estado?: EstadoSolicitud;
          user_id?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["solicitudes_acceso"]["Insert"]
        >;
        Relationships: [];
      };
      videos: {
        Row: {
          id: string;
          titulo: string;
          url: string;
          tipo: TipoVideo;
          partido_id: string | null;
          fecha: string;
          notas: string | null;
          created_at: string;
          evento_id: string | null;
          segundo_inicio: number | null;
          segundo_fin: number | null;
        };
        Insert: {
          id?: string;
          titulo: string;
          url: string;
          tipo: TipoVideo;
          partido_id?: string | null;
          fecha?: string;
          notas?: string | null;
          created_at?: string;
          evento_id?: string | null;
          segundo_inicio?: number | null;
          segundo_fin?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["videos"]["Insert"]>;
        Relationships: [];
      };
      videos_sesiones: {
        Row: {
          id: string;
          titulo: string;
          notas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          notas?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["videos_sesiones"]["Insert"]
        >;
        Relationships: [];
      };
      videos_sesion_clips: {
        Row: {
          id: string;
          sesion_id: string;
          video_id: string;
          orden: number;
        };
        Insert: {
          id?: string;
          sesion_id: string;
          video_id: string;
          orden?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["videos_sesion_clips"]["Insert"]
        >;
        Relationships: [];
      };
      horario_entrenamiento: {
        Row: {
          id: string;
          dia_semana: number;
          hora_inicio: string | null;
          hora_fin: string | null;
          lugar: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          dia_semana: number;
          hora_inicio?: string | null;
          hora_fin?: string | null;
          lugar?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["horario_entrenamiento"]["Insert"]
        >;
        Relationships: [];
      };
      recordatorios: {
        Row: {
          id: string;
          texto: string;
          completado: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          texto: string;
          completado?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["recordatorios"]["Insert"]
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
