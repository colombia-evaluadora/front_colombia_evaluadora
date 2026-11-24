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
  /** El archivo guardado cambió después de archivar: la huella no coincide (S.12.HIS.1a). */
  alterado?: boolean
}

/** Fuentes que el back sabe leer (TCONSERVACION_FUENTE, V591). */
export const FUENTES_MOCK = ["observador", "casos de convivencia", "convivencia"]

/** Módulos = grupos raíz del menú mock (Sección 4.1). */
export const modulosDb = [
  { pkModulo: 6, nombre: "Gestión estudiantil" },
  { pkModulo: 7, nombre: "Gestión académica" },
  { pkModulo: 8, nombre: "Comunicaciones" },
  { pkModulo: 9, nombre: "Administración" },
]

/** Archivar disponible por defecto (S.12.VEN.1). Para ver «Archivar no disponible» (S.12.VEN.2), ver `almacenamientoDisponible`. */
export const conservacionConfigDb = { almacenamientoArchivo: true }

/**
 * El almacenamiento del archivo histórico responde, salvo que se simule su caída con
 * `sessionStorage.setItem("msw:sin-almacenamiento", "1")` y recargar (como `msw:fault`).
 */
export function almacenamientoDisponible() {
  const caido = typeof sessionStorage !== "undefined" && sessionStorage.getItem("msw:sin-almacenamiento") != null
  return conservacionConfigDb.almacenamientoArchivo && !caido
}

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

const ASUNTOS = ["Reunión de padres", "Llegada tarde", "Salida pedagógica", "Entrega de boletines"]

const registros = (n: number, tipo: string, anio: number, vence: string): RegistroVencido[] =>
  Array.from({ length: n }, (_, i) => ({
    registro: `${tipo} · ${ASUNTOS[i % ASUNTOS.length]}`,
    fechaRegistro: `${anio}-${String((i % 9) + 2).padStart(2, "0")}-${String((i % 25) + 3).padStart(2, "0")}`,
    estudiante: estudiantes[i % estudiantes.length][0],
    documento: String(1098765432 + i),
    anio,
    vencidoDesde: vence,
  }))

export const vencidosDb: VencidoRecord[] = [
  ...(ee2 ? [{ pkPolitica: 1, pkEstablecimiento: ee2.id, registros: registros(14, "Anotación", 2019, "2026-02-04") }] : []),
  ...(ee1 ? [{ pkPolitica: 3, pkEstablecimiento: ee1.id, registros: registros(23, "Mensaje", 2024, "2026-03-10") }] : []),
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
      // El último quedó alterado, para ver el aviso de huella que no coincide.
      alterado: i === estudiantes.length - 1,
    }))
  : []

/** Actas subidas en el mock (Disponer), por pk de TARCHIVO. */
export const actasDb = new Map<number, string>([[990001, "acta-disposicion-mensajes.pdf"]])
