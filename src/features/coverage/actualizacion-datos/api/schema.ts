import { z } from "zod"

export const PESTANAS_ACTUALIZACION = ["configuracion", "solicitudes"] as const
export type PestanaActualizacion = (typeof PESTANAS_ACTUALIZACION)[number]

/** Sin `estado` en la URL se ven las Pendientes (C.6.SOL.1); «TODOS» quita el filtro. */
export const ESTADOS_FILTRO = ["PENDIENTE", "APROBADA", "RECHAZADA", "TODOS"] as const

export const actualizacionDatosSearchSchema = z.object({
  tab: z.enum(PESTANAS_ACTUALIZACION).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  estado: z.enum(ESTADOS_FILTRO).optional().catch(undefined),
  page: z.coerce.number().catch(0).default(0),
  pageSize: z.coerce.number().catch(10).default(10),
})

export type ActualizacionDatosSearch = z.infer<typeof actualizacionDatosSearchSchema>
