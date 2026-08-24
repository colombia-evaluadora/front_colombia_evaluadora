import { faker } from "@faker-js/faker"

import type {
  EducationLevel,
  Reservation,
  ReservationStatus,
  Shift,
} from "@/features/coverage/api/types/reservation"

export const INSTITUTIONS = [
  "I.E. San José",
  "I.E. Simón Bolívar",
  "I.E. Antonio Nariño",
  "I.E. Policarpa Salavarrieta",
  "I.E. Camilo Torres",
] as const

export const CAMPUSES = ["Principal", "Norte", "Sur", "Oriental", "Occidental", "Sede B", "Sede C"]

export const GROUPS = ["01", "02", "03", "04"]

export const GRADES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

/** Cupos ofertados por sede — denominador del % de reservas confirmadas. */
export const OFFERED_SEATS_BY_CAMPUS: Record<string, number> = {
  Principal: 320,
  Norte: 180,
  Sur: 160,
  Oriental: 140,
  Occidental: 140,
  "Sede B": 110,
  "Sede C": 90,
}

// El nivel educativo se deriva del grado (no son independientes): así los
// dos gráficos de distribución cuentan la misma realidad.
export function levelForGrade(grade: number): EducationLevel {
  if (grade === 0) return "PREESCOLAR"
  if (grade <= 5) return "BASICA_PRIMARIA"
  if (grade <= 9) return "BASICA_SECUNDARIA"
  return "MEDIA"
}

// La jornada nocturna solo aplica a media/secundaria — un niño de transición
// en jornada nocturna sería ruido en los gráficos.
export function pickShift(level: EducationLevel): Shift {
  const pool: Shift[] =
    level === "MEDIA" || level === "BASICA_SECUNDARIA"
      ? ["MANANA", "TARDE", "UNICA", "COMPLETA", "NOCTURNA"]
      : ["MANANA", "TARDE", "UNICA", "COMPLETA"]
  return faker.helpers.weightedArrayElement(
    pool.map((shift, index) => ({ value: shift, weight: pool.length - index })),
  )
}

function pickStatus(): ReservationStatus {
  return faker.helpers.weightedArrayElement([
    { value: "confirmada", weight: 45 },
    { value: "pendiente", weight: 40 },
    { value: "vencida", weight: 15 },
  ])
}

function createReservation(): Reservation {
  const grade = faker.helpers.arrayElement(GRADES)
  const educationLevel = levelForGrade(grade)

  return {
    id: faker.string.uuid(),
    // Los TI/CC colombianos de menores arrancan en 10… — 10 dígitos.
    documentNumber: faker.string.numeric({ length: 10, allowLeadingZeros: false }),
    firstName: `${faker.person.firstName()} ${faker.person.middleName()}`.toUpperCase(),
    lastName: `${faker.person.lastName()} ${faker.person.lastName()}`.toUpperCase(),
    institution: faker.helpers.arrayElement(INSTITUTIONS),
    campus: faker.helpers.arrayElement(CAMPUSES),
    grade,
    group: faker.helpers.arrayElement(GROUPS),
    shift: pickShift(educationLevel),
    educationLevel,
    reservedAt: faker.date.recent({ days: 60 }).toISOString(),
    status: pickStatus(),
  }
}

faker.seed(20260727)

export const reservationsDb: Reservation[] = Array.from({ length: 480 }, createReservation)
