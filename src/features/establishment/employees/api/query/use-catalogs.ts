import { useQuery } from "@tanstack/react-query"
import { CATALOGS } from "@/lib/catalogs"

/**
 * Slug de catálogo: el *valor* de cualquier entrada de `CATALOGS`
 * (p. ej. `"document-types"`, `"population-genders"`). Se usa como
 * parámetro de `getCatalog` y `useCatalogQuery` para que solo se
 * puedan pedir catálogos declarados en `CATALOGS`.
 */
export type CatalogSlug = (typeof CATALOGS)[keyof typeof CATALOGS]

/**
 * Mensajes legibles para mostrar cuando falla la carga de un catálogo.
 *
 * La clave es la constante de `CATALOGS` (no el string crudo) para que:
 *  - el IDE autocomplete al registrar una nueva entrada,
 *  - un rename en `CATALOGS` propague el cambio aquí sin tener que
 *    recordar editar el slug a mano,
 *  - el compilador señale referencias rotas si se elimina una clave.
 *
 * Es `Partial`: no es obligatorio registrar todos los catálogos. Si uno
 * no aparece, el `Error` simplemente muestra el slug crudo, que sigue
 * siendo información útil para debugging.
 */
const catalogNames: Partial<Record<CatalogSlug, string>> = {
  [CATALOGS.DOCUMENT_TYPES]: "los tipos de documento",
  [CATALOGS.EMPLOYEE_ROLES]: "los roles de empleado",
  [CATALOGS.GENDERS]: "los géneros",
  [CATALOGS.POPULATION_GENDERS]: "los géneros de la población",
  [CATALOGS.MUNICIPALITIES]: "los municipios",
  [CATALOGS.EDUCATION_LEVELS]: "los niveles de educación",
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
  [CATALOGS.LICENSE_STATUSES]: "los estados de licencia",
  [CATALOGS.ENTITY_STATUSES]: "los estados de entidad",
}

export async function getCatalog<T>(catalog: CatalogSlug): Promise<T[]> {
  const response = await fetch(`/api/catalogs/${catalog}`)

  if (!response.ok) {
    const friendly = catalogNames[catalog] ?? catalog
    throw new Error(`No fue posible obtener ${friendly}`)
  }

  return response.json()
}

export function useCatalogQuery<T>(catalog: CatalogSlug) {
  return useQuery({
    queryKey: ["catalogs", catalog],
    queryFn: () => getCatalog<T>(catalog),
  })
}

