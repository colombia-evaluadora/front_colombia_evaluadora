import {
  FIELD_FILTER_CONDITIONS,
  FIELD_FILTER_CONDITION_LABELS,
  OPERATION_TYPES,
  type FieldFilterCondition,
  type TableOperationsFiltersFormValues,
} from "../../api/schema"
import type { OperationType } from "../../api/types/audit-table"

/**
 * Sintaxis de consulta del buscador de operaciones, al estilo Gmail: los
 * filtros no son chips ni controles aparte, son texto dentro del propio input
 * —`author_ip:(215) operación:(Inserción) desde:(2026-08-06)`—.
 *
 * Que sean texto tiene una consecuencia buscada: quitar un filtro es borrar
 * sus caracteres, sin necesidad de una X por término. Y a la vez obliga a que
 * el par serializar/parsear sea reversible, porque el input se re-sincroniza
 * con los filtros de la URL cada vez que cambian.
 *
 * Lo que no reconoce como término cae en `author`, que es la búsqueda libre.
 */

// Un término es `clave:(valor)`. La clave no lleva espacios ni paréntesis; el
// valor es todo hasta el primer `)`, así que no admite paréntesis anidados —
// suficiente para los valores que maneja este buscador.
const TERM_RE = /([^\s:()]+):\(([^)]*)\)/g

// Claves reservadas. El resto de claves se interpreta como nombre de campo
// para los "filtros por campo".
// La clave es la misma que el parámetro de la URL (`?author=`), para que lo que
// se escribe en el input y lo que queda en la barra de direcciones se lean igual.
const AUTHOR_KEY = "author_ip"
const OPERATION_KEY = "operación"
const FROM_KEY = "desde"
const TO_KEY = "hasta"

// Dentro de un filtro por campo el valor es `Condición "texto"`.
const FIELD_VALUE_RE = /^(.*?)\s*"(.*)"$/

type OperationOption = { key: OperationType; label: string }

/** Filtros → el texto que se ve dentro del input. */
export function buildQuery(
  filters: TableOperationsFiltersFormValues,
  operationOptions: OperationOption[],
): string {
  const terms: string[] = []

  for (const operation of filters.operations) {
    const label = operationOptions.find((o) => o.key === operation)?.label ?? operation
    terms.push(`${OPERATION_KEY}:(${label})`)
  }
  if (filters.occurredFrom) terms.push(`${FROM_KEY}:(${filters.occurredFrom})`)
  if (filters.occurredTo) terms.push(`${TO_KEY}:(${filters.occurredTo})`)
  for (const fieldFilter of filters.fieldFilters) {
    const condition = FIELD_FILTER_CONDITION_LABELS[fieldFilter.condition]
    terms.push(`${fieldFilter.field}:(${condition} "${fieldFilter.value}")`)
  }

  // El autor/IP también se escribe con clave, para que la consulta se lea
  // entera como una lista de términos y no quede un fragmento suelto cuyo
  // significado hay que adivinar.
  const author = filters.author.trim()
  if (author) terms.push(`${AUTHOR_KEY}:(${author})`)

  return terms.join(" ")
}

/** El texto del input → filtros. Inversa de `buildQuery`. */
export function parseQuery(
  query: string,
  operationOptions: OperationOption[],
): TableOperationsFiltersFormValues {
  const filters: TableOperationsFiltersFormValues = {
    author: "",
    operations: [],
    occurredFrom: "",
    occurredTo: "",
    fieldFilters: [],
  }

  let hasAuthorTerm = false

  // Lo que quede fuera de los términos es la búsqueda libre.
  const freeText = query.replace(TERM_RE, (match, rawKey: string, rawValue: string) => {
    const key = rawKey.toLowerCase()
    const value = rawValue.trim()

    if (key === AUTHOR_KEY) {
      filters.author = value
      hasAuthorTerm = true
      return ""
    }

    if (key === OPERATION_KEY) {
      const operation = toOperation(value, operationOptions)
      // Un término que no resuelve a nada conocido se deja como texto libre:
      // mientras el usuario escribe, `operación:(Ins` todavía no es válido y
      // descartarlo silenciosamente borraría lo que acaba de teclear.
      if (!operation) return match
      if (!filters.operations.includes(operation)) filters.operations.push(operation)
      return ""
    }

    if (key === FROM_KEY) {
      filters.occurredFrom = value
      return ""
    }

    if (key === TO_KEY) {
      filters.occurredTo = value
      return ""
    }

    const fieldValue = FIELD_VALUE_RE.exec(value)
    if (!fieldValue) return match
    const condition = toCondition(fieldValue[1])
    if (!condition) return match
    filters.fieldFilters.push({ field: rawKey, condition, value: fieldValue[2] })
    return ""
  })

  // Escribir texto suelto, sin clave, sigue valiendo como búsqueda de
  // autor/IP: es lo que espera quien no conoce la sintaxis. El término
  // explícito manda si están los dos.
  const freeAuthor = freeText.replace(/\s+/g, " ").trim()
  if (!hasAuthorTerm) filters.author = freeAuthor

  return filters
}

/** ¿Dos conjuntos de filtros dicen lo mismo? Usado para no pisar lo tecleado. */
export function sameFilters(
  a: TableOperationsFiltersFormValues,
  b: TableOperationsFiltersFormValues,
): boolean {
  return (
    a.author === b.author &&
    a.occurredFrom === b.occurredFrom &&
    a.occurredTo === b.occurredTo &&
    sameSet(a.operations, b.operations) &&
    a.fieldFilters.length === b.fieldFilters.length &&
    a.fieldFilters.every((filter, i) => {
      const other = b.fieldFilters[i]
      return (
        filter.field === other.field &&
        filter.condition === other.condition &&
        filter.value === other.value
      )
    })
  )
}

function sameSet(a: OperationType[], b: OperationType[]) {
  return a.length === b.length && a.every((value) => b.includes(value))
}

// El usuario escribe la etiqueta ("Inserción"), no la clave ("INSERT"); se
// acepta cualquiera de las dos, sin distinguir mayúsculas.
function toOperation(value: string, options: OperationOption[]): OperationType | undefined {
  const needle = value.toLowerCase()
  const byLabel = options.find((option) => option.label.toLowerCase() === needle)
  if (byLabel) return byLabel.key
  return OPERATION_TYPES.find((operation) => operation.toLowerCase() === needle)
}

function toCondition(value: string): FieldFilterCondition | undefined {
  const needle = value.trim().toLowerCase()
  return FIELD_FILTER_CONDITIONS.find(
    (condition) =>
      FIELD_FILTER_CONDITION_LABELS[condition].toLowerCase() === needle ||
      condition.toLowerCase() === needle,
  )
}
