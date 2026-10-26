import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { unwrapRow } from "@/lib/response-envelope"
import { env } from "@/config/env"

import type { Campus } from "@/features/establishment/campuses/api/types/campus"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { Employee } from "@/features/establishment/employees/api/types/employee"
import type { Permission, PermissionStatus } from "@/features/establishment/institution/api/types/permission"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"

interface EmployeeQueryResult {
  status: "ok"
  employee: Employee
}

/** Sub-objetos que el backend ya arma en camelCase; solo se toleran `null`. */
interface RealPermissionRow {
  id: number
  orden: number
  role: CatalogItem
  campus: {
    id: number
    name: string
    dane: string | null
    zone: CatalogItem | null
    neighborhood: string | null
    commune: string | null
    address: string | null
    phone: string | null
  }
  workSchedule: CatalogItem
  status: PermissionStatus
  /** V599: 'RECTOR'/'SECRETARIA' si es el permiso que da ese cargo en el EE. */
  principalDe?: "RECTOR" | "SECRETARIA" | null
}

/** Fila de `fn_usu_empleado_buscar_por_pk`: catálogos como `fk_x` + `x_nombre`. */
interface RealEmployeeDetailRow {
  pk_empleado: number
  fk_tlv_tipo_documento: number | null
  tipo_documento_nombre: string | null
  identificacion: string
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  fecha_nacimiento: string | null
  fk_tlv_genero: number | null
  genero_nombre: string | null
  correo_electronico: string | null
  telefono: string | null
  fk_estado: string
  estado_label: string
  fk_establecimiento: number | null
  fk_tlv_clase_funcionario: number | null
  clase_funcionario_nombre: string | null
  fk_tlv_nivel_esenanza: number | null
  nivel_esenanza_nombre: string | null
  fk_tlv_grado_escalafon: number | null
  grado_escalafon_nombre: string | null
  fk_tlv_nivel_educativo: number | null
  nivel_educativo_nombre: string | null
  fk_tlv_fuente_recurso: number | null
  fuente_recurso_nombre: string | null
  fk_tlv_cargo: number | null
  cargo_nombre: string | null
  fk_tlv_tipo_vinculacion: number | null
  tipo_vinculacion_nombre: string | null
  direccion: string | null
  fk_tarchivo_foto: number | null
  permisos: RealPermissionRow[]
}

/** Sin código de catálogo: se usa el `fk_x` como `id`/`code`. */
function toCatalogItem(id: number | null, name: string | null): CatalogItem | null {
  if (id === null || name === null) return null
  return { id, code: String(id), name }
}

function toCampus(row: RealPermissionRow["campus"]): Campus {
  return {
    id: row.id,
    name: row.name,
    dane: row.dane ?? "",
    zone: row.zone,
    neighborhood: row.neighborhood ?? "",
    commune: row.commune ?? "",
    address: row.address ?? "",
    phone: row.phone ?? "",
  }
}

function toPermission(row: RealPermissionRow): Permission {
  return {
    id: row.id,
    order: row.orden,
    role: row.role,
    campus: toCampus(row.campus),
    workSchedule: row.workSchedule,
    status: row.status,
    principalDe: row.principalDe ?? null,
  }
}

function toEmployee(row: RealEmployeeDetailRow): Employee {
  return {
    id: row.pk_empleado,
    person: {
      id: row.pk_empleado,
      documentType: toCatalogItem(row.fk_tlv_tipo_documento, row.tipo_documento_nombre),
      identification: row.identificacion,
      firstName: row.primer_nombre,
      middleName: row.segundo_nombre ?? "",
      lastName: row.primer_apellido,
      secondLastName: row.segundo_apellido ?? "",
      birthDate: row.fecha_nacimiento ?? "",
      gender: toCatalogItem(row.fk_tlv_genero, row.genero_nombre),
      email: row.correo_electronico ?? "",
      phone: row.telefono ?? "",
      photoArchivoId: row.fk_tarchivo_foto,
    },
    employeeClass: toCatalogItem(row.fk_tlv_clase_funcionario, row.clase_funcionario_nombre),
    educationLevel: toCatalogItem(row.fk_tlv_nivel_esenanza, row.nivel_esenanza_nombre),
    grade: toCatalogItem(row.fk_tlv_grado_escalafon, row.grado_escalafon_nombre),
    highestEducationLevel: toCatalogItem(row.fk_tlv_nivel_educativo, row.nivel_educativo_nombre),
    fundingSource: toCatalogItem(row.fk_tlv_fuente_recurso, row.fuente_recurso_nombre),
    functionalPosition: toCatalogItem(row.fk_tlv_cargo, row.cargo_nombre),
    employmentType: toCatalogItem(row.fk_tlv_tipo_vinculacion, row.tipo_vinculacion_nombre),
    address: row.direccion ?? "",
    permissions: (row.permisos ?? []).map(toPermission),
    status: row.fk_estado === "A" ? "ACTIVE" : "SUSPENDED",
  }
}

// Exportada: `fetchEstablishment` la usa para hidratar rector/secretaria.
export async function fetchEmployee(id: number): Promise<EmployeeQueryResult> {
  if (env.ENABLE_API_MOCKING) {
    return api.get(`/establishments/employees/${id}`)
  }

  const row = unwrapRow<RealEmployeeDetailRow>(
    (await api.get(`/eval-col/establecimientos/funcionarios/${id}`)) as unknown as
      | { rows: RealEmployeeDetailRow[] }
      | RealEmployeeDetailRow,
  )
  return { status: "ok", employee: toEmployee(row) }
}

export function useEmployeeQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.detalle(id),
    queryFn: () => fetchEmployee(id as number),
    enabled: enabled && Boolean(id),
  })
}
