import { z } from "zod"

export const PESTANAS_ESTABLECIMIENTOS = ["orientaciones"] as const
export type PestanaEstablecimientos = (typeof PESTANAS_ESTABLECIMIENTOS)[number]

export const ESTADOS_ORIENTACION = ["ENVIADA", "ATENDIDA"] as const
export type EstadoOrientacionRecibida = (typeof ESTADOS_ORIENTACION)[number]

export interface OrientacionesFiltersFormInput {
  search: string
  estados: EstadoOrientacionRecibida[]
  temas: string[]
}

export const establishmentFiltersFormSchema = z.object({
  search: z.string(),
  municipalities: z.array(z.string()),
  sectors: z.array(z.string()),
})

export type EstablishmentFiltersFormInput = z.input<
  typeof establishmentFiltersFormSchema
>

export type EstablishmentFiltersFormValues = z.infer<
  typeof establishmentFiltersFormSchema
>

/**
 * Search params de la URL.
 * Se serializan/deserializan automáticamente por TanStack Router.
 */
export const establishmentsSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),

  pageSize: z.coerce.number().int().positive().catch(10).default(10),

  sortBy: z.string().optional().catch(undefined),

  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),

  search: z.string().optional().catch(undefined),

  /** Códigos DANE de municipio. */
  municipalities: z.array(z.string()).optional().catch(undefined),

  /** `VALOR` de la lista SECTOR. */
  sectors: z.array(z.string()).optional().catch(undefined),

  /**
   * Pestaña de la vista (informe, 2.3). Sin valor = Establecimientos. Vínculos de participación y
   * Herramientas externas todavía no tienen pantalla: sus pestañas se ven deshabilitadas.
   */
  tab: z.enum(PESTANAS_ESTABLECIMIENTOS).optional().catch(undefined),

  /** Orientaciones: búsqueda libre en el texto y el tema. */
  oSearch: z.string().optional().catch(undefined),

  /** Orientaciones: filtro Estado (uno). */
  oEstados: z.array(z.enum(ESTADOS_ORIENTACION)).optional().catch(undefined),

  /** Orientaciones: filtro Tema (uno). */
  oTemas: z.array(z.string()).optional().catch(undefined),

  /** Orientaciones: establecimiento elegido por el Superadministrador. */
  oEstablecimiento: z.coerce.number().int().positive().optional().catch(undefined),

  /** Orientaciones: la abierta en Ver detalle (el enlace del aviso la abre). */
  orientacion: z.coerce.number().int().positive().optional().catch(undefined),
})

export type EstablishmentsSearch = z.infer<
  typeof establishmentsSearchSchema
>