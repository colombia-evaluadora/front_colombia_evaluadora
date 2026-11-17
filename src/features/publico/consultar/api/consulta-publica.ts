import { api } from "@/lib/api-client"

import type { AutorizacionEstablecimiento } from "@/features/autorizacion-datos/api/types"
import { toAutorizaciones } from "@/features/autorizacion-datos/lib/autorizaciones"
import type { EstadoOpcion } from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"
import type {
  EstadoInscripcionPublica,
  InscripcionConsulta,
  OpcionConsulta,
} from "@/features/publico/consultar/datos-demo"

/**
 * Consultar inscripción sin sesión (U.3, sso V426): filas públicas de query-service por
 * `POST /eval-col/public/service`, sin ruta propia. El gate es número + documento del
 * aspirante + el código de 6 dígitos que llega al correo del acudiente (15 min, uno por
 * minuto, 5 intentos). El backend nunca dice si la inscripción existe (Regla 31).
 */
export const PUBLIC_SERVICE_PATH = "/eval-col/public/service"

export const UUID_CODIGO = "eval-col-inscripcion-publica-codigo-v1"
export const UUID_CONSULTAR = "eval-col-inscripcion-publica-consultar-v1"
export const UUID_AUTORIZAR = "eval-col-inscripcion-publica-autorizar-v1"

export interface CredencialesConsulta {
  numero: string
  documento: string
  codigo: string
}

/** Respuesta de `/public/service`: `[{ datos }]`; tolera también `{ rows: [{ datos }] }`. */
export function datosDePublicService<T>(body: unknown): T | null {
  const filas = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { rows?: unknown }).rows)
      ? (body as { rows: unknown[] }).rows
      : []
  const fila = filas[0] as { datos?: T } | undefined
  return fila?.datos ?? null
}

async function publicService<T>(uuid: string, params: Record<string, unknown>): Promise<T | null> {
  return datosDePublicService<T>(await api.post<unknown>(PUBLIC_SERVICE_PATH, { uuid, params }))
}

/** Pide el código. Siempre `{enviado:true}`, coincidan o no los datos. */
export async function pedirCodigoConsulta(numero: string, documento: string): Promise<void> {
  await publicService(UUID_CODIGO, { "BODY.NUMERO": numero.trim(), "BODY.DOCUMENTO": documento.trim() })
}

const ESTADOS_PUBLICOS: EstadoInscripcionPublica[] = [
  "INSCRITA",
  "EN_LISTA_ESPERA",
  "POR_ELEGIR",
  "UBICACION_PROPUESTA",
  "UBICADO",
  "ADMITIDA",
  "SIN_CUPO",
  "ANULADA",
]

/** Opción tal como la devuelve `fn_inscripcion_detalle_restringido_interno -> 'opciones'`. */
interface OpcionPublicaRow {
  preferencia?: number | null
  numero?: number | null
  grado?: string | null
  establecimientoId?: number | null
  establecimiento: string
  sede: string
  jornada: string
  numeroSorteo?: number | string | null
  sorteo?: string | null
  posicion?: number | null
  estado: EstadoOpcion
  reservada?: boolean
  elegida?: boolean
}

export interface ConsultaPublicaDatos {
  encontrada: boolean
  mensaje?: string
  numeroInscripcion?: string
  estado?: string
  aspirante?: string
  grupoAdmision?: string | null
  opciones?: OpcionPublicaRow[] | null
  autorizaciones?: unknown
  // Solo la vista previa (MSW) los manda: plazos y fecha del sorteo.
  plazo?: string
  sorteo?: { establecimiento: string; fecha: string }
}

const sorteoDe = (o: OpcionPublicaRow) => {
  const n = o.numeroSorteo ?? o.sorteo
  return n == null || n === "" ? null : String(n).padStart(4, "0")
}

export function toOpcionConsulta(o: OpcionPublicaRow): OpcionConsulta {
  return {
    numero: o.preferencia ?? o.numero ?? null,
    establecimiento: o.establecimiento,
    sede: o.sede,
    jornada: o.jornada,
    sorteo: sorteoDe(o),
    posicion: o.posicion ?? null,
    estado: o.estado,
    reservada: o.reservada,
    elegida: o.elegida,
  }
}

/** Respuesta encontrada → modelo de la pantalla. */
export function toInscripcionConsulta(d: ConsultaPublicaDatos, documento: string): InscripcionConsulta {
  const opciones = d.opciones ?? []
  const estado = ESTADOS_PUBLICOS.includes(d.estado as EstadoInscripcionPublica)
    ? (d.estado as EstadoInscripcionPublica)
    : "INSCRITA"
  return {
    numero: d.numeroInscripcion ?? "",
    documento,
    aspirante: d.aspirante ?? "",
    grado: opciones.find((o) => o.grado)?.grado ?? "",
    grupoAdmision: d.grupoAdmision ?? "",
    estado,
    plazo: d.plazo,
    sorteo: d.sorteo,
    opciones: opciones.map(toOpcionConsulta),
    autorizaciones: toAutorizaciones(d.autorizaciones),
  }
}

export type ResultadoConsulta =
  | { encontrada: true; inscripcion: InscripcionConsulta }
  | { encontrada: false; mensaje: string }

export const MENSAJE_NO_ENCONTRADA =
  "Los datos no coinciden o el código no es correcto. Revíselos e intente de nuevo."

export async function consultarInscripcion(c: CredencialesConsulta): Promise<ResultadoConsulta> {
  const d = await publicService<ConsultaPublicaDatos>(UUID_CONSULTAR, {
    "BODY.NUMERO": c.numero.trim(),
    "BODY.DOCUMENTO": c.documento.trim(),
    "BODY.CODIGO": c.codigo,
  })
  if (!d?.encontrada) return { encontrada: false, mensaje: d?.mensaje || MENSAJE_NO_ENCONTRADA }
  return { encontrada: true, inscripcion: toInscripcionConsulta(d, c.documento.trim()) }
}

/** Autoriza con el mismo código; tira con el `mensaje` si el código ya no vale. */
export async function autorizarConsultaPublica(
  c: CredencialesConsulta,
  establecimientos: number[],
): Promise<AutorizacionEstablecimiento[]> {
  const d = await publicService<{ encontrada: boolean; mensaje?: string; autorizaciones?: unknown }>(UUID_AUTORIZAR, {
    "BODY.NUMERO": c.numero.trim(),
    "BODY.DOCUMENTO": c.documento.trim(),
    "BODY.CODIGO": c.codigo,
    "BODY.ESTABLECIMIENTOS": establecimientos,
  })
  if (!d?.encontrada) throw new Error(d?.mensaje || "El código venció. Pida uno nuevo y consulte otra vez para autorizar.")
  return toAutorizaciones(d.autorizaciones)
}
