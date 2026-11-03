import { z } from "zod"

import { maxLength, minLength, required } from "@/lib/forms/messages"

/** Search params de la pantalla: búsqueda por nombre, filtros y paginación. */
export const festivosSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  tipo: z.enum(["FIJA", "LEY_EMILIANI", "PASCUA"]).optional().catch(undefined),
  estado: z.enum(["activo", "inactivo"]).optional().catch(undefined),
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(25).default(25),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
})

export type FestivosSearch = z.infer<typeof festivosSearchSchema>

const diasDelMes = (mes: number) => new Date(2023, mes, 0).getDate()

// Mismas reglas que `fn_festivo_validar_nombre` / `_validar_fecha` (V337.2).
// Día y días de Pascua van como texto: el campo se escribe a mano.
export const festivoFormSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, required("El nombre"))
      .min(3, minLength(3, "El nombre"))
      .max(80, maxLength(80, "El nombre")),
    tipoFecha: z.enum(["FIJA", "LEY_EMILIANI", "PASCUA"]),
    mes: z.number(),
    dia: z.string(),
    diasPascua: z.string(),
    trasladoLunes: z.boolean(),
    habilitado: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.tipoFecha === "PASCUA") {
      const n = Number(v.diasPascua)
      if (v.diasPascua === "" || v.diasPascua === "-" || !Number.isInteger(n) || n < -10 || n > 100) {
        ctx.addIssue({
          code: "custom",
          path: ["diasPascua"],
          message: "Escriba un número entre −10 y 100.",
        })
      }
      return
    }
    if (!v.mes) {
      ctx.addIssue({ code: "custom", path: ["mes"], message: required("El mes") })
      return
    }
    const dia = Number(v.dia)
    if (v.mes === 2 && dia === 29) {
      ctx.addIssue({ code: "custom", path: ["dia"], message: "La fecha no puede ser el 29 de febrero." })
    } else if (!v.dia || dia < 1 || dia > diasDelMes(v.mes)) {
      ctx.addIssue({
        code: "custom",
        path: ["dia"],
        message: `El día debe estar entre 1 y ${diasDelMes(v.mes)}.`,
      })
    }
  })

export type FestivoFormValues = z.infer<typeof festivoFormSchema>
