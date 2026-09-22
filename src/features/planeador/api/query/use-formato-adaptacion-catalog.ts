import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import type { Adaptacion } from "@/features/planeador/api/types/actividad"

/**
 * Catálogo `FORMATO_ADAPTACION` de `TLISTA_VALOR` — resuelve el
 * `formatoAdaptacion` que pide `PUT /planeador/actividades/:id/adaptaciones`
 * cuando `usaVersionModificada = "S"` (confirmado real contra el mensaje de
 * error del backend, y contra el seed de V224: `FORMATO_ADAPTACION` /
 * "Archivo" → "ARCHIVO", "Enlace" → "ENLACE", "Biblioteca" → "BIBLIOTECA").
 *
 * `formatoAdaptacion` viaja como el id NUMÉRICO de este catálogo, no como
 * el código — la función del backend lo castea directo a `::BIGINT`
 * (`fn_actividad_lv_assert`). Mandar el código de texto ("ARCHIVO") daba
 * `"Un valor enviado no tiene el formato o el rango esperado (tipo
 * esperado: bigint)"`.
 *
 * Match por `valor` (código estable), no por substring de `nombre` — mismo
 * criterio que `use-tipo-escala-catalog.ts` tras el bug de
 * `use-instrumento-actividad-form-query.ts`: acá el código SÍ está
 * confirmado desde el seed, así que no hay motivo para depender del texto.
 */
const FORMATO_ADAPTACION_VALORES: Record<string, Exclude<Adaptacion["versionModificada"], "no" | "">> = {
  ARCHIVO: "archivo",
  ENLACE: "enlace",
  BIBLIOTECA: "biblioteca",
}

export interface FormatoAdaptacionOption {
  id: number
  formato: Exclude<Adaptacion["versionModificada"], "no" | "">
}

/** No es un hook: se llama al armar el body de `PUT .../adaptaciones`. */
export async function fetchFormatoAdaptacionOptions(): Promise<FormatoAdaptacionOption[]> {
  const rows = await fetchSelectCategory("FORMATO_ADAPTACION")
  return rows
    .map((row) => {
      const formato = FORMATO_ADAPTACION_VALORES[row.valor]
      return formato ? { id: row.pk_lista_valor, formato } : undefined
    })
    .filter((option): option is FormatoAdaptacionOption => option != null)
}

export async function resolveFormatoAdaptacionId(
  versionModificada: Adaptacion["versionModificada"],
): Promise<number | undefined> {
  if (versionModificada === "no" || versionModificada === "") return undefined
  const options = await fetchFormatoAdaptacionOptions()
  return options.find((o) => o.formato === versionModificada)?.id
}
