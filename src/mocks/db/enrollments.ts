import { faker } from "@faker-js/faker"

import type { Enrollment, EnrollmentStatus } from "@/features/coverage/api/types/enrollment"
import { CAMPUSES, GROUPS, GRADES, levelForGrade, pickShift } from "@/mocks/db/reservations"

function pickStatus(): EnrollmentStatus {
  return faker.helpers.weightedArrayElement([
    { value: "recibida", weight: 35 },
    { value: "en_revision", weight: 25 },
    { value: "aceptada", weight: 30 },
    { value: "rechazada", weight: 10 },
  ])
}

function createEnrollment(): Enrollment {
  const grade = faker.helpers.arrayElement(GRADES)
  const educationLevel = levelForGrade(grade)

  return {
    id: faker.string.uuid(),
    documentNumber: faker.string.numeric({ length: 10, allowLeadingZeros: false }),
    firstName: `${faker.person.firstName()} ${faker.person.middleName()}`.toUpperCase(),
    lastName: `${faker.person.lastName()} ${faker.person.lastName()}`.toUpperCase(),
    campus: faker.helpers.arrayElement(CAMPUSES),
    grade,
    group: faker.helpers.arrayElement(GROUPS),
    shift: pickShift(educationLevel),
    enrollmentDate: faker.date.recent({ days: 60 }).toISOString(),
    status: pickStatus(),
  }
}

faker.seed(20260728)

export const enrollmentsDb: Enrollment[] = Array.from({ length: 320 }, createEnrollment)
