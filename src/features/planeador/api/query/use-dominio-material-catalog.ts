import { useQuery } from "@tanstack/react-query"

import { fetchSelectCategory } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

export type DominioMaterialCategoria = "DOMINIO_MATERIAL_URL" | "DOMINIO_MATERIAL_REPOSITORIO"

/**
 * Lista blanca de dominios para "Materiales de apoyo" (`TLISTA_VALOR`,
 * categorías `DOMINIO_MATERIAL_URL` / `DOMINIO_MATERIAL_REPOSITORIO`, sso
 * V496.1) — el mismo catálogo que valida `fn_actividad_validar_url_dominio`
 * al guardar (Regla 82). Se repite acá para avisar en el cliente apenas se
 * tipea el enlace, no recién cuando el backend lo rechaza en el guardado.
 * `staleTime: Infinity`: mismo criterio que el resto de los catálogos de
 * `TLISTA_VALOR` de este feature (no cambian durante la sesión).
 */
export function useDominioMaterialCatalog(categoria: DominioMaterialCategoria) {
  return useQuery({
    queryKey: planeadorKeys.dominioMaterial(categoria),
    queryFn: async () => {
      const rows = await fetchSelectCategory(categoria)
      return rows.map((row) => row.valor.trim().toLowerCase()).filter(Boolean)
    },
    staleTime: Infinity,
  })
}

/**
 * Mismo criterio que `fn_actividad_url_host`/`fn_actividad_validar_url_dominio`
 * del backend: host exacto o subdominio (`algo.dominio`) — así
 * `classroom.google.com` pasa contra `google.com` en la lista, igual que el
 * validador del servidor.
 */
export function esDominioPermitido(url: string, dominiosPermitidos: string[]): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return dominiosPermitidos.some((dominio) => host === dominio || host.endsWith(`.${dominio}`))
  } catch {
    return false
  }
}
