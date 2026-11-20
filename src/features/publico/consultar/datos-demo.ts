import type { AutorizacionEstablecimiento } from "@/features/autorizacion-datos/api/types"
import type { EstadoOpcion } from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"

/**
 * Inscripciones de ejemplo de Consultar inscripción (U.3) para el modo mock: las sirve el
 * handler MSW de `/eval-col/public/service` con la forma del backend (sso V426). Con el
 * backend real la consulta y la autorización van a los uuids públicos (ver
 * `api/consulta-publica.ts`); elegir, confirmar y anular siguen siendo vista previa.
 */

export type EstadoInscripcionPublica =
  | "INSCRITA"
  | "EN_LISTA_ESPERA"
  | "POR_ELEGIR"
  | "UBICACION_PROPUESTA"
  | "UBICADO"
  | "ADMITIDA"
  | "SIN_CUPO"
  | "ANULADA"

export interface OpcionConsulta {
  /** pk de TINSCRIPCION_OPCION (lo usa Quedarme con esta opción). */
  id?: number
  /** null = opción de redistribución (la propone el establecimiento, no la familia). */
  numero: number | null
  establecimiento: string
  sede: string
  jornada: string
  sorteo: string | null
  posicion: number | null
  estado: EstadoOpcion
  /** Admitida con el cupo reservado. */
  reservada?: boolean
  /** Elegida por la familia entre las admitidas. */
  elegida?: boolean
}

export interface InscripcionConsulta {
  numero: string
  documento: string
  aspirante: string
  grado: string
  /** "2028 · Anual · Ciclo 1" (`fn_grupo_admision_nombre`). */
  grupoAdmision: string
  /** Regla 81: autorización de tratamiento de datos por establecimiento de las opciones. */
  autorizaciones: AutorizacionEstablecimiento[]
  estado: EstadoInscripcionPublica
  /** Fecha límite para elegir o confirmar (texto ya formateado). */
  plazo?: string
  /** Fecha del sorteo, mientras la inscripción sigue abierta. */
  sorteo?: { establecimiento: string; fecha: string }
  opciones: OpcionConsulta[]
  /** Motivos de anulación (lista MOTIVO_ANULACION_INSCRIPCION) para Anular inscripción. */
  motivosAnulacion?: { id: number; nombre: string }[]
}

/** Lista MOTIVO_ANULACION_INSCRIPCION de ejemplo (el backend la manda en la consulta). */
export const MOTIVOS_ANULACION = [
  { id: 1, nombre: "La familia desiste" },
  { id: 2, nombre: "Inscripción duplicada" },
  { id: 3, nombre: "Error en el registro" },
]

