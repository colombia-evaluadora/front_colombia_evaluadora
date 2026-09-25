import { faker } from "@faker-js/faker"

import {
  DOCUMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  RELATIONSHIP_OPTIONS,
  RESIDENCE_OPTIONS,
} from "@/features/coverage/api/ui-mappings"
import type { Enrollment, EnrollmentStatus } from "@/features/coverage/api/types/enrollment"
import {
  CAMPUSES,
  GROUPS,
  GRADES,
  INSTITUTIONS,
  levelForGrade,
  pickShift,
} from "@/mocks/db/reservations"

function pickStatus(): EnrollmentStatus {
  return faker.helpers.weightedArrayElement([
    { value: "sin_asignar_cupo", weight: 45 },
    { value: "cupo_asignado", weight: 55 },
  ])
}

function createEnrollment(): Enrollment {
  const grade = faker.helpers.arrayElement(GRADES)
  const educationLevel = levelForGrade(grade)
  const originEducationLevel = levelForGrade(faker.helpers.arrayElement(GRADES))

  const firstName = faker.person.firstName().toUpperCase()
  const lastName = faker.person.lastName().toUpperCase()
  const guardianFirstName = faker.person.firstName().toUpperCase()
  const guardianLastName = faker.person.lastName().toUpperCase()

  return {
    id: faker.string.uuid(),

    // Datos del estudiante
    documentType: faker.helpers.arrayElement(DOCUMENT_TYPE_OPTIONS),
    documentNumber: faker.string.numeric({ length: 10, allowLeadingZeros: false }),
    firstName,
    secondName: faker.person.middleName().toUpperCase(),
    lastName,
    secondLastName: faker.person.lastName().toUpperCase(),
    birthDate: faker.date.birthdate({ min: 5, max: 18, mode: "age" }).toISOString().slice(0, 10),
    gender: faker.helpers.arrayElement(GENDER_OPTIONS),
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    phone: faker.string.numeric({ length: 10, allowLeadingZeros: false }),
    residence: faker.helpers.arrayElement(RESIDENCE_OPTIONS),
    address: faker.location.streetAddress(),
    campus: faker.helpers.arrayElement(CAMPUSES),
    grade,
    group: faker.helpers.arrayElement(GROUPS),
    shift: pickShift(educationLevel),
    enrollmentDate: faker.date.recent({ days: 60 }).toISOString(),
    status: pickStatus(),

    // Datos de la institución educativa de origen
    originInstitution: faker.helpers.arrayElement(INSTITUTIONS),
    originEmail: faker.internet.email().toLowerCase(),
    originShift: pickShift(originEducationLevel),
    originEducationLevel,

    // Datos del acudiente
    guardianDocumentType: faker.helpers.arrayElement(DOCUMENT_TYPE_OPTIONS),
    guardianDocumentNumber: faker.string.numeric({ length: 10, allowLeadingZeros: false }),
    guardianFirstName,
    guardianSecondName: faker.person.middleName().toUpperCase(),
    guardianLastName,
    guardianSecondLastName: faker.person.lastName().toUpperCase(),
    guardianLivesWithStudent: faker.datatype.boolean(),
    guardianRelationship: faker.helpers.arrayElement(RELATIONSHIP_OPTIONS),
    guardianEmail: faker.internet.email({ firstName: guardianFirstName, lastName: guardianLastName }).toLowerCase(),
    guardianPhone: faker.string.numeric({ length: 10, allowLeadingZeros: false }),
    guardianAddress: faker.location.streetAddress(),
  }
}

faker.seed(20260728)

export const enrollmentsDb: Enrollment[] = Array.from({ length: 320 }, createEnrollment)
