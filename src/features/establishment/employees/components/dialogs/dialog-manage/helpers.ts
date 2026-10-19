import type { EmployeeAdditionalInfoValue } from "@/features/establishment/employees/components/forms/form-employee-additional-info"
import type { EmployeeStatus } from "@/features/establishment/employees/api/types/employee"
import type { Permission } from "@/features/establishment/institution/api/types/permission"
import type { Person } from "@/features/establishment/employees/api/types/person"

/** TROL.CODIGO del director de grupo: ese permiso lo gestiona el grupo, no este diálogo. */
export const DIRECTOR_GRUPO_ROLE_CODE = "DIRECTOR_GRUPO"

/**
 * ¿La información complementaria trae algo? Se usa al abrir el diálogo en modo
 * edición: si el funcionario ya llega con estos datos del backend, la sección
 * cuenta como guardada.
 */
export function hasAdditionalInfoData(value: EmployeeAdditionalInfoValue): boolean {
  return Boolean(
    value.address.trim() ||
      value.employeeClass?.id ||
      value.educationLevel?.id ||
      value.grade?.id ||
      value.highestEducationLevel?.id ||
      value.fundingSource?.id ||
      value.functionalPosition?.id ||
      value.employmentType?.id,
  )
}

/** Columnas por las que se puede ordenar la tabla de permisos. */
export type PermissionSortKey = "order" | "role" | "campus" | "workSchedule" | "status"

/** El valor plano por el que ordena cada columna (los catálogos son objetos). */
export function permissionSortValue(permission: Permission, key: PermissionSortKey): unknown {
  switch (key) {
    case "order":
      return permission.order
    case "role":
      return permission.role.name
    case "campus":
      return permission.campus.name
    case "workSchedule":
      return permission.workSchedule.name
    case "status":
      return permission.status
  }
}

export function createEmptyPerson(): Person {
  return {
    documentType: null,
    identification: "",
    firstName: "",
    middleName: "",
    lastName: "",
    secondLastName: "",
    birthDate: "",
    gender: null,
    email: "",
    phone: "",
  }
}

export function createInitialAdditionalInfo(): EmployeeAdditionalInfoValue {
  return {
    employeeClass: null,
    educationLevel: null,
    grade: null,
    highestEducationLevel: null,
    fundingSource: null,
    functionalPosition: null,
    employmentType: null,
    address: "",
  }
}

export function buildDraftSnapshot(
  person: Person,
  additionalInfo: EmployeeAdditionalInfoValue,
  permissions: Permission[],
): string {
  const { accountExists: _accountExists, ...personRest } = person
  return JSON.stringify({ person: personRest, additionalInfo, permissions })
}

export function buildEmployeeStatus(permissions: Permission[]): EmployeeStatus {
  return permissions.some((permission) => permission.status === "ACTIVE")
    ? "ACTIVE"
    : "SUSPENDED"
}
