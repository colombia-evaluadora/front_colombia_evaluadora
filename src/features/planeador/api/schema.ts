import * as z from "zod"

/**
 * Search schema del listado. La barra superior es la misma de los demás
 * listados: un solo input con la consulta —texto libre + términos
 * `instrumento:(Rúbrica)`— y el panel de filtros avanzados detrás del embudo.
 * Todo lo que se elige ahí vive en la URL para que la vista sea enlazable.
 *
 * `.catch(undefined)` en todos: tolera URLs armadas a mano con basura.
 */
export const planeadorSearchSchema = z.object({
  buscar: z.string().optional().catch(undefined),
  /** Instrumento de evaluación. Todavía no filtra (falta el catálogo). */
  filtro: z.string().optional().catch(undefined),
  /** Estado de la actividad: `pending` | `in-progress` | … */
  estado: z.string().optional().catch(undefined),
  /** Agrupación del listado ("Ver por"): `actividad` | `unidad` | … */
  vista: z.string().optional().catch(undefined),
  // Actividad abierta en el panel de la derecha. Va en la URL —y no en
  // estado local— para que el detalle sea enlazable y sobreviva al refresh,
  // igual que el resto de los filtros del listado.
  actividad: z.string().optional().catch(undefined),
  /** Día activo de la barra "Hoy | MARTES 16 | < >" (`yyyy-MM-dd`), que
   *  pagina el rail por `?dia=` (`GET /actividades/mias`). Ausente = hoy. */
  dia: z.string().optional().catch(undefined),
  /** Modo del panel de detalle de `actividad`: info (default) | grades
   *  (botón "Marcar") | approval (botón "Aprobar"). Va en la URL por el
   *  mismo motivo que `actividad` — enlazable y sobrevive al refresh. */
  modo: z.enum(["info", "grades", "approval"]).optional().catch(undefined),
})
export type PlaneadorSearch = z.infer<typeof planeadorSearchSchema>

/**
 * Los campos del panel de filtros avanzados. Strings vacíos en vez de
 * `undefined` porque es lo que espera el form (mismo criterio que el resto
 * de los `*FiltersFormSchema`).
 */
export const planeadorFiltersFormSchema = z.object({
  buscar: z.string(),
  filtro: z.string(),
  estado: z.string(),
  vista: z.string(),
})
export type PlaneadorFiltersFormInput = z.input<typeof planeadorFiltersFormSchema>
export type PlaneadorFiltersFormValues = z.infer<typeof planeadorFiltersFormSchema>

/**
 * Search schema de la pestaña "Unidad temática". `unidad` es la que está
 * abierta en el panel derecho; si falta, la página cae a la primera de la
 * lista.
 */
export const planeadorUnidadesSearchSchema = z.object({
  buscar: z.string().optional().catch(undefined),
  filtro: z.string().optional().catch(undefined),
  estado: z.string().optional().catch(undefined),
  vista: z.string().optional().catch(undefined),
  unidad: z.string().optional().catch(undefined),
  /** Mismo día activo que `planeadorSearchSchema.dia`, para `GET /unidades`
   *  (`?dia=`). Ausente = hoy. */
  dia: z.string().optional().catch(undefined),
})
export type PlaneadorUnidadesSearch = z.infer<typeof planeadorUnidadesSearchSchema>

/**
 * El recurso completo viaja en el search de esta ruta (no hay endpoint por
 * id: un recurso recién agregado en el form de Actividad vive solo en el
 * estado del form hasta que se guarda). `tipo` llega como string suelto
 * —no como el literal `RecursoTipo`— porque `zod` no puede validar un
 * union literal arbitrario tipado en otro archivo sin duplicarlo acá.
 */
export const planeadorRecursoPreviewSearchSchema = z.object({
  tipo: z.string().optional().catch(undefined),
  url: z.string().optional().catch(undefined),
  fuente: z.string().optional().catch(undefined),
  titulo: z.string().optional().catch(undefined),
  descripcion: z.string().optional().catch(undefined),
})
export type PlaneadorRecursoPreviewSearch = z.infer<typeof planeadorRecursoPreviewSearchSchema>
