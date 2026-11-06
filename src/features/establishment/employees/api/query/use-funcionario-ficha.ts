import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { employeeKeys } from "@/features/establishment/employees/api/query-keys"

import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type {
  Anexo,
  EstadoFuncionario,
  FuncionarioFicha,
} from "@/features/establishment/employees/api/types/funcionario"
import type { Permission, PermissionStatus } from "@/features/establishment/institution/api/types/permission"

/** Fila de `fn_fun_detalle` (V579.5): catálogos como `fk_x` + `x_nombre`. */
interface FichaRow {
  pk_empleado: number
  fk_tlv_tipo_documento: number | null
  tipo_documento_nombre: string | null
  tipo_documento: string | null
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
  contacto_protegido: boolean
  usuario_soporte: boolean
  fk_tarchivo_foto: number | null
  estado: EstadoFuncionario
  ee_oficial: boolean
  fk_tlv_clase_funcionario: number | null
  clase_funcionario_nombre: string | null
  fk_tlv_nivel_esenanza: number | null
  nivel_esenanza_nombre: string | null
  fk_tlv_estatuto_docente: number | null
  estatuto_docente_nombre: string | null
  fk_tlv_grado_escalafon: number | null
  grado_escalafon_nombre: string | null
  fk_tlv_nivel_educativo: number | null
  nivel_educativo_nombre: string | null
  fk_tlv_fuente_recurso: number | null
  fuente_recurso_nombre: string | null
  fk_tlv_tipo_vinculacion: number | null
  tipo_vinculacion_nombre: string | null
  direccion: string | null
  designaciones: string[] | null
  permisos: {
    id: number
    orden: number
    role: CatalogItem
    campus: { id: number; name: string; dane: string | null }
    workSchedule: CatalogItem
    status: PermissionStatus
    principalDe?: "RECTOR" | "SECRETARIA" | null
  }[] | null
  archivos: Anexo[] | null
  puede_editar: boolean
  puede_corregir_identidad: boolean
}

const toPermission = (row: NonNullable<FichaRow["permisos"]>[number]): Permission => ({
  id: row.id,
  order: row.orden,
  role: row.role,
  campus: {
    id: row.campus.id,
    name: row.campus.name,
    dane: row.campus.dane ?? "",
    zone: null,
    neighborhood: "",
    commune: "",
    address: "",
    phone: "",
  },
  workSchedule: row.workSchedule,
  status: row.status,
  principalDe: row.principalDe ?? null,
})

const toFicha = (row: FichaRow): FuncionarioFicha => ({
  id: row.pk_empleado,
  documentTypeId: row.fk_tlv_tipo_documento,
  documentTypeCode: row.tipo_documento ?? "",
  documentTypeName: row.tipo_documento_nombre ?? "",
  identification: row.identificacion,
  firstName: row.primer_nombre,
  middleName: row.segundo_nombre ?? "",
  lastName: row.primer_apellido,
  secondLastName: row.segundo_apellido ?? "",
  birthDate: row.fecha_nacimiento?.slice(0, 10) ?? "",
  genderId: row.fk_tlv_genero,
  genderName: row.genero_nombre ?? "",
  email: row.correo_electronico ?? "",
  phone: row.telefono ?? "",
  contactProtected: row.contacto_protegido === true,
  isSupport: row.usuario_soporte === true,
  photoArchivoId: row.fk_tarchivo_foto,
  status: row.estado,
  establishmentIsOfficial: row.ee_oficial === true,
  complementary: {
    employeeClassId: row.fk_tlv_clase_funcionario,
    teachingLevelId: row.fk_tlv_nivel_esenanza,
    statuteId: row.fk_tlv_estatuto_docente,
    gradeId: row.fk_tlv_grado_escalafon,
    educationLevelId: row.fk_tlv_nivel_educativo,
    fundingSourceId: row.fk_tlv_fuente_recurso,
    employmentTypeId: row.fk_tlv_tipo_vinculacion,
    address: row.direccion ?? "",
  },
  complementaryNames: {
    employeeClassId: row.clase_funcionario_nombre ?? "",
    teachingLevelId: row.nivel_esenanza_nombre ?? "",
    statuteId: row.estatuto_docente_nombre ?? "",
    gradeId: row.grado_escalafon_nombre ?? "",
    educationLevelId: row.nivel_educativo_nombre ?? "",
    fundingSourceId: row.fuente_recurso_nombre ?? "",
    employmentTypeId: row.tipo_vinculacion_nombre ?? "",
  },
  designations: row.designaciones ?? [],
  permissions: (row.permisos ?? []).map(toPermission),
  annexes: row.archivos ?? [],
  canEdit: row.puede_editar === true,
  canCorrectIdentity: row.puede_corregir_identidad === true,
})

export async function fetchFuncionarioFicha(id: number, establishmentId: number): Promise<FuncionarioFicha> {
  return toFicha(
    await evalCol.getRow<FichaRow>(`/establecimientos/funcionarios/${id}/ficha?establecimiento=${establishmentId}`),
  )
}

export function useFuncionarioFichaQuery(id: number | null, establishmentId: number | null) {
  return useQuery({
    queryKey: employeeKeys.ficha(id, establishmentId),
    queryFn: () => fetchFuncionarioFicha(id as number, establishmentId as number),
    enabled: id != null && establishmentId != null,
  })
}
