import { format } from "date-fns"

/** Hoy como `aaaa-mm-dd` en hora local: las fechas del PIAR son DATE, sin zona horaria. */
export const hoyIso = () => format(new Date(), "yyyy-MM-dd")

/** Mensaje si `valor` (aaaa-mm-dd) es posterior a hoy; las fechas ISO se comparan como texto. */
export const noPosteriorAHoy = (valor: string, campo: string) => (valor > hoyIso() ? `${campo} no puede ser posterior a hoy.` : null)

/** Mensaje si `valor` es anterior a `minimo` (aaaa-mm-dd). */
export const noAnteriorA = (valor: string, minimo: string | null | undefined, mensaje: string) => (minimo && valor < minimo.slice(0, 10) ? mensaje : null)
