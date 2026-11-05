import { z } from "zod"

import { maxLength, minLength, required } from "@/lib/forms/messages"

export const CONSERVACION_TABS = ["politicas", "ampliaciones", "vencidos", "archivo"] as const
export type ConservacionTab = (typeof CONSERVACION_TABS)[number]

/** Pestaña activa y filtros del archivo histórico en la URL. */
export const conservacionSearchSchema = z.object({
  tab: z.enum(CONSERVACION_TABS).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  establecimiento: z.coerce.number().int().positive().optional().catch(undefined),
  tipo: z.string().optional().catch(undefined),
  anio: z.coerce.number().int().positive().optional().catch(undefined),
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(25).default(25),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
})

export type ConservacionSearch = z.infer<typeof conservacionSearchSchema>

/** Letras, números, espacio, guion y apóstrofo, como los rótulos de Referentes curriculares. */
export const TIPO_REGISTRO_PATTERN = /^[A-Za-z0-9ÁÉÍÓÚáéíóúÜüÑñ '’-]*$/
export const toTipoRegistroInput = (v: string) => v.replace(/[^A-Za-z0-9ÁÉÍÓÚáéíóúÜüÑñ '’-]/g, "").replace(/^s+/, "").replace(/s{2,}/g, " ")

// Campos de la tabla «Política» (Sección 6.4). Plazo, desde y disposición solo si no es permanente.
export const politicaFormSchema = z
  .object({
    tipoRegistro: z
      .string()
      .trim()
      .min(1, required("El tipo de registro"))
      .regex(TIPO_REGISTRO_PATTERN, "No se permiten caracteres especiales.")
      .min(3, minLength(3, "El tipo de registro"))
      .max(80, maxLength(80, "El tipo de registro")),
    pkModulo: z.number().min(1, required("El módulo")),
    permanente: z.boolean(),
    plazoMinimo: z.string(),
    cuentaDesde: z.enum(["CREACION", "CIERRE_ANIO", "RETIRO_EGRESO"]).nullable(),
    disposicion: z.enum(["ANONIMIZAR", "ARCHIVAR"]).nullable(),
    habilitado: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.permanente) return
    const plazo = Number(v.plazoMinimo)
    if (!v.plazoMinimo || plazo < 1 || plazo > 99)
      ctx.addIssue({ code: "custom", path: ["plazoMinimo"], message: "Escriba un plazo entre 1 y 99 años." })
    if (!v.cuentaDesde)
      ctx.addIssue({ code: "custom", path: ["cuentaDesde"], message: "Seleccione desde cuándo se cuenta." })
    if (!v.disposicion)
      ctx.addIssue({ code: "custom", path: ["disposicion"], message: required("La disposición final", { femenino: true }) })
  })

export type PoliticaFormValues = z.infer<typeof politicaFormSchema>

export const ACTA_MAX_BYTES = 10 * 1024 * 1024
