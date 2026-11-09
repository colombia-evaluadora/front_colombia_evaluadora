import type { Permission } from "@/features/establishment/institution/api/types/permission"

/** Estado del funcionario en el establecimiento: lo calcula el SSO con sus roles (Regla 101). */
export type EstadoFuncionario = "A" | "I"

export interface FuncionarioListItem {
  id: number
  /** Código del tipo de documento (`CC`, `CE`…), para mostrar "CC 80123456". */
  documentType: string
  documentNumber: string
  name: string
  /** Marca de Usuario de soporte (Regla 95). */
  isSupport: boolean
  roles: string[]
  /** "Responsable de grupo · 6A" (Regla 18). */
  designations: string[]
  status: EstadoFuncionario
}

export interface FuncionariosFilters {
  search?: string
  roles?: string[]
  workSchedules?: string[]
  statuses?: EstadoFuncionario[]
  campusId?: number
}

export interface FuncionariosQueryParams {
  establishmentId: number
  filters: FuncionariosFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

/** Documento anexo del funcionario, del establecimiento que lo cargó (Regla 81). */
export interface Anexo {
  id: number
  fileId: number
  name: string
  description: string
  fileName: string
  size: number | null
  createdAt: string
}

/** Información complementaria (sector Oficial, Regla 90): ids de Listas de valor. */
export interface Complementaria {
  employeeClassId: number | null
  teachingLevelId: number | null
  statuteId: number | null
  gradeId: number | null
  educationLevelId: number | null
  fundingSourceId: number | null
  employmentTypeId: number | null
  address: string
}

/** La ficha del funcionario vista desde un establecimiento (`fn_fun_detalle`). */
export interface FuncionarioFicha {
  id: number
  documentTypeId: number | null
  documentTypeCode: string
  documentTypeName: string
  identification: string
  firstName: string
  middleName: string
  lastName: string
  secondLastName: string
  /** `yyyy-MM-dd` o vacío. */
  birthDate: string
  genderId: number | null
  genderName: string
  email: string
  phone: string
  /** Correo y teléfono llegan enmascarados (Regla 11). */
  contactProtected: boolean
  isSupport: boolean
  photoArchivoId: number | null
  status: EstadoFuncionario
  establishmentIsOfficial: boolean
  complementary: Complementaria
  /** Etiquetas de la información complementaria, para la vista en solo lectura. */
  complementaryNames: Record<keyof Omit<Complementaria, "address">, string>
  designations: string[]
  permissions: Permission[]
  annexes: Anexo[]
  canEdit: boolean
  canCorrectIdentity: boolean
}

/** Persona encontrada por Tipo + Número al agregar un funcionario (Regla 11). */
export interface PersonaPorDocumento {
  userId: number
  funcionarioId: number | null
  documentTypeId: number
  identification: string
  firstName: string
  middleName: string
  lastName: string
  secondLastName: string
  birthDate: string
  genderId: number | null
  genderName: string
  emailProtected: string
  phoneProtected: string
  /**
   * Correo de la cuenta cuando la persona tiene cuenta pero no es funcionario: con él se le crea el
   * perfil (el front muestra solo el enmascarado). `null` si ya es funcionario.
   */
  accountEmail: string | null
  photoArchivoId: number | null
  /** Ya pertenece al establecimiento. */
  linked: boolean
}
