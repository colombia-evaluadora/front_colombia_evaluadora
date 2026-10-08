import { format, parse } from "date-fns"
import type { z } from "zod"

import { required } from "@/lib/forms/messages"

const FORMATO = "yyyy-MM-dd'T'HH:mm"

// Fecha y hora actual en el formato de los DateField "datetime".
export const ahoraLocal = () => format(new Date(), FORMATO)

// Día mínimo del selector de cierre: no antes del día de inicio.
export const diaMinimo = (inicio: string | null) =>
  inicio ? parse(inicio, FORMATO, new Date()) : new Date()

// El cierre debe ser posterior al inicio, contando la hora (el mismo día también).
// Los valores tienen formato fijo, así que se comparan como texto.
export function errorCierre(inicio: string | null, cierre: string | null) {
  if (inicio && cierre && cierre <= inicio) {
    return "La fecha y hora final debe ser posterior a la de inicio."
  }
  return undefined
}

interface Rango {
  fechaInicio: string | null
  fechaCierre: string | null
}

// Inicio y cierre obligatorios, y el cierre después del inicio.
export function validarRangoFechas(v: Rango, ctx: z.RefinementCtx) {
  if (!v.fechaInicio) {
    ctx.addIssue({ code: "custom", path: ["fechaInicio"], message: required("La fecha de inicio", { femenino: true }) })
  }
  if (!v.fechaCierre) {
    ctx.addIssue({ code: "custom", path: ["fechaCierre"], message: required("La fecha final", { femenino: true }) })
  }
  const error = errorCierre(v.fechaInicio, v.fechaCierre)
  if (error) ctx.addIssue({ code: "custom", path: ["fechaCierre"], message: error })
}
