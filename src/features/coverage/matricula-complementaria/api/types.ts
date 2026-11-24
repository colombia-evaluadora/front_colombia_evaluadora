// Matrícula complementaria por adscripción (Sección 2.16.2): convocatorias.

export type FormaPostulacion = "ABIERTA" | "ORIGEN"
export type ModoSeleccion = "MANUAL" | "AUTOMATICA"
export type Desempate = "SORTEO" | "ORDEN"
/** Lo deduce el sistema de las fechas. */
export type EstadoConvocatoria = "PROGRAMADA" | "EN_POSTULACION" | "EN_SELECCION" | "PUBLICADA" | "CERRADA"
export type EstadoOpcion =
  | "INSCRITO"
  | "REGISTRADO"
  | "ADSCRITO"
  | "EN_LISTA_ESPERA"
  | "DESCARTADA"
  | "NO_SELECCIONADA"
  | "ANULADA"
  | "RETIRADA"

export interface Opcion {
  id: number
  nombre: string
}

export interface CupoConvocatoria {
  /** null en un cupo nuevo del formulario. */
  id: number | null
  sedeId: number
  sede: string
  periodoId: number
  /** «Tarde · Anual · Ciclo 1». */
  periodo: string
  jornada: string
  gradoId: number
  grado: string
  especialidadId: number
  especialidad: string
  cupo: number
  /** Registrados y Adscritos en el cupo. */
  seleccionados: number
  enListaEspera: number
}

export interface Convocatoria {
  id: number
  anio: number
  establecimiento: string
  origenes: Opcion[]
  forma: FormaPostulacion
  continuidadAutomatica: boolean
  listaEspera: boolean
  modo: ModoSeleccion
  desempate: Desempate
  inicioPostulacion: string
  cierrePostulacion: string
  /** null con la forma Por el establecimiento de origen sin lista de espera. */
  publicacion: string | null
  limiteMatricula: string
  estado: EstadoConvocatoria
  cupos: CupoConvocatoria[]
  /** Con al menos una postulación (aunque esté Anulada) no se elimina, y la forma y la lista de espera quedan fijas. */
  tienePostulaciones: boolean
  /** Fecha en que corrió el proceso automático o el sorteo, si ya corrió. */
  ejecutadaEl: string | null
}

export interface ConvocatoriaInput {
  anio: number
  origenIds: number[]
  forma: FormaPostulacion
  continuidadAutomatica: boolean
  listaEspera: boolean
  modo: ModoSeleccion
  desempate: Desempate
  inicioPostulacion: string
  cierrePostulacion: string
  publicacion: string | null
  limiteMatricula: string
  cupos: { id: number | null; periodoId: number; gradoId: number; especialidadId: number; cupo: number }[]
}

/* Opciones del formulario: lo que se puede elegir para el año. */

export interface EspecialidadOpcion {
  id: number
  nombre: string
  /** Puestos libres de los grupos que la dictan: tope del Cupo (Regla 80). */
  libres: number
}

export interface GradoOpcion {
  id: number
  nombre: string
  /** Primer grado de la especialidad en el convenio (con continuidad automática, solo ese). */
  inicial: boolean
  especialidades: EspecialidadOpcion[]
}

export interface PeriodoOpcion {
  id: number
  label: string
  jornada: string
  anual: boolean
  limiteMatricula: string
  grados: GradoOpcion[]
}

export interface SedeOpcion {
  id: number
  nombre: string
  periodos: PeriodoOpcion[]
}

export interface OpcionesConvocatoria {
  establecimiento: string
  /** Con convenio de adscripción Aceptado para el año. */
  origenes: Opcion[]
  sedes: SedeOpcion[]
  /** Adscritos del año anterior que continúan (Regla 52). */
  continuan: { especialidad: string; grado: string; cantidad: number }[]
}

/* Selección por cupo (Regla 53). */

export interface OpcionSeleccion {
  id: number
  posicion: number
  postulacion: string
  estudiante: string
  origen: string
  sorteo: string | null
  registro: string
  continuidad: boolean
  estado: EstadoOpcion
}

export interface SeleccionCupo {
  cupo: CupoConvocatoria
  postuladas: number
  convenios: { origen: string; adscritos: number; maximo: number }[]
  /** Inscrito (En selección) o En lista de espera (Publicada), en el orden de selección. */
  opciones: OpcionSeleccion[]
}

export interface ResultadoCupo {
  cupo: string
  postulaciones: number
  registrados: number
  continuidad: number
  enListaEspera: number
  descartadas: number
  libres: number
}

export interface ResultadoSeleccion {
  ejecutadaEl: string
  postulaciones: number
  cupos: ResultadoCupo[]
}

export interface ListaSorteo {
  ejecutadaEl: string
  filas: { posicion: number; postulacion: string; sorteo: string; estado: EstadoOpcion }[]
}

/* Postulaciones (Sección 2.16.2, Postulación). */

export type EstadoPostulacion = "INSCRITO" | "EN_LISTA_ESPERA" | "REGISTRADO" | "ADSCRITO" | "NO_SELECCIONADA" | "DESCARTADA" | "RETIRADA" | "ANULADA"

