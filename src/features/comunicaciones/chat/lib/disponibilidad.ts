import type { EstadoDisponibilidad } from "@/features/comunicaciones/chat/api/types"
import type { PerfilChat } from "@/features/comunicaciones/chat/lib/politica-chat"

/**
 * Estado de disponibilidad del chat (comms-service, V560 `comunicaciones.tdisponibilidad`).
 *
 * - El usuario elige En línea, Ausente, Ocupado o Invisible; el servidor lo guarda y lo valida
 *   (solo el propio).
 * - Tras `INACTIVIDAD_MS` sin usar la pestaña se avisa por el socket (`inactivo`); con todas sus
 *   pestañas inactivas el servidor pasa En línea → Ausente (origen AUTO) y la actividad lo devuelve.
 *   Lo que el usuario fijó a mano no lo cambia la actividad.
 * - Los demás ven DESCONECTADO si no hay socket, si eligió Invisible o si su perfil no está en
 *   `visiblePara`. El servidor ya manda el estado filtrado: aquí solo se pinta.
 */

/** Por defecto: 10 minutos (el servidor manda el suyo en `inactividadMinutos`). */
export const INACTIVIDAD_MS = 10 * 60_000

export const ESTADOS_ELEGIBLES = ["EN_LINEA", "AUSENTE", "OCUPADO", "INVISIBLE"] as const

export const PERFILES_VISIBILIDAD: { valor: PerfilChat; etiqueta: string }[] = [
  { valor: "DIRECTIVO", etiqueta: "Directivos" },
  { valor: "DOCENTE", etiqueta: "Docentes" },
  { valor: "ACUDIENTE", etiqueta: "Acudientes" },
  { valor: "ESTUDIANTE", etiqueta: "Estudiantes" },
]

export const MAX_RESPUESTA_AUTOMATICA = 500

export const ETIQUETA_DISPONIBILIDAD: Record<EstadoDisponibilidad, string> = {
  EN_LINEA: "En línea",
  AUSENTE: "Ausente",
  OCUPADO: "Ocupado",
  INVISIBLE: "Invisible",
  DESCONECTADO: "Desconectado",
}

export const DESCRIPCION_DISPONIBILIDAD: Record<(typeof ESTADOS_ELEGIBLES)[number], string> = {
  EN_LINEA: "Pasa a Ausente tras un rato sin actividad.",
  AUSENTE: "Quien te escriba por directo verá tu respuesta automática.",
  OCUPADO: "Los avisos del chat llegan sin sonido ni notificación push.",
  INVISIBLE: "Te ven desconectado; puedes seguir usando el chat.",
}

/** Color del punto (tokens del tema). Desconectado no lleva punto. */
export const CLASE_DISPONIBILIDAD: Record<EstadoDisponibilidad, string> = {
  EN_LINEA: "bg-green",
  AUSENTE: "bg-yellow",
  OCUPADO: "bg-red",
  INVISIBLE: "border-2 border-muted-foreground bg-card",
  DESCONECTADO: "",
}

const ESTADOS = new Set<string>(["EN_LINEA", "AUSENTE", "OCUPADO", "INVISIBLE", "DESCONECTADO"])

/**
 * Estado de un evento `presencia.actualizada` o de una fila: `estado` si viene (comms-service con
 * V560), si no `enLinea` (mock y servidores anteriores).
 */
export function estadoDe(dato: { estado?: unknown; disponibilidad?: unknown; enLinea?: boolean } | null | undefined):
  | EstadoDisponibilidad
  | undefined {
  if (!dato) return undefined
  const e = dato.disponibilidad ?? dato.estado
  if (typeof e === "string" && ESTADOS.has(e)) return e as EstadoDisponibilidad
  if (typeof dato.enLinea === "boolean") return dato.enLinea ? "EN_LINEA" : "DESCONECTADO"
  return undefined
}

/** Se pinta el punto (los desconectados no llevan, como antes). */
export const conPunto = (estado: EstadoDisponibilidad | undefined): estado is EstadoDisponibilidad =>
  !!estado && estado !== "DESCONECTADO"

/**
 * Detector de inactividad puro: dada la última actividad y si la pestaña está visible, ¿cuenta como
 * inactiva? Una pestaña oculta cuenta desde que se ocultó (la última actividad).
 */
export function estaInactivo(ultimaActividad: number, ahora: number, umbralMs: number): boolean {
  return ahora - ultimaActividad >= umbralMs
}
