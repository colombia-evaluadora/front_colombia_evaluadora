// Pestaña Entidad territorial de Inscripción y reservas (Cobertura Educativa, Sección 3.10).

/** Quién mira la pestaña: solo el Supervisor territorial y el Administrador territorial la reciben. */
export interface ContextoTerritorial {
  /** "Supervisor territorial" o "Administrador territorial". */
  rol: string
  /** Establecimientos de su alcance. */
  establecimientos: {
    id: number
    nombre: string
    /** Oferente de cupo contratado (Regla 76). */
    oferente?: boolean
    /** Solo un establecimiento del sector No oficial puede ser oferente. */
    noOficial?: boolean
  }[]
  /** Solo el Administrador territorial publica y amplía el calendario de cobertura (3.10). */
  puedeGestionarCalendario: boolean
}

export type EstadoProyeccion = "PROYECTADA" | "APROBADA"

/** Proyección de cupos de un período en Inscripciones (3.10); la lista la muestra por establecimiento. */
export interface ProyeccionEstablecimiento {
  /** El back la identifica por establecimiento: Aprobar y Devolver deciden todos sus períodos en Inscripciones. */
  id: number
  establecimientoId: number
  establecimiento: string
  grados: number
  grupos: number
  cupoTotal: number
  gradosConDeficit: number
  /** Null = metodología tradicional; si no, el nombre de la distinta (p. ej. "Aceleración"). */
  metodologiaDistinta: string | null
  estado: EstadoProyeccion
  observacion: string | null
}

/** Un renglón del Ver detalle: el grado en todo el establecimiento contra lo que viene del anterior. */
export interface ProyeccionGrado {
  codigo: string
  grado: string
  grupos: number
  metodologias: { nombre: string; grupos: number }[]
  cupoProyectado: number
  /** Null = el grado anterior no se ofrece en ninguna sede: sin comparación. */
  vienen: number | null
  /** Null hasta que estén los resultados de matrícula. */
  repitentes: number | null
  prematriculasContinua: number
  /** Cupo proyectado − vienen; negativo = déficit. */
  cupoLibre: number | null
  sedes: {
    sede: string
    cupoProyectado: number
    vienen: number | null
    pasanOtraSede: number | null
  }[]
}

export interface ProyeccionDetalle extends ProyeccionEstablecimiento {
  periodo: string
  anio: number | null
  detalle: ProyeccionGrado[]
}

export type EstadoCalendario = "BORRADOR" | "PUBLICADO" | "FINALIZADO"

/** Calendario de cobertura de la entidad territorial por Año · Modalidad · Ciclo. */
export interface CalendarioCobertura {
  id: number
  anio: number
  modalidad: string
  ciclo: number
  /** Inicio de la prematrícula y la inscripción. */
  inicioInscripcion: string
  fechaCierreInscripcion: string
  fechaLiberacionReservas: string | null
  fechaLimiteMatricula: string
  /** Informativa: corte del reporte al sistema nacional. */
  corteReporte: string | null
  /** Días hábiles para atender una solicitud de retiro (1 a 30). */
  plazoSolicitudRetiro: number
  soporte: string | null
  estado: EstadoCalendario
}

export interface GuardarCalendarioInput {
  /** Sin id = Nuevo calendario. */
  id?: number
  anio: number
  modalidad: string
  ciclo: number
  inicioInscripcion: string
  fechaCierreInscripcion: string
  fechaLiberacionReservas: string | null
  fechaLimiteMatricula: string
  corteReporte: string | null
  plazoSolicitudRetiro: number
  estado: Exclude<EstadoCalendario, "FINALIZADO">
  soporte: File | null
}

/** Fecha del calendario que se puede ampliar (3.10, Etapas). */
export type CampoCalendario =
  | "FECHA_CIERRE_INSCRIPCION"
  | "FECHA_LIBERACION_RESERVAS"
  | "FECHA_LIMITE_MATRICULA"

export interface AmpliarLimiteInput {
  calendarioId: number
  campo: CampoCalendario
  fecha: string
  /** Vacío = general: la toman quienes heredaron la fecha. Con ids, solo la Fecha límite de matrícula. */
  establecimientos: number[]
  motivo: string
  soporte: File | null
}

/** Conteos de Seguimiento (3.10): continuidad de los que cursan hacia el período siguiente. */
export interface ConteosSeguimiento {
  cursando: number
  reservadas: number
  /** Sin cupo en el grado siguiente: se resuelven con Reservar cupo. */
  sinContinuidad: number
  /** Los que no siguen (retiro, graduación, desistimiento). */
  omitidos: number
  trasladosPendientes: number
}

export interface SeguimientoEstablecimiento extends ConteosSeguimiento {
  establecimientoId: number
  establecimiento: string
  /** Días del traslado pendiente más antiguo; null si no hay. */
  diasMasAntiguo: number | null
}

export interface SeguimientoFila extends ConteosSeguimiento {
  nombre: string
}

export type SeguimientoGrupo = SeguimientoFila & { hijos: SeguimientoFila[] }

/** Ver de Seguimiento: el mismo conteo abierto por grado (con sus sedes) y por sede (con sus grados). */
export interface SeguimientoDetalle {
  establecimientoId: number
  establecimiento: string
  periodo: string
  porGrado: SeguimientoGrupo[]
  porSede: SeguimientoGrupo[]
}

export type MotivoOrientacion = "continuidad" | "traslados"

