import { useQuery } from "@tanstack/react-query"

const catalogNames: Record<string, string> = {
  "document-types": "los tipos de documento",
  "employee-roles": "los roles de empleado",
  "genders": "los géneros",
  "municipalities": "los municipios",
  "education-levels": "los niveles de educación",
  "work-schedules": "las jornadas laborales",
  "employee-classes": "las clases de funcionario",
  "employee-grades": "los grados de escalafón",
  "funding-sources": "las fuentes de recursos",
  "functional-positions": "los cargos funcionales",
  "employment-types": "los tipos de vinculación",
  "calendarios": "los calendarios",
  "cost-regimen": "el régimen de costos",
  "rango-tarifas": "el rango de tarifas",
  "idiomas": "los idiomas",
  "legal-types": "los tipos jurídicos",
  "zones": "las zonas",
  "disabilities": "las discapacidades",
  "license-statuses": "los estados de licencia",
}

export async function getCatalog<T>(catalog: string): Promise<T[]> {
  const response = await fetch(`/api/catalogs/${catalog}`)

  if (!response.ok) {
    const friendly = catalogNames[catalog] ?? catalog
    throw new Error(`No fue posible obtener ${friendly}`)
  }

  return response.json()
}

export function useCatalogQuery<T>(catalog: string) {
  return useQuery({
    queryKey: ["catalogs", catalog],
    queryFn: () => getCatalog<T>(catalog),
  })
}

