import { faker } from "@faker-js/faker"

import type { CatalogItem } from "@/features/establishment/api/types/catalog"
import type {
  Employee,
  EmployeeListItem,
} from "@/features/establishment/api/types/employee"
import type { Person } from "@/features/establishment/api/types/person"
import { campusesDb } from "./campuses"
import { DOCUMENT_TYPES } from "./catalogs/document-types"
import { EDUCATION_LEVELS } from "./catalogs/education-levels"
import { EMPLOYEE_CLASSES } from "./catalogs/employee-classes"
import { EMPLOYEE_GRADES } from "./catalogs/employee-grades"
import { EMPLOYEE_ROLES } from "./catalogs/employee-roles"
import { EMPLOYMENT_TYPES } from "./catalogs/employment-types"
import { FUNDING_SOURCES } from "./catalogs/funding-sources"
import { FUNCTIONAL_POSITIONS } from "./catalogs/functional-positions"
import { GENDERS } from "./catalogs/genders"
import { WORK_SCHEDULES } from "./catalogs/work-schedules"

faker.seed(20260729)

function createCatalogItem(items: CatalogItem[]): CatalogItem {
  return faker.helpers.arrayElement(items)
}

function createPerson(): Person {
  const firstName = faker.person.firstName()
  const middleName = faker.datatype.boolean() ? faker.person.middleName() : undefined
  const lastName = faker.person.lastName()
  const secondLastName = faker.datatype.boolean() ? faker.person.lastName() : undefined

  return {
    id: faker.string.uuid(),
    documentType: createCatalogItem(DOCUMENT_TYPES),
    identification: faker.string.numeric({ length: 10, allowLeadingZeros: false }),
    firstName,
    middleName,
    lastName,
    secondLastName,
    birthDate: faker.date.birthdate({ min: 25, max: 65, mode: "age" }).toISOString(),
    gender: createCatalogItem(GENDERS),
    email: faker.internet.email({ firstName, lastName }),
    phone: faker.phone.number({ style: "international" }),
    password: faker.internet.password({ length: 12 }),
  }
}

function createEmployee(index: number): Employee {
  const campusesPool = faker.helpers.shuffle([...campusesDb]).slice(0, faker.number.int({ min: 1, max: 3 }))

  return {
    id: `employee-${index}`,
    person: createPerson(),
    employeeClass: createCatalogItem(EMPLOYEE_CLASSES),
    educationLevel: createCatalogItem(EDUCATION_LEVELS),
    grade: createCatalogItem(EMPLOYEE_GRADES),
    highestEducationLevel: createCatalogItem(EDUCATION_LEVELS),
    fundingSource: createCatalogItem(FUNDING_SOURCES),
    functionalPosition: createCatalogItem(FUNCTIONAL_POSITIONS),
    employmentType: createCatalogItem(EMPLOYMENT_TYPES),
    address: faker.location.streetAddress(),
    permissions: campusesPool.map((campus, permissionIndex) => ({
      order: permissionIndex + 1,
      role: createCatalogItem(EMPLOYEE_ROLES),
      campus,
      workSchedule: createCatalogItem(WORK_SCHEDULES),
      status: faker.number.int({ min: 1, max: 100 }) <= 90 ? "ACTIVE" : "SUSPENDED",
    })),
    status: faker.number.int({ min: 1, max: 100 }) <= 85 ? "ACTIVE" : "SUSPENDED",
  }
}

export function createEmployeeRow(employee: Employee): EmployeeListItem {
  const campusNames = [...new Set(employee.permissions.map((permission) => permission.campus.name))]

  /**
   * Roles del funcionario, agregados desde sus permisos y deduplicados por
   * `code` preservando el orden. Si no hay permisos todavía (caso del primer
   * Guardar del flujo de creación), caemos a un placeholder con `code`
   * vacío para no romper el render de la tabla.
   */
  const rolesByCode = new Map<string, CatalogItem>()
  for (const permission of employee.permissions) {
    if (!rolesByCode.has(permission.role.code)) {
      rolesByCode.set(permission.role.code, permission.role)
    }
  }
  const roles: CatalogItem[] =
    rolesByCode.size > 0
      ? Array.from(rolesByCode.values())
      : [createCatalogItem(EMPLOYEE_ROLES)]

  /**
   * Estados del funcionario, agregados desde sus permisos y deduplicados
   * preservando el orden de aparición. Si todavía no hay permisos
   * (primer Guardar sin catálogos), la lista queda vacía y la celda
   * muestra "—" como placeholder.
   */
  const statuses = Array.from(
    new Set(employee.permissions.map((permission) => permission.status))
  )

  const primaryPermission = employee.permissions[0]
  const name = [
    employee.person.firstName,
    employee.person.middleName,
    employee.person.lastName,
    employee.person.secondLastName,
  ]
    .filter(Boolean)
    .join(" ")

  return {
    id: employee.id,
    documentNumber: employee.person.identification,
    name,
    roles,
    campuses: campusNames,
    workSchedule: primaryPermission?.workSchedule ?? createCatalogItem(WORK_SCHEDULES),
    statuses,
  }
}

const employeeRecords = Array.from({ length: 20 }, (_, index) => {
  const employee = createEmployee(index + 1)

  return {
    employee,
    row: createEmployeeRow(employee),
  }
})

export const employeesDb: Employee[] = employeeRecords.map((record) => record.employee)

export const employeesRowsDb: EmployeeListItem[] = employeeRecords.map((record) => record.row)

export function upsertEmployeeDetails(employee: Employee) {
  const employeeIndex = employeesDb.findIndex((item) => item.id === employee.id)

  if (employeeIndex >= 0) {
    employeesDb[employeeIndex] = employee
  } else {
    employeesDb.unshift(employee)
  }

  const row = createEmployeeRow(employee)
  const rowIndex = employeesRowsDb.findIndex((item) => item.id === employee.id)

  if (rowIndex >= 0) {
    employeesRowsDb[rowIndex] = row
  } else {
    employeesRowsDb.unshift(row)
  }

  return employee
}

export function deleteEmployeeDetails(id: string) {
  const employeeIndex = employeesDb.findIndex((item) => item.id === id)
  const rowIndex = employeesRowsDb.findIndex((item) => item.id === id)

  if (employeeIndex >= 0) {
    employeesDb.splice(employeeIndex, 1)
  }

  if (rowIndex >= 0) {
    employeesRowsDb.splice(rowIndex, 1)
  }
}

export function deleteManyEmployeeDetails(ids: string[]) {
  const idSet = new Set(ids)

  for (let index = employeesDb.length - 1; index >= 0; index -= 1) {
    if (idSet.has(employeesDb[index].id)) {
      employeesDb.splice(index, 1)
    }
  }

  for (let index = employeesRowsDb.length - 1; index >= 0; index -= 1) {
    if (idSet.has(employeesRowsDb[index].id)) {
      employeesRowsDb.splice(index, 1)
    }
  }
}