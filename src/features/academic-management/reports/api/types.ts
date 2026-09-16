export type PeriodoId = 1 | 2 | 3 | 4

export interface PeriodoOption {
  id: PeriodoId
  label: string
}

export interface NotasPeriodo {
  promedio: number
  puesto: number
  areasPerdidas: number
  recuperaciones: number
  asignaturas: Record<string, number>
  confirmado: boolean
}

export interface EstudianteInforme {
  id: number
  documento: string
  nombreCompleto: string
  jornada?: string
  notasPorPeriodo: Partial<Record<PeriodoId, NotasPeriodo>>
  observacionesPorPeriodo?: Partial<Record<PeriodoId, string>>
}

export interface GrupoInforme {
  id: number
  nombre: string
  preescolar?: boolean
  estudiantes: EstudianteInforme[]
}

export interface ColumnaAsignatura {
  key: string
  label: string
  descripcion: string
}

export interface DocenteConCambioPendiente {
  id: number
  nombreDocente: string
  asignatura: string
  gradoGrupo: string
}

export interface CambiosPendientesInfo {
  totalDocentes: number
  grupos: DocenteConCambioPendiente[]
}

export interface HistorialCambio {
  id: number
  grupoNombre: string
  asignatura: string
  tendencia: "subio" | "bajo"
  periodo: PeriodoId
  fecha: string
  hora: string
  cantidadCambios: number
  usuario: string
}
