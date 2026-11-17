import type { EstadoOpcion } from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"

/**
 * Datos de la VISTA PREVIA de Consultar inscripción (U.3).
 *
 * El backend todavía no expone la consulta pública (sin sesión) ni el envío del
 * código, la elección del cupo, la confirmación de la ubicación ni la
 * anulación. Mientras tanto la vista trabaja con estas inscripciones de
 * ejemplo y las acciones solo cambian el estado en pantalla. Cuando exista el
 * servicio, `buscarInscripcionDemo` se reemplaza por la consulta real.
 */

export type EstadoInscripcionPublica =
  | "INSCRITA"
  | "POR_ELEGIR"
  | "UBICACION_PROPUESTA"
  | "UBICADO"
  | "ADMITIDA"
  | "SIN_CUPO"
  | "ANULADA"

export interface OpcionConsulta {
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
  anio: number
  modalidad: string
  correoAcudiente: string
  estado: EstadoInscripcionPublica
  /** Fecha límite para elegir o confirmar (texto ya formateado). */
  plazo?: string
  /** Fecha del sorteo, mientras la inscripción sigue abierta. */
  sorteo?: { establecimiento: string; fecha: string }
  opciones: OpcionConsulta[]
}

export const MOTIVOS_ANULACION = [
  "La familia desiste",
  "Consiguió cupo en otro establecimiento",
  "Cambio de municipio",
  "Otro",
]

const INSCRIPCIONES: InscripcionConsulta[] = [
  {
    numero: "0211",
    documento: "1098456123",
    aspirante: "Tomás Peña Arias",
    grado: "Sexto",
    anio: 2028,
    modalidad: "Anual",
    correoAcudiente: "diana.arias@gmail.com",
    estado: "POR_ELEGIR",
    plazo: "06/12/2027 10:30",
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
    anio: 2028,
    modalidad: "Anual",
    correoAcudiente: "carlos.rojas@hotmail.com",
    estado: "INSCRITA",
    sorteo: { establecimiento: "IE Central", fecha: "06/12/2027" },
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
    anio: 2028,
    modalidad: "Anual",
    correoAcudiente: "marcela.vega@gmail.com",
    estado: "UBICACION_PROPUESTA",
    plazo: "09/12/2027 08:00",
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
    anio: 2028,
    modalidad: "Anual",
    correoAcudiente: "jorge.villamizar@yahoo.com",
    estado: "UBICADO",
    opciones: [
      { numero: 1, establecimiento: "IE Norte", sede: "Sede principal", jornada: "Mañana", sorteo: null, posicion: null, estado: "NO_ADMITIDA" },
      { numero: null, establecimiento: "IE Central", sede: "Sede 2", jornada: "Mañana", sorteo: null, posicion: null, estado: "ADMITIDA", reservada: true },
    ],
  },
]

/** Las combinaciones de ejemplo, para mostrarlas en la vista previa. */
export const EJEMPLOS_DEMO = INSCRIPCIONES.map((i) => ({ numero: i.numero, documento: i.documento, estado: i.estado }))

/** Copia profunda: las acciones de la vista previa modifican la inscripción en pantalla. */
export function buscarInscripcionDemo(numero: string, documento: string): InscripcionConsulta | null {
  const encontrada = INSCRIPCIONES.find((i) => i.numero === numero.trim() && i.documento === documento.trim())
  return encontrada ? structuredClone(encontrada) : null
}

/** Correo del acudiente de la inscripción, si los datos coinciden (para el aviso enmascarado). */
export function correoDemo(numero: string, documento: string) {
  return buscarInscripcionDemo(numero, documento)?.correoAcudiente ?? null
}