export interface Postulacion {
  id: number
  numero: string
  estudiante: string
  documento: string
  matriculaPrincipalId: number
  /** «IE Sur · Mañana · 10°A». */
  principal: string
  jornadaPrincipal: string
  gradoPrincipal: string
  /** Establecimiento de la matrícula principal. */
  origen: string
  /** El usuario está en el establecimiento de la principal: postula, cambia el cupo, anula. */
  esOrigen: boolean
  /** El usuario está en el establecimiento que recibe: matricula, libera el cupo. */
  esReceptor: boolean
  convocatoriaId: number
  convocatoriaAnio: number
  forma: FormaPostulacion
  listaEspera: boolean
  estadoConvocatoria: EstadoConvocatoria
  cierrePostulacion: string
  limiteMatricula: string
  receptorId: number
  receptor: string
  cupoId: number
  sede: string
  jornada: string
  grado: string
  especialidadId: number
  especialidad: string
  estadoOpcion: EstadoOpcion
  estado: EstadoPostulacion
  /** En lista de espera: su posición. */
  posicion: number | null
  sorteo: string | null
  motivoDescarte: string | null
  motivoAnulacion: string | null
  /** Autorización de tratamiento de datos (Regla 81): opcional. */
  autorizacion: boolean
  registro: string
  /** Su matrícula complementaria, si ya es Adscrito. */
  matriculaComplementariaId: number | null
}

export interface FichaEspecialidad {
  descripcion: string
  actividades: string
}

export interface CupoPostulable {
  id: number
  /** «IE Central · Tarde · Décimo · Sistemas». */
  label: string
  especialidadId: number
  cupo: number
  /** Cupo menos seleccionados (y sin pasar los grupos ni el convenio). */
  disponibles: number
  /** Cuántos hay ya en su lista de espera. */
  enEspera: number
}

export interface ConvocatoriaPostulable {
  id: number
  receptorId: number
  receptor: string
  forma: FormaPostulacion
  listaEspera: boolean
  cierrePostulacion: string
  limiteMatricula: string
  especialidades: (Opcion & { ficha: FichaEspecialidad })[]
  cupos: CupoPostulable[]
}

export interface OpcionesPostulacion {
  /** Convocatorias En postulación que tienen al origen de la principal. */
  convocatorias: ConvocatoriaPostulable[]
  /** La de la principal, si es una de las del convenio. */
  especialidadPrincipalId: number | null
}

export interface PrincipalPostulable {
  id: number
  /** «Sara Lucía Prada Gómez · TI 1101239876 · 10°B · Mañana». */
  label: string
}

/* Convenios de adscripción (Sección 2.16.1, Regla 42). */

export type EstadoConvenio = "PROPUESTO" | "ACEPTADO" | "RECHAZADO" | "FINALIZADO"

export interface Convenio {
  id: number
  /** El otro establecimiento: el origen si yo recibo, el que recibe si yo envío. */
  contraparte: string
  /** Yo recibo: «Envía a sus estudiantes». Si no: «Recibe a mis estudiantes». */
  soyReceptor: boolean
  receptor: string
  origen: string
  anio: number
  periodos: Opcion[]
  grados: string[]
  especialidades: string[]
  /** null: sin límite. */
  cupoMaximo: number | null
  adscritos: number
  estado: EstadoConvenio
  documentos: string[]
  motivo: string | null
}

export interface OpcionesConvenio {
  establecimiento: string
  establecimientos: Opcion[]
  /** En Inscripciones o Abierto; cada uno con los grados de su plan que tienen especialidad. */
  periodos: (Opcion & { anio: number; grados: (Opcion & { especialidades: number[] })[] })[]
  /** Con la capacidad informativa: puestos libres de los grupos que ya la dictan. */
  especialidades: (Opcion & { libres: number })[]
  /** Alguna convocatoria del año tiene continuidad automática: avisa si faltan grados. */
  continuidadAutomatica: boolean
}

export interface PreviaAceptar {
  /** Especialidades que la sede del origen ya tiene con el mismo nombre. */
  conflictos: { especialidadId: number; especialidad: string; sede: string; sedeId: number }[]
  /** Se agregan sin preguntar. */
  nuevas: string[]
}

export interface PreviaRenovar {
  periodos: Opcion[]
  /** Por defecto, los equivalentes de la misma Sede y Jornada. */
  equivalentes: number[]
}

/* Continuidad automática (Sección 2.16.2, Regla 80). */

export type EstadoContinuidad = "PREVISTA" | "PENDIENTE_GRUPO" | "CREADA" | "SIN_CONTINUIDAD"
export type MotivoSinContinuidad = "PRINCIPAL_REPROBADA" | "COMPLEMENTARIA_REPROBADA" | "PRINCIPAL_RETIRADA" | "SIN_CONVENIO"

export interface Continuidad {
  id: number
  estudiante: string
  documento: string
  origen: string
  especialidad: string
  gradoActual: string
  gradoSiguiente: string
  /** «IE Central · Tarde»: sede y jornada de su cupo. */
  sedeJornada: string
  convocatoriaAnio: number
  estado: EstadoContinuidad
  motivo: MotivoSinContinuidad | null
  /** Creada: su grupo. */
  grupo: string | null
}
