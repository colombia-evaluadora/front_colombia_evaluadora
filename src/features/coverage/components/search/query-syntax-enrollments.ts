import {
  optionTerm,
  optionsTerm,
  textTerm,
  type QuerySyntax,
} from "@/components/search/query-syntax"

import {
  EDUCATION_LEVELS,
  ENROLLMENT_STATUSES,
  RESERVATION_GROUP_BY,
  SHIFTS,
  type EnrollmentFiltersFormInput,
} from "@/features/coverage/api/schema"
import {
  EDUCATION_LEVEL_LABELS,
  RESERVATION_GROUP_BY_LABELS,
  SHIFT_LABELS,
  formatGrade,
} from "@/features/coverage/api/ui-mappings"
import { ENROLLMENT_STATUS_LABELS } from "@/features/coverage/api/ui-mappings-enrollments"

/**
 * Sintaxis del buscador de inscripciones: misma forma que el de reservas,
 * porque comparten campos. La diferencia es semántica: aquí "estado" hace
 * referencia al estado del estudiante en la inscripción (sin asignar cupo /
 * cupo asignado), no al de una reserva.
 */
export const enrollmentsSyntax: QuerySyntax<EnrollmentFiltersFormInput> = {
  empty: {
    firstName: "",
    lastName: "",
    documentNumber: "",
    institution: "",
    campus: "",
    grade: "",
    group: "",
    shifts: [],
    levels: [],
    statuses: [],
    reservedFrom: "",
    reservedTo: "",
    groupBy: "",
  },
  freeText: { key: "identificación", field: "documentNumber" },
  terms: [
    textTerm("nombre", "firstName"),
    textTerm("apellido", "lastName"),
    textTerm("institución", "institution"),
    textTerm("sede", "campus"),
    textTerm("grado", "grade", {
      format: (value) => formatGrade(Number(value)),
      parse: toGrade,
    }),
    textTerm("grupo", "group"),
    optionsTerm(
      "jornada",
      "shifts",
      SHIFTS.map((shift) => ({ value: shift, label: SHIFT_LABELS[shift] })),
    ),
    optionsTerm(
      "nivel",
      "levels",
      EDUCATION_LEVELS.map((level) => ({ value: level, label: EDUCATION_LEVEL_LABELS[level] })),
    ),
    optionsTerm(
      "estado",
      "statuses",
      ENROLLMENT_STATUSES.map((status) => ({
        value: status,
        label: ENROLLMENT_STATUS_LABELS[status],
      })),
    ),
    textTerm("desde", "reservedFrom"),
    textTerm("hasta", "reservedTo"),
    optionTerm(
      "agrupar_por",
      "groupBy",
      RESERVATION_GROUP_BY.map((groupBy) => ({
        value: groupBy,
        label: RESERVATION_GROUP_BY_LABELS[groupBy],
      })),
    ),
  ],
}

function toGrade(text: string): string | undefined {
  const value = text.trim().replace(/°$/, "")
  const grade = Number(value)
  return value !== "" && Number.isInteger(grade) && grade >= 0 && grade <= 11 ? value : undefined
}
