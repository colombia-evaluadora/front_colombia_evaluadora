/**
 * Formato de intercambio JSON de actividades del Planeador — sacarlas de un
 * grupo/asignatura y volverlas a meter en otro, o en el mismo. Colección
 * Postman `planeador-actividades-exportar-importar`:
 *
 * ```
 * POST /planeador/actividades/exportar
 * POST /planeador/actividades/importar
 * ```
 *
 * El contenido de cada actividad exportada queda intencionalmente OPACO acá
 * (`[key: string]: unknown`): el front no necesita interpretarlo para poder
 * exportarlo/reimportarlo, solo transportarlo de un lado a otro. Lo único
 * tipado es `_identificadores`, porque es lo que decide si una fila se puede
 * reimportar sin adivinar destino (ver la colección — "los nombres no
 * identifican nada": 3.591 asignaturas activas con solo 304 nombres
 * distintos).
 */
export interface ActividadExportadaIdentificadores {
  pkTactividad: number
  pkTunidad?: number
  fkTasignatura?: number
  fkTgrado?: number
  fkTgrupo?: number
}

export interface ActividadExportada {
  nombre: string
  _identificadores?: ActividadExportadaIdentificadores
  [key: string]: unknown
}

/** Filtros del exportar — se combinan con AND y hace falta al menos uno. */
export interface ExportarActividadesFiltro {
  ids?: number[]
  unidadId?: number
  asignaturaId?: number
  grupoId?: number
}

/**
 * Destino explícito para actividades sin `_identificadores` (un archivo que
 * no salió de nuestro propio exportador). Los tres últimos solo hacen falta
 * si el importar tiene que CREAR la unidad de destino.
 */
export interface ImportarActividadesDestino {
  asignaturaId?: number
  grupoId?: number
  gradoId?: number
  funcionarioId?: number
  calculoDefinitivaId?: number
  referenteCurricularId?: number
}

/**
 * Estado de una fila del informe. Los dos primeros los devuelve el paso de
 * validación; los tres últimos, el de aplicación (V340):
 *
 * - `ok`        — validación: la actividad es importable.
 * - `error`     — validación: tiene problemas y no se va a intentar.
 * - `importada` — aplicación: se creó.
 * - `omitida`   — aplicación: la validación ya la había rechazado, ni se
 *                 intentó. Conserva sus `errores`.
 * - `fallida`   — aplicación: pasó la validación pero el servidor la rechazó
 *                 al crearla. Trae el motivo en `errores`.
 */
export type EstadoFilaImportacion = "ok" | "error" | "importada" | "omitida" | "fallida"

export interface FilaInformeImportacion {
  estado: EstadoFilaImportacion
  indice: number
  nombre: string
  errores?: string[]
  resuelto?: Record<string, unknown>
  pkTactividad?: number
  pkTunidad?: number
}

export interface UnidadCreadaImportacion {
  nombre: string
  pkTunidad: number
}

export interface InformeImportacion {
  modo: "validacion" | "aplicacion"
  total: number
  validas: number
  /** Filas que la validación rechazó. Ya NO significa "no se importará
   *  nada": desde V340 la importación es fila por fila y esas se omiten
   *  mientras el resto entra. */
  conError: number
  aplicadas: number
  /** Solo en `modo: "aplicacion"` (V340): filas que la validación ya había
   *  rechazado y por eso no se intentaron. */
  omitidas?: number
  /** Solo en `modo: "aplicacion"` (V340): filas que pasaron la validación
   *  pero el servidor rechazó al crearlas. */
  fallidas?: number
  mensaje: string
  filas: FilaInformeImportacion[]
  unidadesCreadas?: UnidadCreadaImportacion[]
}
