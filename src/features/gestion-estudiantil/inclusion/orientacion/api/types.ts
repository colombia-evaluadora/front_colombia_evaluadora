export interface OrientacionFiltros {
  sede: string
  jornada: string
  motivo: string
  estado: string
  origen: string
}
export const FILTROS_VACIOS: OrientacionFiltros = { sede: "", jornada: "", motivo: "", estado: "", origen: "" }

export interface RemisionRow {
  id: number
  fecha: string
  fk_tmatricula: number
  estudiante_nombre: string
  grado_grupo: string
  fk_tlv_motivo: number
  motivo_nombre: string
  remite_nombre: string | null
  estado_codigo: string
  estado_nombre: string
  fk_torientacion_atencion: number | null
  total_count: number
}

export interface AtencionRow {
  id: number
  fecha: string
  fk_tmatricula: number
  estudiante_nombre: string
  grado_grupo: string
  modalidad_nombre: string
  origen_nombre: string
  motivo_nombre: string
  proxima_cita: string | null
  total_count: number
}

export interface RemisionExterna {
  id: number
  entidad: { id: number; nombre: string }
  motivo: string
  fecha: string
  respuesta: string | null
  fecha_respuesta: string | null
}

export interface AtencionDetalle {
  id: number
  fecha: string
  estudiante: { fk_tmatricula: number; nombre: string; grado_grupo: string }
  modalidad: { id: number; codigo: string }
  origen: { id: number; codigo: string }
  remision_origen: { id: number; fecha: string; remite: string | null } | null
  motivo: { id: number; nombre: string }
  comportamiento_casa: string | null
  relacion_familiares: string | null
  estrategias_disciplinarias: string | null
  trabajo_realizado: string | null
  pruebas_aplicadas: string | null
  compromisos: string | null
  recomendaciones_familia: string | null
  recomendaciones_docente: string | null
  proxima_cita: string | null
  remisiones_externas: RemisionExterna[]
  anulacion: { anulado_en: string; motivo: string } | null
}
