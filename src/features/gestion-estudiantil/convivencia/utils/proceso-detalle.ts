import type {
  CitacionDTO,
  NotificacionDTO,
  PersonaDTO,
} from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"

const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y"])

/**
 * «Carolina Medina» → «C. Medina»: inicial del primer nombre + primer apellido. El backend solo
 * da el nombre completo (nombres y luego apellidos): con 2 o 3 palabras el apellido es la 2.ª;
 * con 4 o más, la penúltima. Las partículas («de», «del», «de la», «y») se unen al apellido.
 */
export function abreviarPersona(p: PersonaDTO | string | null | undefined): string {
  const nombre = (typeof p === "string" ? p : p?.nombre)?.trim()
  if (!nombre) return ""
  const palabras = nombre.split(/\s+/)
  if (palabras.length === 1) return palabras[0]
  const apellido = palabras.length <= 3 ? 1 : palabras.length - 2
  let inicio = apellido
  while (inicio > 1 && PARTICULAS.has(palabras[inicio - 1].toLowerCase())) inicio--
  return `${palabras[0][0]}. ${palabras.slice(inicio, apellido + 1).join(" ")}`
}

/** `2027-05-18T09:00:00` → «18/05/2027 9:00 a. m.» (hora de Colombia tal cual, sin zona). */
export function formatFechaHora12(valor: string | null | undefined): string {
  if (!valor) return ""
  const [fecha, hora] = valor.split("T")
  if (!hora) return formatFecha(fecha)
  const [hh, mm] = hora.split(":").map(Number)
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return `${formatFecha(fecha)} ${h12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "a. m." : "p. m."}`
}

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
