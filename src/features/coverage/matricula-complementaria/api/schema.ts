import { z } from "zod"

export const PESTANAS_COMPLEMENTARIA = ["convocatorias", "postulaciones", "convenios", "continuidad"] as const
export type PestanaComplementaria = (typeof PESTANAS_COMPLEMENTARIA)[number]

export const matriculaComplementariaSearchSchema = z.object({
  tab: z.enum(PESTANAS_COMPLEMENTARIA).optional().catch(undefined),
  /** Ver postulaciones: la pestaña Postulaciones filtrada por la convocatoria. */
  convocatoria: z.coerce.number().optional().catch(undefined),
  /** Postulaciones: búsqueda por número, nombre o documento y grado de la principal. */
  q: z.string().optional().catch(undefined),
  grado: z.string().optional().catch(undefined),
  /** Convenios: año. */
  anio: z.coerce.number().optional().catch(undefined),
  /** Continuidad: estado y especialidad. */
  estado: z.enum(["PREVISTA", "PENDIENTE_GRUPO", "CREADA", "SIN_CONTINUIDAD"]).optional().catch(undefined),
  especialidad: z.string().optional().catch(undefined),
  /** Convocatorias: estado y modo de selección (el texto va en `q` y el año en `anio`). */
  estadoConvocatoria: z.enum(["PROGRAMADA", "EN_POSTULACION", "EN_SELECCION", "PUBLICADA", "CERRADA"]).optional().catch(undefined),
  modoSeleccion: z.enum(["MANUAL", "AUTOMATICA"]).optional().catch(undefined),
  /** Abre el modal de Nueva postulación (enlace directo `postulaciones/nueva`). */
  postular: z.coerce.boolean().optional().catch(undefined),
  /** Abre el modal de Cambiar cupo de esa postulación (enlace directo `…/cambiar-cupo`). */
  cambiarCupo: z.coerce.number().optional().catch(undefined),
  page: z.coerce.number().catch(0).default(0),
  pageSize: z.coerce.number().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
})

export const seleccionarSearchSchema = z.object({
  cupo: z.coerce.number().optional().catch(undefined),
})
