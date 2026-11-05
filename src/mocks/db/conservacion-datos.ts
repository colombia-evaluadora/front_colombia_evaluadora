import type {
  Archivado,
  CuentaDesde,
  Disposicion,
  RegistroVencido,
} from "@/features/administration/conservacion-datos/api/types"
import { establishmentsRowsDb } from "@/mocks/db/establishments"

// Réplica de TCONSERVACION_* (V589). El back arranca vacío (sin políticas nada
// vence); el mock trae los ejemplos de los prototipos para que la vista se vea.

export interface PoliticaRecord {
  pkPolitica: number
  tipoRegistro: string
  pkModulo: number
  permanente: boolean
  plazoMinimo: number | null
  cuentaDesde: CuentaDesde | null
  disposicion: Disposicion | null
  habilitado: boolean
}

export interface AmpliacionRecord {
  pkAmpliacion: number
  pkPolitica: number
  pkEstablecimiento: number
  plazo: number
}

export interface VencidoRecord {
  pkPolitica: number
  pkEstablecimiento: number
  registros: RegistroVencido[]
}

export interface ArchivoRecord extends Archivado {
  pkEstablecimiento: number
  fkTarchivoActa: number
  /** Contenido del archivo; la huella se calcula al descargar. */
  contenido: string
}

/** Fuentes que el back sabe leer (TCONSERVACION_FUENTE, V591). */
export const FUENTES_MOCK = ["observador", "casos de convivencia", "convivencia"]

/** Módulos = grupos raíz del menú mock (Sección 4.1). */
export const modulosDb = [
  { pkModulo: 6, nombre: "Gestión Estudiantil" },
  { pkModulo: 7, nombre: "Gestión Académica" },
  { pkModulo: 8, nombre: "Comunicaciones" },
  { pkModulo: 9, nombre: "Administración" },
]

export const conservacionConfigDb = { almacenamientoArchivo: false }

export const politicasDb: PoliticaRecord[] = [
  { pkPolitica: 1, tipoRegistro: "Observador", pkModulo: 6, permanente: false, plazoMinimo: 5, cuentaDesde: "RETIRO_EGRESO", disposicion: "ANONIMIZAR", habilitado: true },
  { pkPolitica: 2, tipoRegistro: "Historia académica", pkModulo: 7, permanente: true, plazoMinimo: null, cuentaDesde: null, disposicion: null, habilitado: true },
  { pkPolitica: 3, tipoRegistro: "Mensajes", pkModulo: 8, permanente: false, plazoMinimo: 2, cuentaDesde: "CREACION", disposicion: "ARCHIVAR", habilitado: true },
  { pkPolitica: 4, tipoRegistro: "Casos de convivencia", pkModulo: 6, permanente: false, plazoMinimo: 5, cuentaDesde: "CIERRE_ANIO", disposicion: "ANONIMIZAR", habilitado: false },
]

const [ee1, ee2] = establishmentsRowsDb

export const ampliacionesDb: AmpliacionRecord[] = ee1
  ? [{ pkAmpliacion: 1, pkPolitica: 1, pkEstablecimiento: ee1.id, plazo: 8 }]
  : []

const estudiantes = [
  ["Ana Sofía Pérez Gómez", "1098765432"],
  ["Luis Felipe Díaz Ruiz", "1098765433"],
  ["Valentina Mora Quintero", "1098765434"],
  ["Mateo Rincón Salazar", "1098765435"],
]

const registros = (n: number, anio: number, vence: string): RegistroVencido[] =>
  Array.from({ length: n }, (_, i) => ({
    estudiante: estudiantes[i % estudiantes.length][0],
    documento: String(1098765432 + i),
    anio,
    vencidoDesde: vence,
  }))

export const vencidosDb: VencidoRecord[] = [
  ...(ee2 ? [{ pkPolitica: 1, pkEstablecimiento: ee2.id, registros: registros(14, 2019, "2026-02-04") }] : []),
  ...(ee1 ? [{ pkPolitica: 3, pkEstablecimiento: ee1.id, registros: registros(23, 2024, "2026-03-10") }] : []),
]

export const archivoDb: ArchivoRecord[] = ee1
  ? estudiantes.map(([estudiante, documento], i) => ({
      pkArchivo: i + 1,
      tipoRegistro: "Mensajes",
      estudiante,
      documento,
      anio: 2023,
      establecimiento: ee1.name,
      pkEstablecimiento: ee1.id,
      fechaDisposicion: "2026-03-10",
      fkTarchivoActa: 990001,
      contenido: `Archivo de solo lectura de ${estudiante} (mock).`,
    }))
  : []

/** Actas subidas en el mock (Disponer), por pk de TARCHIVO. */
export const actasDb = new Map<number, string>([[990001, "acta-disposicion-mensajes.pdf"]])
