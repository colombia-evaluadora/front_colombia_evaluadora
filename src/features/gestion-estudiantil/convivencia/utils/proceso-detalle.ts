import type {
  CitacionDTO,
  NotificacionDTO,
} from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha, formatFechaHora12 } from "@/features/gestion-estudiantil/commons/utils/formatos"

/** «14/05/2027 · Confirmada · 17/05/2027, en el portal» (§3 NotificacionDTO). */
export function textoNotificacion(n: NotificacionDTO): string {
  if (n.estado === "POR_CONFIRMAR") return [formatFecha(n.fecha_emision), "Por confirmar"].join(" · ")
  const canal = n.canal === "PORTAL" ? "en el portal" : n.canal === "PRESENCIAL" ? "presencial" : ""
  const cuando = [formatFecha(n.fecha_notificacion ?? n.confirmado_en), canal].filter(Boolean).join(", ")
  return [formatFecha(n.fecha_emision), "Confirmada", cuando].filter(Boolean).join(" · ")
}

/** «18/05/2027 9:00 a. m. · Coordinación · Asistió»; sin fecha, el estado de la citación. */
export function textoCitacion(c: CitacionDTO): string {
  return [
    c.fecha_programada ? formatFechaHora12(c.fecha_programada) : c.estado.nombre,
    c.lugar,
    c.asistencia?.nombre,
  ]
    .filter(Boolean)
    .join(" · ")
}

/** Texto del botón del encabezado según `accion_principal` (código del backend). */
const ACCIONES_PRINCIPALES: Record<string, string> = {
  REGISTRAR_DESCARGOS: "Registrar descargos",
  REGISTRAR_DECISION: "Registrar decisión",
  NOTIFICACION_PRESENCIAL: "Notificación presencial",
  REGISTRAR_RECURSO: "Registrar recurso",
  RESOLVER_RECURSO: "Resolver recurso",
  AJUSTAR_FECHAS: "Ajustar fechas",
  REGISTRAR_CUMPLIMIENTO: "Registrar cumplimiento",
}

export function textoAccionPrincipal(codigo: string): string {
  const conocido = ACCIONES_PRINCIPALES[codigo]
  if (conocido) return conocido
  const texto = codigo.toLowerCase().replace(/_/g, " ")
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Acciones que abren un modal de etapa (las mismas del menú ⋮ del listado, sin «Ver detalle» ni «Anular»). */
export type AccionEtapa = "descargos" | "decision" | "notificar" | "recurso" | "resolver" | "ajustar" | "cumplimiento"

const ETAPA_DE_ACCION_PRINCIPAL: Record<string, AccionEtapa> = {
  REGISTRAR_DESCARGOS: "descargos",
  REGISTRAR_DECISION: "decision",
  NOTIFICACION_PRESENCIAL: "notificar",
  REGISTRAR_RECURSO: "recurso",
  RESOLVER_RECURSO: "resolver",
  AJUSTAR_FECHAS: "ajustar",
  REGISTRAR_CUMPLIMIENTO: "cumplimiento",
}

/** Modal que abre el botón del encabezado según `accion_principal`; `undefined` si el código no se conoce. */
export const etapaDeAccionPrincipal = (codigo: string): AccionEtapa | undefined => ETAPA_DE_ACCION_PRINCIPAL[codigo]