const INSCRIPCIONES: InscripcionConsulta[] = [
  {
    numero: "0211",
    documento: "1098456123",
    aspirante: "Tomás Peña Arias",
    grado: "Sexto",
    grupoAdmision: "2028 · Anual · Ciclo 1",
    estado: "POR_ELEGIR",
    plazo: "06/12/2027 10:30",
    autorizaciones: [
      { establecimientoId: 1, establecimiento: "IE Central", autorizado: true },
      { establecimientoId: 4, establecimiento: "IE Norte", autorizado: false },
      { establecimientoId: 5, establecimiento: "IE Sur", autorizado: false },
    ],
    opciones: [
      { numero: 1, establecimiento: "IE Central", sede: "Sede principal", jornada: "Mañana", sorteo: "0140", posicion: 12, estado: "ADMITIDA", reservada: true },
      { numero: 2, establecimiento: "IE Norte", sede: "Sede 2", jornada: "Tarde", sorteo: "0087", posicion: 5, estado: "ADMITIDA", reservada: true },
      { numero: 3, establecimiento: "IE Sur", sede: "Sede principal", jornada: "Mañana", sorteo: "0311", posicion: 4, estado: "EN_LISTA_ESPERA" },
    ],
  },
  {
    numero: "0302",
    documento: "1098555777",
    aspirante: "Valentina Rojas Díaz",
    grado: "Sexto",
    grupoAdmision: "2028 · Anual · Ciclo 1",
    estado: "INSCRITA",
    sorteo: { establecimiento: "IE Central", fecha: "06/12/2027" },
    autorizaciones: [
      { establecimientoId: 1, establecimiento: "IE Central", autorizado: false },
      { establecimientoId: 4, establecimiento: "IE Norte", autorizado: false },
    ],
    opciones: [
      { numero: 1, establecimiento: "IE Central", sede: "Sede principal", jornada: "Mañana", sorteo: null, posicion: null, estado: "PENDIENTE" },
      { numero: 2, establecimiento: "IE Norte", sede: "Sede 2", jornada: "Tarde", sorteo: null, posicion: null, estado: "PENDIENTE" },
    ],
  },
  {
    numero: "0178",
    documento: "1097123456",
    aspirante: "Lina Marcela Ortiz Vega",
    grado: "Sexto",
    grupoAdmision: "2028 · Anual · Ciclo 1",
    estado: "UBICACION_PROPUESTA",
    plazo: "09/12/2027 08:00",
    autorizaciones: [
      { establecimientoId: 1, establecimiento: "IE Central", autorizado: true },
      { establecimientoId: 4, establecimiento: "IE Norte", autorizado: true },
    ],
    opciones: [
      { numero: 1, establecimiento: "IE Central", sede: "Sede principal", jornada: "Tarde", sorteo: "0212", posicion: 31, estado: "NO_ADMITIDA" },
      { numero: 2, establecimiento: "IE Norte", sede: "Sede principal", jornada: "Tarde", sorteo: "0045", posicion: 18, estado: "NO_ADMITIDA" },
      { numero: null, establecimiento: "IE Central", sede: "Sede 2", jornada: "Tarde", sorteo: null, posicion: null, estado: "PENDIENTE" },
    ],
  },
  {
    numero: "0256",
    documento: "1096789012",
    aspirante: "Mariana Villamizar Ortiz",
    grado: "Sexto",
    grupoAdmision: "2028 · Anual · Ciclo 1",
    estado: "UBICADO",
    autorizaciones: [
      { establecimientoId: 4, establecimiento: "IE Norte", autorizado: true },
      { establecimientoId: 1, establecimiento: "IE Central", autorizado: true },
    ],
    opciones: [
      { numero: 1, establecimiento: "IE Norte", sede: "Sede principal", jornada: "Mañana", sorteo: null, posicion: null, estado: "NO_ADMITIDA" },
      { numero: null, establecimiento: "IE Central", sede: "Sede 2", jornada: "Mañana", sorteo: null, posicion: null, estado: "ADMITIDA", reservada: true },
    ],
  },
]

// Id de cada opción (pk de TINSCRIPCION_OPCION en el backend real).
INSCRIPCIONES.forEach((i, a) => i.opciones.forEach((o, b) => (o.id = (a + 1) * 10 + b)))

/** Las combinaciones de ejemplo, para mostrarlas en la vista previa. */
export const EJEMPLOS_DEMO = INSCRIPCIONES.map((i) => ({ numero: i.numero, documento: i.documento, estado: i.estado }))

/** Copia profunda: las acciones de la vista previa modifican la inscripción en pantalla. */
export function buscarInscripcionDemo(numero: string, documento: string): InscripcionConsulta | null {
  const encontrada = INSCRIPCIONES.find((i) => i.numero === numero.trim() && i.documento === documento.trim())
  return encontrada ? structuredClone(encontrada) : null
}


/** La inscripción de ejemplo sin copiar: el mock de autorizar la modifica en memoria. */
export function inscripcionDemoOriginal(numero: string, documento: string): InscripcionConsulta | null {
  return INSCRIPCIONES.find((i) => i.numero === numero.trim() && i.documento === documento.trim()) ?? null
}
