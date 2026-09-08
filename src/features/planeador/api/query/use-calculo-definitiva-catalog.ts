import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import type { MetodoCalculo } from "@/features/planeador/api/types/unidad-tematica"

/** Catálogo `CALCULO_DEFINITIVA` de `TLISTA_VALOR` — resuelve
 *  `FK_TLV_CALCULO_DEFINITIVA` al crear/editar una unidad (confirmado con
 *  permiso de docente). Mismo criterio de match por substring que
 *  `metodoCalculoFromLabel` en `use-unidades-query.ts` (no tenemos
 *  confirmado el texto exacto de las tres opciones). */
function toMetodoCalculo(nombre: string): MetodoCalculo {
  const lower = nombre.toLowerCase()
  if (lower.includes("promediar")) return "Promedio simple"
  if (lower.includes("suma")) return "Suma de puntos"
  return "Ponderado"
}

export interface CalculoDefinitivaOption {
  id: number
  metodo: MetodoCalculo
}

/** No es un hook (no usa cache de React Query): se llama directo desde las
 *  mutaciones de crear/editar unidad, que necesitan el `id` real en el
 *  momento de armar el body, no en el render del form. */
export async function fetchCalculoDefinitivaOptions(): Promise<CalculoDefinitivaOption[]> {
  const rows = await fetchSelectCategory("CALCULO_DEFINITIVA")
  return rows.map((row) => ({ id: row.pk_lista_valor, metodo: toMetodoCalculo(row.nombre) }))
}

export async function resolveCalculoDefinitivaId(metodo: MetodoCalculo): Promise<number | undefined> {
  const options = await fetchCalculoDefinitivaOptions()
  return options.find((o) => o.metodo === metodo)?.id
}
