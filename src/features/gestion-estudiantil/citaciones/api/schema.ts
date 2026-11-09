import { z } from "zod"

import type { OrigenManual } from "@/features/gestion-estudiantil/citaciones/api/types"

/** Search params de Citaciones y compromisos: la paginación que espera `useTablePagination` y la pestaña. */
export const citacionesSearchSchema = z.object({
  page: z.coerce.number().catch(0).default(0),
  pageSize: z.coerce.number().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  tab: z.enum(["citaciones", "compromisos"]).optional().catch(undefined),
})

const numeroOpcional = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? undefined : Number(v))

/** Search params de «Nueva citación» y «Nuevo compromiso» con registro de origen (anotación o caso). */
export const origenSearchSchema = z.object({
  origen_tipo: z.enum(["ANOTACION", "CASO_CONVIVENCIA"]).optional().catch(undefined),
  origen_id: z.unknown().optional().transform(numeroOpcional),
  estudiante: z.string().optional().catch(undefined),
  matricula: z.unknown().optional().transform(numeroOpcional),
})

export type OrigenSearch = z.infer<typeof origenSearchSchema>

/** Origen válido (tipo e id juntos) o undefined. */
export function origenDeSearch(s: OrigenSearch): OrigenManual | undefined {
  return s.origen_tipo && s.origen_id != null ? { tipo: s.origen_tipo, id: s.origen_id } : undefined
}

export type CitacionesSearch = z.infer<typeof citacionesSearchSchema>
