import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { CATALOGS } from "@/lib/catalogs"

import { getCatalog } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

interface RealEmployeeRoleRow {
  pk_rol: number
  codigo: string
  nombre: string
}

async function fetchEmployeeRoles(): Promise<CatalogItem[]> {
  // TROL no es TLISTA_VALOR: no lo cubre el catálogo genérico
  // `/select/:categoria` (ver use-catalogs.ts) — tiene su propia tabla,
  // igual que TMUNICIPIO/TPROPIEDAD_JURIDICA/TDISCAPACIDAD (ver V58 en el
  // SSO). Solo trae PK_TROL >= 9: los roles 1..8 son "de sistema"
  // (super-admin de establecimiento, jefe de sistema, etc.), no roles que
  // se le asignen a un funcionario normal desde este select.
  if (env.ENABLE_API_MOCKING) {
    return getCatalog<CatalogItem>(CATALOGS.EMPLOYEE_ROLES)
  }
  const response = await fetch("/api/eval-col/catalogos/roles")
  if (!response.ok) {
    throw new Error("No fue posible obtener los roles de empleado")
  }
  const body: { rows: RealEmployeeRoleRow[] } = await response.json()
  return body.rows.map((row) => ({
    id: row.pk_rol,
    code: row.codigo,
    name: row.nombre,
  }))
}

export function useEmployeeRolesQuery() {
  return useQuery({
    queryKey: ["catalogs", "employee-roles"],
    queryFn: fetchEmployeeRoles,
  })
}
