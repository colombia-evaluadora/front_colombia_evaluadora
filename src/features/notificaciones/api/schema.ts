import { z } from "zod"

import { CATEGORIAS_NOTIFICACION, ESTADOS_LECTURA } from "@/features/notificaciones/api/types"
import type { Preferencias } from "@/features/notificaciones/api/types"

/**
 * `validateSearch` de `/app/notificaciones`. Toda clave `.catch(undefined)`:
 * un filtro desconocido en la URL se ignora sin error (spec "URL inválida").
 * No hay `page`: la lista pagina por cursor (D-2.3), que no va en la URL.
 */
export const notificacionesSearchSchema = z.object({
  categoria: z.enum(CATEGORIAS_NOTIFICACION).optional().catch(undefined),
  estado: z.enum(ESTADOS_LECTURA).optional().catch(undefined),
  texto: z.string().trim().max(200).optional().catch(undefined),
})

export type NotificacionesSearch = z.infer<typeof notificacionesSearchSchema>

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** Formulario de preferencias (D-3.5): matriz tipo × canal + horario silencioso. */
export const preferenciasFormSchema = z
  .object({
    tipos: z.array(
      z.object({
        tipo: z.string(),
        push: z.boolean(),
        email: z.boolean(),
      }),
    ),
    horarioSilencioso: z.object({
      activo: z.boolean(),
      desde: z.string(),
      hasta: z.string(),
      dias: z.array(z.number().int().min(1).max(7)),
    }),
  })
  .superRefine((value, ctx) => {
    const h = value.horarioSilencioso
    if (!h.activo) return
    if (!HORA_RE.test(h.desde)) {
      ctx.addIssue({ code: "custom", path: ["horarioSilencioso", "desde"], message: "Indica la hora de inicio." })
    }
    if (!HORA_RE.test(h.hasta)) {
      ctx.addIssue({ code: "custom", path: ["horarioSilencioso", "hasta"], message: "Indica la hora de fin." })
    }
    // Desde == hasta es ambiguo (¿todo el día o nada?). Un rango que cruza la
    // medianoche (22:00 → 06:00) sí es válido.
    if (HORA_RE.test(h.desde) && h.desde === h.hasta) {
      ctx.addIssue({
        code: "custom",
        path: ["horarioSilencioso", "hasta"],
        message: "La hora de fin debe ser distinta de la de inicio.",
      })
    }
    if (h.dias.length === 0) {
      ctx.addIssue({ code: "custom", path: ["horarioSilencioso", "dias"], message: "Elige al menos un día." })
    }
  })

export type PreferenciasFormValues = z.infer<typeof preferenciasFormSchema>

export function toPreferenciasFormValues(p: Preferencias): PreferenciasFormValues {
  return {
    tipos: p.tipos.map((t) => ({ tipo: t.tipo, push: t.push, email: t.email })),
    horarioSilencioso: {
      activo: p.horarioSilencioso.activo,
      desde: p.horarioSilencioso.desde,
      hasta: p.horarioSilencioso.hasta,
      dias: p.horarioSilencioso.dias,
    },
  }
}