export interface OrientarInput {
  establecimientoId: number
  /** Null = Nueva orientación (sin alerta de Seguimiento). */
  motivo: MotivoOrientacion | null
  tema: string
  orientacion: string
}

/** Inscripción sin cupo en sus opciones que el rol territorial ubica en otro establecimiento (3.10). */
export interface EnRedistribucion {
  id: number
  numero: string
  aspirante: string
  grado: string
  modalidad: string
  jornada: string
  situacionEdad: string
  establecimientoOrigen: string
  dentroAreaInfluencia: boolean
  distanciaKm: number | null
  /** "Establecimiento · Sede" más cercana con cupo; null si no hay. */
  sedeCercana: string | null
  diasEnRedistribucion: number
}

export type TipoCupo = "OFICIAL" | "CONTRATADO"

/** Sede y jornada donde se puede ubicar a un aspirante, con su cupo libre. */
export interface OpcionUbicacion {
  id: number
  establecimiento: string
  sede: string
  jornada: string
  /** Jornada que pidió el aspirante. */
  jornadaPedida: boolean
  dentroAreaInfluencia: boolean
  distanciaKm: number | null
  cupoOficialLibre: number
  /** Null = la sede no tiene cupos contratados. */
  cupoContratadoLibre: number | null
}

export interface UbicarInput {
  inscripciones: number[]
  /** Null = la sede más cercana con cupo (Ubicar varios). */
  opcionId: number | null
  tipoCupo: TipoCupo
  requiereConfirmacion: boolean
}

/** Resultado de Ubicar: cuántos se ubicaron y los números de inscripción que ya no estaban en redistribución. */
export interface ResultadoUbicar {
  ubicados: number
  omitidos: string[]
}

export type EstadoUbicacion = "RESERVADA" | "PENDIENTE_CONFIRMACION"

/** Ubicado por el rol territorial que aún no tiene grupo: su reserva de cupo. */
export interface UbicadoSinGrupo {
  id: number
  numero: string
  aspirante: string
  grado: string
  modalidad: string
  establecimiento: string
  sede: string
  jornada: string
  tipoCupo: TipoCupo
  /** Null = no requiere confirmación del acudiente. */
  confirmadaAcudiente: boolean | null
  fechaReserva: string
  diasParaLimite: number
  estado: EstadoUbicacion
}

/** Cupo contratado de un grupo (3.10): la parte del cupo que paga la entidad territorial a un privado. */
export interface CupoContratadoGrupo {
  /** PK del grupo. */
  id: number
  establecimiento: string
  sede: string
  jornada: string
  grado: string
  grupo: string
  cupo: number
  cupoContratado: number
  ocupadosContratados: number
  /** Ubicaciones con cupo contratado que aún esperan confirmación del acudiente. */
  retenidos: number
  /** Reservas y matrículas del establecimiento que no son de cupo contratado. */
  propias: number
  /** cupoContratado − ocupados − retenidos. */
  libresContratados: number
}

export type EstadoOrientacion = "ENVIADA" | "ATENDIDA"

/** Orientación enviada por el rol territorial a un establecimiento (3.10). */
export interface Orientacion {
  id: number
  establecimientoId: number
  establecimiento: string
  tema: string
  orientacion: string
  estado: EstadoOrientacion
  fechaEnvio: string
  /** "Nombre (Supervisora)" o "Nombre (Administrador)". */
  enviadaPor: string
  fechaAtencion: string | null
  /** Alerta de Seguimiento que la originó; null = Ninguna. */
  alerta: MotivoOrientacion | null
  respuesta: string | null
}

export type EstadoSolicitudRetiro =
  | "PENDIENTE"
  | "VENCIDA"
  | "OBJETADA"
  | "POR_ANULAR_DESTINO"
  | "ATENDIDA"
  | "CERRADA_SIN_RETIRO"

/** Solicitud de retiro (3.10): el destino matriculó a un estudiante que sigue matriculado en el origen. */
export interface SolicitudRetiro {
  id: number
  estudiante: string
  origen: string
  /** "IE Norte · 9°B · 2027". */
  origenDetalle: string
  solicitante: string
  solicitanteDetalle: string
  fechaSolicitud: string
  /** Días hábiles para que el origen responda (Plazo de solicitud de retiro del calendario). */
  plazoDiasHabiles: number
  venceEl: string
  /** Días hábiles desde la solicitud sin que el origen responda; null si ya respondió o se resolvió. */
  diasSinRespuesta: number | null
  estado: EstadoSolicitudRetiro
  fechaResolucion: string | null
  evidencia: string | null
  motivoNovedad: string
  /** "M. Gómez (Administrador del establecimiento) · IE Central · 10/01/2027 — La estudiante sigue asistiendo." */
  objecion: { autor: string; fecha: string; texto: string } | null
  avisos: { fecha: string; autor: string; texto: string }[]
}

/** Listado paginado en el servidor: la página pedida y el total con los filtros. */
export interface Paginado<T> {
  total: number
  filas: T[]
}

export interface InscripcionEnLineaInput {
  calendarioId: number
  accion: "HABILITAR" | "SUSPENDER"
  establecimientos: number[]
  motivo: string
}

/** Períodos que cambiaron y los que se omitieron al habilitar (sin un grado con grupos y cupos). */
export interface ResultadoInscripcionEnLinea {
  periodos: number
  omitidos: number
}
