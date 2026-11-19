import { createContext, useContext } from "react"

import { useDisabilityTypesQuery } from "@/features/establishment/institution/api/query/use-disability-types"
import { useEtniasQuery } from "@/features/establishment/institution/api/query/use-etnias"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type {
  MatriculaCatalogKey,
  MatriculaCatalogOption,
} from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"

/**
 * Catálogos que la pantalla entrega ya resueltos, en lugar de consultarlos.
 *
 * Las secciones del formulario de matrícula se reutilizan en la inscripción
 * pública, que no tiene sesión: sus catálogos (`/eval-col/select/...`,
 * etnias, discapacidades) exigen Bearer y un 401 ahí se toma como "sesión
 * vencida" y manda al login. Con `<CatalogosFijosContext value={...}>` arriba,
 * los hooks de catálogo no consultan y leen de acá.
 */
export type CatalogosFijos = Partial<Record<MatriculaCatalogKey, MatriculaCatalogOption[]>> & {
  etnias?: CatalogItem[]
  discapacidades?: CatalogItem[]
}

export const CatalogosFijosContext = createContext<CatalogosFijos | null>(null)


export function useEtniasCatalogo() {
  const fijos = useContext(CatalogosFijosContext)
  const query = useEtniasQuery({ enabled: !fijos })
  return fijos ? { ...query, data: fijos.etnias ?? [] } : query
}

export function useDiscapacidadesCatalogo() {
  const fijos = useContext(CatalogosFijosContext)
  const query = useDisabilityTypesQuery({ enabled: !fijos })
  return fijos ? { ...query, data: fijos.discapacidades ?? [] } : query
}
