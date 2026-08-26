import { faker } from "@faker-js/faker"

import type {
  CreateMatriculaInput,
  Matricula,
  MatriculaDetails,
  MatriculaStatus,
} from "@/features/coverage/api/types/matricula"
import { CAMPUSES, GRADES, GROUPS, INSTITUTIONS, levelForGrade, pickShift } from "@/mocks/db/reservations"
import { RELATIONSHIP_OPTIONS } from "@/features/coverage/api/ui-mappings"

function pickStatus(): MatriculaStatus {
  return faker.helpers.weightedArrayElement([
    { value: "activo", weight: 80 },
    { value: "retirado", weight: 12 },
    { value: "trasladado", weight: 8 },
  ])
}

function createGuardianName(): string {
  return `${faker.person.firstName()} ${faker.person.lastName()}`.toUpperCase()
}

function createMatricula(): Matricula {
  const grade = faker.helpers.arrayElement(GRADES)
  const educationLevel = levelForGrade(grade)

  return {
    id: faker.string.uuid(),
    documentNumber: faker.string.numeric({ length: 10, allowLeadingZeros: false }),
    firstName: `${faker.person.firstName()} ${faker.person.middleName()}`.toUpperCase(),
    lastName: `${faker.person.lastName()} ${faker.person.lastName()}`.toUpperCase(),
    institution: faker.helpers.arrayElement(INSTITUTIONS),
    campus: faker.helpers.arrayElement(CAMPUSES),
    shift: pickShift(educationLevel),
    educationLevel,
    grade,
    group: faker.helpers.arrayElement(GROUPS),
    enrollmentDate: faker.date.recent({ days: 90 }).toISOString(),
    guardian: `${createGuardianName()} (${faker.helpers.arrayElement(RELATIONSHIP_OPTIONS)})`,
    status: pickStatus(),
  }
}

faker.seed(20260825)

export const matriculaDb: Matricula[] = Array.from({ length: 260 }, createMatricula)

/**
 * Ficha completa por id — solo se llena para las matrículas creadas desde
 * "Agregar estudiante" en esta sesión de mock. Las 260 filas semilla no
 * tienen una (se generaron directo como fila resumen); `getMatriculaDetails`
 * arma una ficha mínima a partir de la fila para esos casos.
 */
const matriculaDetailsDb = new Map<string, MatriculaDetails>()

/** Deriva la fila resumen de la tabla a partir de la ficha completa del alta. */
export function createMatriculaRow(id: string, details: MatriculaDetails): Matricula {
  const grade = Number(details.academic.grade)
  const guardianName = [details.guardian.firstName, details.guardian.lastName].filter(Boolean).join(" ")

  return {
    id,
    documentNumber: details.student.documentNumber,
    firstName: [details.student.firstName, details.student.secondName].filter(Boolean).join(" "),
    lastName: [details.student.lastName, details.student.secondLastName].filter(Boolean).join(" "),
    // El alta no pide institución: se matricula siempre en la institución
    // actual — acá se simula con la primera del fixture de reservas.
    institution: INSTITUTIONS[0],
    campus: details.academic.campus,
    shift: details.academic.shift || "UNICA",
    educationLevel: levelForGrade(grade),
    grade,
    group: details.academic.group,
    enrollmentDate: new Date().toISOString(),
    guardian: details.guardian.relationship ? `${guardianName} (${details.guardian.relationship})` : guardianName,
    status: details.status,
  }
}

export function insertMatricula(input: CreateMatriculaInput): Matricula {
  const id = crypto.randomUUID()
  const details: MatriculaDetails = { ...input, status: input.academic.status || "activo" }
  const row = createMatriculaRow(id, details)

  matriculaDetailsDb.set(id, details)
  matriculaDb.unshift(row)
  return row
}

export function updateMatriculaDetails(id: string, input: CreateMatriculaInput): Matricula | null {
  const index = matriculaDb.findIndex((item) => item.id === id)
  if (index < 0) return null

  // "Estado de la matrícula" ya es un campo del formulario (sección
  // "Información de matrícula") — si no se tocó, se conserva el que ya
  // tenía la fila.
  const details: MatriculaDetails = {
    ...input,
    status: input.academic.status || matriculaDb[index].status,
  }
  const row = createMatriculaRow(id, details)

  matriculaDetailsDb.set(id, details)
  matriculaDb[index] = row
  return row
}

