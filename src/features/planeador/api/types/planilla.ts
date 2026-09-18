/**
 * Modelo de datos real de la "Planilla de calificación" — confirmado contra
 * el backend real, no el hack de derivar columnas/celdas filtrando
 * `Actividad[]` en el cliente (ver
 * `planeador-planilla-flujo-completo.postman_collection.json`). Cada tipo
 * de acá calca el contrato de un endpoint puntual.
 */

/** Una columna de la grilla = una actividad del (grado, grupo, asignatura)
 *  filtrado — `GET /planeador/planilla/columnas`. */
export interface PlanillaColumna {
  ordenColumna: number
  pkTactividad: number
  titulo: string
  fkTunidad: number | null
  unidad: string | null
  instrumento: InstrumentoTipo | null
  instrumentoNombre: string | null
  ponderacion: number | null
  notaMaxima: number | null
  esEvaluativa: boolean
  /** `yyyy-MM-dd`. */
  fechaInicio: string
  /** `yyyy-MM-dd`. */
  fechaCierre: string
  estudiantesAsignados: number
  estudiantesCalificados: number
}

/** Solo `"NO_CALIFICABLE"` y `"SIN_CALIFICAR"` están confirmados contra el
 *  backend real — el resto de valores posibles (una vez calificada) no se
 *  documentaron todavía, así que se acepta cualquier string. */
export type EstadoCelda = "NO_CALIFICABLE" | "SIN_CALIFICAR" | (string & {})

/** Una celda (estudiante × actividad) de `GET /planeador/planilla/calificaciones`.
 *  El backend ya la devuelve en camelCase (a diferencia del resto del sobre,
 *  que es snake_case) — confirmado contra la respuesta real. */
export interface PlanillaCelda {
  ordenColumna: number
  pkTactividad: number
  pkTunidad: number | null
  pkTactividadEstudiante: number
  estado: EstadoCelda
  calificacion: number | null
  recuperacion: number | null
  definitiva: number | null
  nota: number | null
  calificable: "S" | "N" | null
  observacion: string | null
  /** `esFormativa`/`es_formativa` — si la unidad de esta actividad es
   *  formativa: decide si la celda abre calificación o solo observación.
   *  No confundir con `PlanillaColumna.esEvaluativa`, que es un flag manual
   *  de `TACTIVIDAD` con default `'S'`, no del referente de la unidad. */
  esFormativa: boolean
  /** `yyyy-MM-dd` — la fecha DENTRO de la ventana de la actividad en la que
   *  ESTE estudiante tiene asistencia válida (sin ella el gate de calificar
   *  responde 400, casi siempre, porque el endpoint cae a `CURRENT_DATE`
   *  si no se manda nada). Es la que hay que mandar como `BODY.FECHA` al
   *  calificar — nunca `PlanillaColumna.fechaInicio` ni "hoy". */
  fechaAsistencia: string | null
  /** `false` → la celda se pinta gris: no se puede calificar hasta que se
   *  registre asistencia. Es una foto del momento de la lectura. */
  tieneAsistencia: boolean
}

export interface PlanillaFila {
  pkTmatricula: number
  pkTestudiante: number
  nombreEstudiante: string
  definitivaProyectada: number | null
  definitivaRegistrada: number | null
  tendencia: number | null
  celdas: PlanillaCelda[]
}

/** Tipos de instrumento tal como los devuelve el backend real — distinto del
 *  string libre ("Rúbrica", "Lista de cotejo", …) que usa el resto del
 *  Planeador, pensado para el `<Select>` del form de alta, no para el
 *  contrato de calificación. */
export type InstrumentoTipo = "RUBRICA" | "LISTA_COTEJO" | "ESCALA_VALORACION" | "OTRO"

export interface InstrumentoNivel {
  pk: number
  etiqueta: string
  descripcion: string
  ponderacion: number
}

export interface InstrumentoCriterio {
  pk: number
  orden: number
  nombre: string
  descripcion: string
  niveles: InstrumentoNivel[]
}

export interface InstrumentoCotejoItem {
  pk: number
  orden: number
  descripcion: string
}

export interface InstrumentoEscala {
  pk: number
  niveles: InstrumentoNivel[]
}

/**
 * `GET/PUT /planeador/actividades/:id/instrumento` — el instrumento de
 * evaluación de la ACTIVIDAD puntual, fuente real de los `pk` que exige
 * calificar (`pkCriterio`/`pkNivel`/`pkItem`).
 *
 * Es independiente de la rúbrica de la Unidad temática
 * (`/planeador/unidades/:id/criterios`): `tactividad_criterio_unidad` solo
 * traza la relación entre ambas, no es lo que se envía al calificar —
 * confirmado con pruebas reales contra el backend (mandar el criterio de la
 * unidad da 400). `definicion` cambia de forma según `instrumento`: array de
 * criterios con niveles (RUBRICA), array de ítems (LISTA_COTEJO) u objeto
 * `{pk, niveles}` (ESCALA_VALORACION) — no un array.
 */
export type InstrumentoActividad =
  | { instrumento: null; instrumentoNombre: null; definicion: null }
  | { instrumento: "RUBRICA"; instrumentoNombre: string | null; definicion: InstrumentoCriterio[] }
  | {
      instrumento: "LISTA_COTEJO"
      instrumentoNombre: string | null
      definicion: InstrumentoCotejoItem[]
    }
  | {
      instrumento: "ESCALA_VALORACION"
      instrumentoNombre: string | null
      definicion: InstrumentoEscala
    }
  | { instrumento: "OTRO"; instrumentoNombre: string | null; definicion: unknown }
