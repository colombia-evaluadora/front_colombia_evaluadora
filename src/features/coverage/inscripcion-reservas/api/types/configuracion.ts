// Configuración de Inscripción y reservas (Cobertura Educativa, Sección 3.7).

export type ModoAdmision = "MANUAL" | "AUTOMATICA"
export type ModoTraslado = "MANUAL" | "AUTOMATICA"
export type DesempateConfig = "SORTEO" | "ORDEN_INSCRIPCION"

/** Un grupo por Año, Modalidad y Ciclo; se crea solo con sus períodos. */
export interface GrupoAdmisionConfig {
  id: string
  anio: number
  modalidad: string
  ciclo: number
  establecimiento: string
  /** "Sede · Jornada" de cada período del grupo. */
  periodos: string[]
  fechaCierre: string | null
  /** Menor Fecha límite de matrícula entre los períodos: tope de la fecha de cierre. */
  menorFechaLimiteMatricula: string
  modoAdmision: ModoAdmision
  /** Ids de criterios activos, en orden de prioridad. */
  criterios: string[]
  desempate: DesempateConfig
  /** Ids de documentos requeridos para admitir. */
  documentosRequeridos: string[]
  /** Después del sorteo o de la primera admisión no se cambian criterios ni desempate. */
  bloqueado: boolean
  configurado: boolean
}

/** Uno por sede y jornada; se crea solo con el período académico. */
export interface PeriodoInscripcionConfig {
  id: string
  establecimiento: string
  sede: string
  anio: number
  jornada: string
  modalidad: string
  ciclo: number
  grupoAdmisionId: string
  grupoAdmision: string
  fechaLiberacionReservas: string | null
  modoTraslado: ModoTraslado
  plazoRespuestaTraslado: number
  requiereConfirmacionAcudiente: boolean
  /** Topes de la fecha de liberación. */
  fechaCierreInscripcion: string | null
  fechaLimiteMatricula: string
}

export interface CatalogosConfiguracion {
  criterios: { id: string; nombre: string }[]
  documentos: { id: string; nombre: string }[]
}

/** Resultado de Copiar configuración: dónde se copió y dónde no, con el motivo. */
export interface ResultadoCopia {
  copiados: { id: string; periodo: string }[]
  noCopiados: { id: string; periodo: string; motivo: string }[]
}

export type ModificarGrupoInput = Pick<
  GrupoAdmisionConfig,
  "id" | "fechaCierre" | "modoAdmision" | "criterios" | "desempate" | "documentosRequeridos"
>

export type ModificarPeriodoInput = Pick<
  PeriodoInscripcionConfig,
  | "id"
  | "fechaLiberacionReservas"
  | "modoTraslado"
  | "plazoRespuestaTraslado"
  | "requiereConfirmacionAcudiente"
>
