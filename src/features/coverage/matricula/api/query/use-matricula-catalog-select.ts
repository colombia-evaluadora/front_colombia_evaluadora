import { useQuery } from "@tanstack/react-query"

import { selectCategoryQueryOptions, type SelectCategoryRow } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import type { MatriculaStatus } from "@/features/coverage/matricula/api/types/matricula"

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

function toMatriculaCatalog(rows: SelectCategoryRow[]): MatriculaCatalogOption[] {
  return rows.map((row) => ({ id: row.pk_lista_valor, nombre: row.nombre }))
}

export function useMatriculaCatalogQuery(key: MatriculaCatalogKey) {
  return useQuery({ ...selectCategoryQueryOptions(MATRICULA_CATALOG_CATEGORIA[key]), select: toMatriculaCatalog })
}

export interface MatriculaStatusOption {
  value: MatriculaStatus
  label: string
}

const toMatriculaStatusOptions = (rows: SelectCategoryRow[]): MatriculaStatusOption[] =>
  rows.map((row) => ({ value: row.nombre as MatriculaStatus, label: row.nombre }))

export function useMatriculaStatusOptionsQuery() {
  return useQuery({ ...selectCategoryQueryOptions("ESTADO_MATRICULA"), select: toMatriculaStatusOptions })
}
