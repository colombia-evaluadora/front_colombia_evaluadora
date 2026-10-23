import { useQuery } from "@tanstack/react-query"
import { LISTA_VALOR_STALE_TIME } from "@/features/establishment/academic-period/api/query/fetch-select-category"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { CATALOGS } from "@/lib/catalogs"
import { unwrapRows } from "@/lib/response-envelope"
import { catalogoMeta } from "@/lib/offline/query-meta"

/** Valor de cualquier entrada de `CATALOGS`. */
export type CatalogSlug = (typeof CATALOGS)[keyof typeof CATALOGS]

/** Texto del error cuando falla la carga; si falta, se muestra el slug. */
const catalogNames: Partial<Record<CatalogSlug, string>> = {
  [CATALOGS.DOCUMENT_TYPES]: "los tipos de documento",
  [CATALOGS.EMPLOYEE_ROLES]: "los roles de empleado",
  [CATALOGS.GENDERS]: "los géneros",
  [CATALOGS.POPULATION_GENDERS]: "los géneros de la población",
  [CATALOGS.MUNICIPALITIES]: "los municipios",
  [CATALOGS.EDUCATION_LEVELS]: "los niveles educativos de enseñanza",
  [CATALOGS.HIGHEST_EDUCATION_LEVELS]: "los últimos niveles educativos aprobados",
  [CATALOGS.WORK_SCHEDULES]: "las jornadas laborales",
  [CATALOGS.EMPLOYEE_CLASSES]: "las clases de funcionario",
  [CATALOGS.EMPLOYEE_GRADES]: "los grados de escalafón",
  [CATALOGS.FUNDING_SOURCES]: "las fuentes de recursos",
  [CATALOGS.FUNCTIONAL_POSITIONS]: "los cargos funcionales",
  [CATALOGS.EMPLOYMENT_TYPES]: "los tipos de vinculación",
  [CATALOGS.CALENDARIOS]: "los calendarios",
  [CATALOGS.COST_REGIMEN]: "el régimen de costos",
  [CATALOGS.RANGO_TARIFAS]: "el rango de tarifas",
  [CATALOGS.IDIOMAS]: "los idiomas",
  [CATALOGS.LEGAL_TYPES]: "los tipos jurídicos",
  [CATALOGS.ZONES]: "las zonas",
  [CATALOGS.DISABILITIES]: "las discapacidades",
  [CATALOGS.DISABILITIES_ATTENDED]: "las discapacidades atendidas",
  [CATALOGS.LICENSE_STATUSES]: "los estados de licencia",
  [CATALOGS.ENTITY_STATUSES]: "los estados de entidad",
}

/**
 * Categoría de `TLISTA_VALOR` por slug, para `GET /select/:categoria`.
 * Municipios, propiedad jurídica, discapacidades y roles tienen endpoint propio.
 */
const CATALOG_CATEGORIAS: Partial<Record<CatalogSlug, string>> = {
  [CATALOGS.DOCUMENT_TYPES]: "TIPO_DOCUMENTO",
  [CATALOGS.GENDERS]: "GENERO",
  [CATALOGS.POPULATION_GENDERS]: "GENERO_POBLACION",
  [CATALOGS.WORK_SCHEDULES]: "JORNADA",
  [CATALOGS.EMPLOYEE_CLASSES]: "CLASE_FUNCIONARIO",
  [CATALOGS.FUNDING_SOURCES]: "FUENTE_DE_RECURSO",
  [CATALOGS.EMPLOYMENT_TYPES]: "TIPO_VINCULACION",
  [CATALOGS.CALENDARIOS]: "CALENDARIO",
  [CATALOGS.COST_REGIMEN]: "REG_COSTOS",
  [CATALOGS.RANGO_TARIFAS]: "RANG_TARIFA",
  [CATALOGS.IDIOMAS]: "IDIOMA",
  [CATALOGS.ZONES]: "ZONA",
  // El typo "DISCAPACIODAD" viene así de la base.
  [CATALOGS.DISABILITIES_ATTENDED]: "DISCAPACIODAD_ATENDIDA",
  [CATALOGS.ENTITY_STATUSES]: "ESTADO_ESTABLECIMIENTO",
  [CATALOGS.EDUCATION_LEVELS]: "NIVEL_ENSENANZA",
  [CATALOGS.HIGHEST_EDUCATION_LEVELS]: "ULT_NIVEL",
  [CATALOGS.EMPLOYEE_GRADES]: "ESCALAFON",
  // CARGO, no NOMBRE_CARGO: son catálogos distintos y el valor guardado es de CARGO.
  [CATALOGS.FUNCTIONAL_POSITIONS]: "CARGO",
}

/** Forma real de cada fila de `GET /select/:categoria` (tlista_valor). */
interface RealCatalogRow {
  pk_lista_valor: number
  nombre: string
  valor: string
  accion: string | null
}

async function getMockCatalog<T>(catalog: CatalogSlug): Promise<T[]> {
  const response = await fetch(`/api/catalogs/${catalog}`)

  if (!response.ok) {
    const friendly = catalogNames[catalog] ?? catalog
    throw new Error(`No fue posible obtener ${friendly}`)
  }

  return response.json()
}

async function getRealCatalog<T>(catalog: CatalogSlug): Promise<T[]> {
  const categoria = CATALOG_CATEGORIAS[catalog]
  if (!categoria) {
    throw new Error(
      `El catálogo "${catalog}" todavía no tiene categoría real mapeada (ver CATALOG_CATEGORIAS en use-catalogs.ts)`,
    )
  }

  const friendly = catalogNames[catalog] ?? catalog
  try {
    const response = (await api.get(`/eval-col/select/${categoria}`)) as unknown as
      | { rows: RealCatalogRow[] }
      | RealCatalogRow[]
    const rows = unwrapRows<RealCatalogRow>(response)
    return rows.map((row) => ({
      id: row.pk_lista_valor,
      code: row.valor,
      name: row.nombre,
    })) as T[]
  } catch {
    throw new Error(`No fue posible obtener ${friendly}`)
  }
}

export function getCatalog<T>(catalog: CatalogSlug): Promise<T[]> {
  return env.ENABLE_API_MOCKING ? getMockCatalog<T>(catalog) : getRealCatalog<T>(catalog)
}

/** Catálogo genérico de `TLISTA_VALOR` por categoría. */
export function useCatalogQuery<T>(catalog: CatalogSlug) {
  return useQuery({
    // Se guarda para pantallas sin red.
    meta: catalogoMeta(),
    staleTime: LISTA_VALOR_STALE_TIME,
    queryKey: ["catalogs", catalog],
    queryFn: () => getCatalog<T>(catalog),
  })
}

