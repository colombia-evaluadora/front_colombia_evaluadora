import { useQuery } from "@tanstack/react-query"

import {
  fetchSelectCategory,
  type SelectCategoryRow,
} from "@/features/establishment/academic-period/api/query/fetch-select-category"

export const MATRICULA_CATALOG_CATEGORIA = {
  talento: "TALENTO",
  estrato: "ESTRATO",
  sisben: "SISBEN",
  situacionAnioAnterior: "SIT_ACAD_ANO_ANT",
  condicionAnioAnterior: "CON_ALUM_ANO_ANT",
  poblacionVictima: "POB_VICT_CONF",
  fuenteRecursos: "FUENTE_DE_RECURSO",
  parentesco: "PARENTESCO",
  zona: "ZONA",
  nivelEducativo: "NIVEL_ESTUDIO",
  estadoCivil: "ESTADO_CIVIL",
  tipoEmpleo: "TIPO_EMPLEO",
  frecuenciaDomicilio: "FRECUENCIA_DOMICILIO",
  tipoDocumento: "TIPO_DOCUMENTO",
  genero: "GENERO",
} as const

export type MatriculaCatalogKey = keyof typeof MATRICULA_CATALOG_CATEGORIA

export interface MatriculaCatalogOption {
  id: number
  nombre: string
}

async function fetchMatriculaCatalog(categoria: string): Promise<MatriculaCatalogOption[]> {
  const rows = await fetchSelectCategory(categoria)
  return rows.map((row: SelectCategoryRow) => ({ id: row.pk_lista_valor, nombre: row.nombre }))
}

export const matriculaCatalogQueryKey = (key: MatriculaCatalogKey) => [
  "matricula",
  "catalog-select",
  key,
]

export function useMatriculaCatalogQuery(key: MatriculaCatalogKey) {
  return useQuery({
    queryKey: matriculaCatalogQueryKey(key),
    queryFn: () => fetchMatriculaCatalog(MATRICULA_CATALOG_CATEGORIA[key]),
    staleTime: Infinity,
  })
}
