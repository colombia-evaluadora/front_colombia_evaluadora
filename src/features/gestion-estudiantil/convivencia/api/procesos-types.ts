/** Contrato de «Proceso disciplinario - DTOs.md» (3.5): listado (§1) y tipos de detalle y modales (§2-§5). */

export type EstadoProcesoCodigo =
  | "EN_DESCARGOS"
  | "POR_DECIDIR"
  | "DECIDIDO"
  | "EN_RECURSO"
  | "EN_FIRME"
  | "ARCHIVADO"
  | "CERRADO"
  | "ANULADO"

export type ProximoVencimientoTipo = "PLAZO_DESCARGOS" | "PLAZO_RECURSOS" | "FIN_SANCION"

/** Los `puede_*` combinan estado efectivo y rol: el front no repite reglas. */
export interface ProcesoAcciones {
  puede_ver_detalle: boolean
  puede_descargos: boolean
  puede_no_presentar: boolean
  puede_decidir: boolean
  puede_notificar: boolean
  puede_recurso: boolean
  puede_resolver: boolean
  puede_ajustar: boolean
  puede_cumplimiento: boolean
  puede_anular: boolean
}

/** Una fila de `POST /procesos/query`. */
export interface ProcesoRow extends ProcesoAcciones {
  id: number
  numero: string
  fecha_apertura: string
  fk_tmatricula: number
  estudiante_nombre: string
  grado_grupo: string | null
  fk_tsede: number
  sede_nombre: string
  fk_tlv_jornada: number
  jornada_nombre: string
  cargos: number
  fk_tfuncionario_responsable: number | null
  responsable_nombre: string | null
  fk_tlv_estado: number
  estado_codigo: EstadoProcesoCodigo
  estado_nombre: string
  proximo_vencimiento: string | null
  proximo_vencimiento_tipo: ProximoVencimientoTipo | null
  proximo_vencimiento_detalle: string | null
  notificacion_pendiente: boolean
  total_count: number
}

/** `FILTERS` del listado. */
export interface ProcesosQueryFilters {
  SEARCH: string | null
  FK_SEDE: number | null
  FK_JORNADA: number | null
  FK_ESTADO: number | null
  FK_RESPONSABLE: number | null
  FK_INSTANCIA: number | null
  FECHA_DESDE: string | null
  FECHA_HASTA: string | null
}

/** Filtros del panel (valores de combo como texto; fechas `yyyy-MM-dd`). */
export interface ProcesosFiltros {
  sede: string
  jornada: string
  estado: string
  responsable: string
  instancia: string
  desde: string
  hasta: string
}

export const PROCESOS_FILTROS_VACIOS: ProcesosFiltros = {
  sede: "",
  jornada: "",
  estado: "",
  responsable: "",
  instancia: "",
  desde: "",
  hasta: "",
}

export interface PersonaDTO {
  id: number
  nombre: string
}

export interface ArchivoDTO {
  pk_tarchivo: number
  nombre: string
  tamano_bytes: number
  tipo_mime: string
}

interface CatalogoDTO {
  codigo: string
  nombre: string
}

export interface NotificacionDTO {
  id: number
  acto: "CARGOS" | "DECISION" | "RECURSO"
  fecha_emision: string
  estado: "CONFIRMADA" | "POR_CONFIRMAR"
  canal: "PORTAL" | "PRESENCIAL" | null
  fecha_notificacion: string | null
  confirmado_en: string | null
  soporte: ArchivoDTO | null
}

export interface CitacionDTO {
  id: number
  motivo_nombre: string
  estado: CatalogoDTO
  fecha_programada: string | null
  lugar: string | null
  responsable_nombre: string | null
  asistencia: CatalogoDTO | null
}

export interface SancionDTO {
  id: number
  fk_tsancion: number
  nombre: string
  tiene_duracion: boolean
  efecto: CatalogoDTO
  fecha_inicio: string | null
  fecha_fin: string | null
  detalle: string | null
  estado: CatalogoDTO
  acto: "DECISION" | "RECURSO"
  fk_recurso: number | null
  cumplimiento: { resultado: string; observacion: string; fecha: string; por: string } | null
}

export interface RecursoDTO {
  id: number
  tipo: CatalogoDTO
  estado: "PENDIENTE" | "RESUELTO"
  fecha_presentacion: string
  presentado_por: CatalogoDTO
  instancia_resuelve: CatalogoDTO
  argumentos: string
  escrito: ArchivoDTO
  resolucion: {
    fecha: string
    resultado: CatalogoDTO
    motivacion: string
    acto: ArchivoDTO
    sanciones: SancionDTO[]
    notificacion: NotificacionDTO
    plazo_recurrir: string | null
  } | null
}

export interface CargoDTO {
  id: number
  orden: number
  codigo: string
  codigo_descripcion: string
  clasificacion_nombre: string
  norma: string
  descripcion: string
  probado: boolean | null
}

/** `GET /procesos/:ID` (§3). */
export interface ProcesoDetalle {
  id: number
  numero: string
  estado: CatalogoDTO
  estado_guardado: EstadoProcesoCodigo
  fecha_en_firme: string | null
  estudiante: { fk_tmatricula: number; nombre: string; grado_grupo: string; sede_nombre: string; jornada_nombre: string }
  acudiente: { nombre: string; tiene_cuenta: boolean } | null
  responsable: PersonaDTO
  abre: PersonaDTO
  fecha_apertura: string
  origen: {
    anotaciones: { id: number; fecha: string; codigo: string; codigo_descripcion: string; anulada: boolean }[]
    caso: { id: number; numero: string; fecha_hechos: string } | null
  }
  accion_principal: string | null
  acciones: ProcesoAcciones
  documentos: { comunicacion_cargos: boolean; acta_descargos: boolean; resolucion: boolean }
  etapas: {
    apertura: {
      alcanzada: boolean
      fecha: string | null
      por: string | null
      cargos: CargoDTO[]
      pruebas: { id: number; descripcion: string; archivo: ArchivoDTO | null }[]
      comunicacion: NotificacionDTO | null
      plazo_descargos: string | null
      citacion: CitacionDTO | null
    }
    descargos: Record<string, unknown> & { alcanzada: boolean }
    decision: Record<string, unknown> & { alcanzada: boolean }
    recursos: { alcanzada: boolean; por_resolver: number; items: RecursoDTO[] }
    firmeza: { alcanzada: boolean; fecha_en_firme: string | null; sanciones: SancionDTO[] }
  }
  anulacion: { fecha: string; por: string; motivo: string } | null
}

/** Resumen mínimo que necesitan los diálogos de operación. */
export interface ProcesoResumen {
  id: number
  numero: string
  estudiante_nombre: string
  estado_codigo: EstadoProcesoCodigo
  estado_nombre: string
}

export const resumenDeProceso = (p: ProcesoRow): ProcesoResumen => ({
  id: p.id,
  numero: p.numero,
  estudiante_nombre: p.estudiante_nombre,
  estado_codigo: p.estado_codigo,
  estado_nombre: p.estado_nombre,
})
