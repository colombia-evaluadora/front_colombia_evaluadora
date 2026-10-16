/**
 * Tipos del centro de notificaciones (OpenSpec `add-notificaciones-centro` y
 * `add-notificaciones-preferencias`).
 *
 * El backend (`notification-service`, D-2.2) todavía NO existe: el esquema
 * está pendiente de aprobación (pregunta abierta 1). La forma snake_case de
 * las filas (`*Row`) es el contrato congelado en el design.md del change y la
 * que sirve el mock de MSW; el front mapea a camelCase en los archivos de
 * query, igual que con eval-col, para que cambiar al backend real sea solo
 * apagar los mocks.
 */

/** Categorías del catálogo inicial (PLAN-comunicaciones §11.3). */
export const CATEGORIAS_NOTIFICACION = [
  "CHAT",
  "LLAMADAS",
  "PLANEADOR",
  "ASISTENCIA",
  "INFORMES",
  "ESTABLECIMIENTO",
  "SISTEMA",
] as const
export type CategoriaNotificacion = (typeof CATEGORIAS_NOTIFICACION)[number]

export const PRIORIDADES_NOTIFICACION = ["NORMAL", "ALTA", "URGENTE_INSTITUCIONAL"] as const
export type PrioridadNotificacion = (typeof PRIORIDADES_NOTIFICACION)[number]

/** Estado de lectura tal como viaja en `?estado=` (URL y query string del GET). */
export const ESTADOS_LECTURA = ["no-leidas", "leidas"] as const
export type EstadoLectura = (typeof ESTADOS_LECTURA)[number]

// ── Filas del backend (snake_case) ──────────────────────────────────────────

export interface NotificacionRow {
  id: string
  tipo: string
  categoria: CategoriaNotificacion
  titulo: string
  cuerpo_corto: string | null
  deep_link: string | null
  prioridad: PrioridadNotificacion
  creada_en: string
  leida_en: string | null
  /** Agrupación en escritura (D-2.4): actores y conteo de la entrada agrupada. */
  actores: string[] | null
  conteo: number | null
}

/** `GET /notificaciones?cursor&limit&tipo&categoria&estado` (D-2.3). */
export interface NotificacionesPageRow {
  items: NotificacionRow[]
  /** Cursor opaco `<creada_en>,<id>` de la siguiente página; `null` al final. */
  next_cursor: string | null
}

/** `GET /notificaciones/contador`. */
export interface ContadorRow {
  no_leidas: number
}

export interface PreferenciaTipoRow {
  tipo: string
  categoria: CategoriaNotificacion
  etiqueta: string
  /** D-3.1: siempre `true`; la bandeja no se puede apagar. */
  in_app: true
  push: boolean
  email: boolean
  /** Si el tipo admite silenciarse (los urgentes institucionales no). */
  silenciable: boolean
  /** Piso institucional (D-3.3): el canal lo fija la institución. */
  push_bloqueado: boolean
  email_bloqueado: boolean
  silenciado_hasta: string | null
}

export interface HorarioSilenciosoRow {
  activo: boolean
  /** `HH:mm` en la zona del establecimiento. */
  desde: string
  hasta: string
  /** Días 1-7 con domingo = 1 (convención del backend, ver `date-picker`). */
  dias: number[]
  zona: string
  /** Piso institucional: el usuario no puede apagarlo ni acortarlo. */
  bloqueado: boolean
}

/** `GET /notificaciones/preferencias`: la matriz ya resuelta (D-3.2). */
export interface PreferenciasRow {
  tipos: PreferenciaTipoRow[]
  horario_silencioso: HorarioSilenciosoRow
}

/** `PUT /notificaciones/preferencias`: solo lo que el usuario controla. */
export interface PreferenciasPayload {
  tipos: { tipo: string; push: boolean; email: boolean }[]
  horario_silencioso: { activo: boolean; desde: string; hasta: string; dias: number[] }
}

// ── Dominio (camelCase) ─────────────────────────────────────────────────────

export interface Notificacion {
  id: string
  tipo: string
  categoria: CategoriaNotificacion
  titulo: string
  cuerpo: string
  /** Ya validado: siempre una ruta interna `/app/...` (ver `lib/deep-link.ts`). */
  deepLink: string
  prioridad: PrioridadNotificacion
  creadaEn: string
  leida: boolean
  actores: string[]
  conteo: number
}

export interface NotificacionesPage {
  items: Notificacion[]
  nextCursor: string | null
}

export interface NotificacionesFiltros {
  categoria?: CategoriaNotificacion
  estado?: EstadoLectura
  texto?: string
}

export interface PreferenciaTipo {
  tipo: string
  categoria: CategoriaNotificacion
  etiqueta: string
  push: boolean
  email: boolean
  silenciable: boolean
  pushBloqueado: boolean
  emailBloqueado: boolean
  silenciadoHasta: string | null
}

export interface HorarioSilencioso {
  activo: boolean
  desde: string
  hasta: string
  dias: number[]
  zona: string
  bloqueado: boolean
}

export interface Preferencias {
  tipos: PreferenciaTipo[]
  horarioSilencioso: HorarioSilencioso
}