function createEmptyMatriculaDetails(): CreateMatriculaInput {
  return {
    academic: { campus: "", shift: "", grade: "", group: "", status: "", specialty: "" },
    student: {
      documentType: "",
      documentNumber: "",
      firstName: "",
      secondName: "",
      lastName: "",
      secondLastName: "",
      documentExpedition: { department: "", municipality: "" },
      birthDate: "",
      birthPlace: { department: "", municipality: "" },
      gender: "",
      ethnicity: "",
    },
    studentAddress: { department: "", municipality: "", address: "" },
    studentContact: { phone: "", email: "" },
    previousYear: { situation: "", condition: "", previousInstitution: "", welfareInstitution: "" },
    originSector: { fromPrivateSector: "", fromAnotherMunicipality: "", whichMunicipality: "" },
    conflictVictim: { population: "", lastExpellingMunicipality: "" },
    complementary: {
      socioeconomicStratum: "",
      sisben: "",
      eps: "",
      ars: "",
      specialConditions: "",
      talent: "",
    },
    benefits: {
      subsidized: "",
      fundingSource: "",
      headOfHouseholdStudent: "",
      headOfHouseholdChildren: "",
      publicForceVeteran: "",
      nationalHeroes: "",
    },
    guardian: {
      relationship: "",
      firstName: "",
      secondName: "",
      lastName: "",
      secondLastName: "",
      documentType: "",
      documentNumber: "",
      documentExpedition: { department: "", municipality: "" },
    },
    guardianAddress: { department: "", municipality: "", address: "" },
    guardianContact: { phone: "", email: "" },
    guardianEmployment: {
      profession: "",
      entityName: "",
      entityAddress: "",
      entityPhone: "",
      entityPosition: "",
    },
  }
}

/** Ficha mínima a partir de la fila resumen — usada cuando la matrícula no
 * tiene una ficha completa guardada (las 260 filas semilla). */
function synthesizeMatriculaDetails(row: Matricula): MatriculaDetails {
  const [firstName = "", secondName = ""] = row.firstName.split(" ")
  const [lastName = "", secondLastName = ""] = row.lastName.split(" ")
  const [guardianName = ""] = row.guardian.split(" (")

  return {
    ...createEmptyMatriculaDetails(),
    academic: {
      campus: row.campus,
      shift: row.shift,
      grade: String(row.grade),
      group: row.group,
      status: row.status,
      specialty: "",
    },
    student: {
      ...createEmptyMatriculaDetails().student,
      documentNumber: row.documentNumber,
      firstName,
      secondName,
      lastName,
      secondLastName,
    },
    guardian: {
      ...createEmptyMatriculaDetails().guardian,
      firstName: guardianName,
    },
    status: row.status,
  }
}

export function getMatriculaDetails(id: string): { matricula: Matricula; details: MatriculaDetails } | null {
  const row = matriculaDb.find((item) => item.id === id)
  if (!row) return null

  const details = matriculaDetailsDb.get(id) ?? synthesizeMatriculaDetails(row)
  return { matricula: row, details }
}

/**
 * Matrícula "activo" ya existente para ese documento — la misma idea que el
 * autocompletado por documento de funcionarios/rector, pero acá el hallazgo
 * BLOQUEA el alta en vez de autocompletarla: dos matrículas activas del
 * mismo estudiante en el mismo año lectivo no tienen sentido.
 */
export function findActiveMatriculaByDocument(documentNumber: string): Matricula | null {
  const needle = documentNumber.trim()
  if (!needle) return null
  return matriculaDb.find((item) => item.documentNumber === needle && item.status === "activo") ?? null
}

export function deleteMatriculaById(id: string) {
  const index = matriculaDb.findIndex((item) => item.id === id)
  if (index >= 0) {
    matriculaDb.splice(index, 1)
  }
  matriculaDetailsDb.delete(id)
}

export function updateMatriculaRow(id: string, patch: Partial<Matricula>): Matricula | null {
  const index = matriculaDb.findIndex((item) => item.id === id)
  if (index < 0) return null

  const updated = { ...matriculaDb[index], ...patch }
  matriculaDb[index] = updated

  const details = matriculaDetailsDb.get(id)
  if (details && patch.status) {
    matriculaDetailsDb.set(id, {
      ...details,
      status: patch.status,
      academic: { ...details.academic, status: patch.status },
    })
  }

  return updated
}
