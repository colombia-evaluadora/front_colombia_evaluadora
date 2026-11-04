export const GRUPOS_SIUCE = [
  "Identificación y contexto",
  "Involucrados",
  "Situación",
  "Acciones y remisiones",
  "Seguimientos",
  "Soportes y Cierre",
] as const

export interface ColumnaSiuce {
  clave: string
  rotulo: string
  grupo: (typeof GRUPOS_SIUCE)[number]
}

const I = "Identificación y contexto"
const V = "Involucrados"
const S = "Situación"

/** Claves de `convivencia-siuce` del reporting-service, en el orden del reporte. */
export const SIUCE_COLUMNAS: ColumnaSiuce[] = [
  { clave: "numero_caso", rotulo: "Caso", grupo: I },
  { clave: "tipo_situacion", rotulo: "Tipo de situación", grupo: I },
  { clave: "manifestacion", rotulo: "Manifestación", grupo: I },
  { clave: "estado_caso", rotulo: "Estado del caso", grupo: I },
  { clave: "afectado", rotulo: "Afectado", grupo: V },
  { clave: "calidad_afectado", rotulo: "Calidad del afectado", grupo: V },
  { clave: "documento_afectado", rotulo: "Documento del afectado", grupo: V },
  { clave: "grado_grupo", rotulo: "Grado/Grupo", grupo: V },
  { clave: "estado_reporte", rotulo: "Estado del reporte", grupo: I },
  { clave: "codigo_siuce", rotulo: "Código del SIUCE", grupo: I },
  { clave: "fecha_reporte", rotulo: "Fecha del reporte", grupo: I },
  { clave: "reportado_por", rotulo: "Registrado por", grupo: I },
  { clave: "presuntos_agresores", rotulo: "Presuntos agresores", grupo: V },
  { clave: "otros_involucrados", rotulo: "Otros involucrados", grupo: V },
  { clave: "tipos_dano", rotulo: "Tipo de daño", grupo: S },
  { clave: "tipo_agresion", rotulo: "Tipo de agresión", grupo: S },
  { clave: "evento_generador", rotulo: "Evento generador", grupo: S },
  { clave: "situacion_repetitiva", rotulo: "Situación repetitiva", grupo: S },
  { clave: "secuelas_fisicas", rotulo: "Secuelas físicas", grupo: S },
  { clave: "lugar", rotulo: "Lugar", grupo: S },
  { clave: "fecha_hechos_conocida", rotulo: "Se conoce la fecha de los hechos", grupo: S },
  { clave: "fecha_hechos", rotulo: "Fecha de los hechos", grupo: S },
  { clave: "hora_hechos_conocida", rotulo: "Se conoce la hora de los hechos", grupo: S },
  { clave: "hora_hechos", rotulo: "Hora de los hechos", grupo: S },
  { clave: "fecha_conocimiento", rotulo: "Fecha de conocimiento", grupo: S },
  { clave: "base_fecha", rotulo: "Base de fecha del filtro", grupo: S },
  { clave: "descripcion", rotulo: "Descripción de los hechos", grupo: S },
  { clave: "acciones", rotulo: "Acciones y remisiones", grupo: "Acciones y remisiones" },
  { clave: "seguimientos", rotulo: "Seguimientos", grupo: "Seguimientos" },
  { clave: "soportes", rotulo: "Soportes", grupo: "Soportes y Cierre" },
  { clave: "resumen_cierre", rotulo: "Resumen de cierre", grupo: "Soportes y Cierre" },
  { clave: "cerrado_en", rotulo: "Fecha y hora de cierre", grupo: "Soportes y Cierre" },
  { clave: "cerrado_por", rotulo: "Cerrado por", grupo: "Soportes y Cierre" },
]
