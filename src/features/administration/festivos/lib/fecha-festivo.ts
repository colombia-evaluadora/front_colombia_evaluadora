import { addDays, format, getDay, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import type { TipoFecha } from "@/features/administration/festivos/api/types"

/** Datos del festivo que fijan su fecha. */
export interface ReglaFecha {
  tipoFecha: TipoFecha
  mes: number | null
  dia: number | null
  diasPascua: number | null
  trasladoLunes: boolean
}

// Domingo de Pascua (algoritmo de Meeus/Butcher), igual que `fn_festivo_domingo_pascua`.
export function domingoPascua(anio: number): Date {
  const a = anio % 19
  const b = Math.floor(anio / 100)
  const c = anio % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(anio, mes - 1, dia)
}

const alLunes = (fecha: Date) => {
  const dia = getDay(fecha)
  return dia === 1 ? fecha : addDays(fecha, (8 - dia) % 7)
}

/**
 * Fecha del festivo en `anio`, con la misma regla que `fn_festivo_fecha`
 * (V337.1). La usan la vista previa del formulario y los mocks; la fecha que
 * vale es la que calcula el back.
 */
export function fechaFestivo(regla: ReglaFecha, anio: number): Date | null {
  if (regla.tipoFecha === "PASCUA") {
    if (regla.diasPascua == null) return null
    const fecha = addDays(domingoPascua(anio), regla.diasPascua)
    return regla.trasladoLunes ? alLunes(fecha) : fecha
  }
  if (regla.mes == null || regla.dia == null) return null
  const fecha = new Date(anio, regla.mes - 1, regla.dia)
  // Fuera de rango (31 de abril) el Date se corre de mes: no es una fecha válida.
  if (fecha.getMonth() !== regla.mes - 1) return null
  return regla.tipoFecha === "LEY_EMILIANI" ? alLunes(fecha) : fecha
}

export const toIso = (fecha: Date) => format(fecha, "yyyy-MM-dd")

/** "lunes 12 de enero". */
export const fechaTexto = (iso: string) => format(parseISO(iso), "EEEE d 'de' MMMM", { locale: es })

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

/** La regla en palabras: "6 de enero" o "3 días antes de Pascua, al lunes". */
export function reglaTexto(f: ReglaFecha) {
  if (f.tipoFecha !== "PASCUA") return f.mes && f.dia ? `${f.dia} de ${MESES[f.mes - 1]}` : "—"
  const n = f.diasPascua ?? 0
  const base =
    n === 0
      ? "Domingo de Pascua"
      : `${Math.abs(n)} ${Math.abs(n) === 1 ? "día" : "días"} ${n < 0 ? "antes" : "después"} de Pascua`
  return f.trasladoLunes ? `${base}, al lunes` : base
}
