import {
  optionTerm,
  optionsTerm,
  textTerm,
  type QuerySyntax,
} from "@/components/search/query-syntax"

import {
  EDUCATION_LEVELS,
  RESERVATION_GROUP_BY,
  RESERVATION_STATUSES,
  SHIFTS,
  type ReservationFiltersFormInput,
} from "../../api/schema"
import {
  EDUCATION_LEVEL_LABELS,
  RESERVATION_GROUP_BY_LABELS,
  RESERVATION_STATUS_LABELS,
  SHIFT_LABELS,
  formatGrade,
} from "../../api/ui-mappings"

/**
 * Sintaxis del buscador de reservas: `grado:(3°) jornada:(Mañana)`, y lo que
 * se escribe suelto busca por número de identificación.
 * Ver `@/components/search/query-syntax`.
 */
export const reservationsSyntax: QuerySyntax<ReservationFiltersFormInput> = {
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
    // El grado se escribe como se lee en la tabla ("3°"), no como el número
    // que viaja en la URL.
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
      RESERVATION_STATUSES.map((status) => ({
        value: status,
        label: RESERVATION_STATUS_LABELS[status],
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

// Se acepta con o sin el símbolo de grado; lo que no sea un grado válido se
// deja como texto en vez de filtrar por algo que la URL no admite.
function toGrade(text: string): string | undefined {
  const value = text.trim().replace(/°$/, "")
  const grade = Number(value)
  return value !== "" && Number.isInteger(grade) && grade >= 0 && grade <= 11 ? value : undefined
}
