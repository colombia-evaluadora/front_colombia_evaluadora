import { z } from "zod"

import {
  ESTADOS_RESERVA,
  ESTADOS_TRASLADO,
  FILTROS_RAPIDOS,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"
import { ESTADOS_OPCION } from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"

export const PESTANAS_INSCRIPCION = [
  "reservas",
  "inscripciones",
  "configuracion",
  "territorial",
] as const

export const SECCIONES_TERRITORIAL = [
  "proyeccion",
  "calendario",
  "seguimiento",
  "redistribucion",
  "cupos-contratados",
  "orientaciones",
  "solicitudes-retiro",
] as const
export type SeccionTerritorial = (typeof SECCIONES_TERRITORIAL)[number]
export type PestanaInscripcion = (typeof PESTANAS_INSCRIPCION)[number]

export const inscripcionReservasSearchSchema = z.object({
  tab: z.enum(PESTANAS_INSCRIPCION).optional().catch(undefined),
  /** Subpestaña de Configuración. */
  conf: z.enum(["grupos", "periodos"]).optional().catch(undefined),
  /** Sección de Entidad territorial. */
  terr: z.enum(SECCIONES_TERRITORIAL).optional().catch(undefined),
  /** Búsqueda de Proyección. */
  terrQ: z.string().optional().catch(undefined),
  /** Seguimiento: establecimiento abierto con Ver. */
  terrEE: z.coerce.number().int().positive().optional().catch(undefined),
  /** Seguimiento: Orientar por falta de continuidad o por traslados pendientes. */
  terrOrientar: z.enum(["continuidad", "traslados"]).optional().catch(undefined),
  /** Redistribución: subpestaña Ubicados sin grupo (sin valor = En redistribución). */
  terrRed: z.enum(["ubicados"]).optional().catch(undefined),
  /** Redistribución: inscripción (o reserva, en Ubicados sin grupo) abierta con Ver. */
  terrId: z.coerce.number().int().positive().optional().catch(undefined),
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  rapido: z.enum(FILTROS_RAPIDOS).optional().catch(undefined),
  sede: z.string().optional().catch(undefined),
  jornada: z.string().optional().catch(undefined),
  grado: z.string().optional().catch(undefined),
  estado: z.enum(ESTADOS_RESERVA).optional().catch(undefined),
  estadoTraslado: z.enum(ESTADOS_TRASLADO).optional().catch(undefined),
  // Pestaña Inscripciones: con prefijo para no chocar con los filtros de reservas.
  inscGrupo: z.string().optional().catch(undefined),
  inscGrado: z.string().optional().catch(undefined),
  inscJornada: z.string().optional().catch(undefined),
  inscQ: z.string().optional().catch(undefined),
  inscEstados: z.array(z.enum(ESTADOS_OPCION)).optional().catch(undefined),
})

export type InscripcionReservasSearch = z.infer<typeof inscripcionReservasSearchSchema>
