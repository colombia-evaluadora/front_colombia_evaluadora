/**
 * Sintaxis de consulta de los buscadores, al estilo Gmail: los filtros no son
 * chips debajo de la barra, son texto dentro del propio input —
 * `estado:(Activo) desde:(2026-08-06)`—.
 *
 * Que sean texto tiene una consecuencia buscada: quitar un filtro es borrar
 * sus caracteres, sin una X por término ni una fila de chips que empuje la
 * tabla hacia abajo cada vez que se filtra. Y a la vez obliga a que el par
 * serializar/parsear sea reversible, porque el input se re-sincroniza con los
 * filtros de la URL cada vez que cambian.
 *
 * Cada buscador declara su `QuerySyntax`: qué claves existen, cómo se lee cada
 * valor y cuál es el campo de búsqueda libre —lo que se escribe sin clave—.
 * Los helpers de abajo (`textTerm`, `optionTerm`, `optionsTerm`) cubren los
 * tres casos que aparecen en la app; `wildcard` queda para las claves
 * dinámicas (los filtros por campo de la auditoría por tabla).
 */

/** Una opción de un catálogo: lo que se guarda y lo que se escribe/lee. */
export interface QueryOption {
  value: string
  label: string
}

/** Un término con clave fija: `estado:(Activo)`. */
export interface QueryTerm<F> {
  key: string
  /** Filtros → valores visibles. Un término emitido por valor. */
  toValues: (filters: F) => string[]
  /**
   * Valor escrito → parche sobre lo parseado hasta ahora. `undefined` cuando
   * el valor no se reconoce: el término se deja como texto tal cual estaba.
   */
  fromValue: (value: string, draft: F) => Partial<F> | undefined
}

/** El campo que recibe lo que se escribe sin clave. También tiene la suya. */
export interface FreeTextTerm<F> {
  key: string
  field: keyof F & string
}

/** Claves que no se conocen de antemano (p. ej. columnas de una tabla). */
export interface WildcardTerm<F> {
  /** Filtros → términos completos, ya con su clave. */
  toTerms: (filters: F) => string[]
  /** Clave desconocida + valor → parche; `undefined` si no aplica. */
  fromTerm: (key: string, value: string, draft: F) => Partial<F> | undefined
}

export interface QuerySyntax<F> {
  /** Filtros vacíos: el parseo arranca de acá, así que tiene que traer todos
   *  los campos. Lo que no cubra ningún término se pierde al escribir. */
  empty: F
  terms: QueryTerm<F>[]
  freeText: FreeTextTerm<F>
  wildcard?: WildcardTerm<F>
}

// Un término es `clave:(valor)`. La clave no lleva espacios ni paréntesis; el
// valor es todo hasta el primer `)`, así que no admite paréntesis anidados —
// suficiente para los valores que manejan estos buscadores.
const TERM_RE = /([^\s:()]+):\(([^)]*)\)/g

/** Filtros → el texto que se ve dentro del input. */
export function buildQuery<F extends object>(syntax: QuerySyntax<F>, filters: F): string {
  const terms: string[] = []

  for (const term of syntax.terms) {
    for (const value of term.toValues(filters)) {
      if (value !== "") terms.push(`${term.key}:(${value})`)
    }
  }
  if (syntax.wildcard) terms.push(...syntax.wildcard.toTerms(filters))

  // La búsqueda libre también se escribe con clave, para que la consulta se
  // lea entera como una lista de términos y no quede un fragmento suelto cuyo
  // significado hay que adivinar. Va al final: es lo que más se reescribe.
  const free = String(record(filters)[syntax.freeText.field] ?? "").trim()
  if (free) terms.push(`${syntax.freeText.key}:(${free})`)

  return terms.join(" ")
}

/** El texto del input → filtros. Inversa de `buildQuery`. */
export function parseQuery<F extends object>(syntax: QuerySyntax<F>, query: string): F {
  let draft = { ...syntax.empty }
  let hasFreeTerm = false

  // Lo que quede fuera de los términos es la búsqueda libre.
  const rest = query.replace(TERM_RE, (match, rawKey: string, rawValue: string) => {
    const key = normalizeKey(rawKey)
    const value = rawValue.trim()

    if (key === normalizeKey(syntax.freeText.key)) {
      draft = patched(draft, { [syntax.freeText.field]: value } as Partial<F>)
      hasFreeTerm = true
      return ""
    }

    const term = syntax.terms.find((candidate) => normalizeKey(candidate.key) === key)
    // Un término que no resuelve a nada conocido se deja como texto: mientras
    // el usuario escribe, `estado:(Act` todavía no es válido y descartarlo
    // silenciosamente borraría lo que acaba de teclear.
    const patch = term
      ? term.fromValue(value, draft)
      : syntax.wildcard?.fromTerm(rawKey, value, draft)
    if (!patch) return match

    draft = patched(draft, patch)
    return ""
  })

  // Escribir texto suelto, sin clave, sigue valiendo como búsqueda libre: es
  // lo que espera quien no conoce la sintaxis. El término explícito manda si
  // están los dos.
  if (!hasFreeTerm) {
    const free = rest.replace(/\s+/g, " ").trim()
    draft = patched(draft, { [syntax.freeText.field]: free } as Partial<F>)
  }

  return draft
}

/**
 * ¿Dos conjuntos de filtros dicen lo mismo? Se comparan por su consulta, que
 * es la representación canónica: si se escriben igual, filtran igual. Se usa
 * para no pisar lo tecleado cuando el texto ya significa lo que hay en la URL
 * (si no, normalizar el espaciado movería el cursor al final en cada tecla).
 */
export function sameFilters<F extends object>(syntax: QuerySyntax<F>, a: F, b: F): boolean {
  return buildQuery(syntax, a) === buildQuery(syntax, b)
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers para declarar términos
// ───────────────────────────────────────────────────────────────────────────

interface TextTermOptions {
  /** Valor guardado → texto en el input (p. ej. `3` → `3°`). */
  format?: (value: string) => string
  /** Texto escrito → valor guardado; `undefined` lo deja como texto libre. */
  parse?: (text: string) => string | undefined
}

/** Campo de texto libre con clave: `nombre:(Ana)`. */
export function textTerm<F extends object>(
  key: string,
  field: keyof F & string,
  { format, parse }: TextTermOptions = {},
): QueryTerm<F> {
  return {
    key,
    toValues: (filters) => {
      const value = String(record(filters)[field] ?? "").trim()
      if (!value) return []
      return [format ? format(value) : value]
    },
    fromValue: (value) => {
      if (!parse) return { [field]: value } as Partial<F>
      const parsed = parse(value)
      return parsed === undefined ? undefined : ({ [field]: parsed } as Partial<F>)
    },
  }
}

/** Campo de una sola opción: `estado:(Activo)`. */
export function optionTerm<F extends object>(
  key: string,
  field: keyof F & string,
  options: QueryOption[],
): QueryTerm<F> {
  return {
    key,
    toValues: (filters) => {
      const value = String(record(filters)[field] ?? "")
      if (!value) return []
      return [labelOf(options, value)]
    },
    fromValue: (value) => {
      const option = matchOption(options, value)
      return option ? ({ [field]: option.value } as Partial<F>) : undefined
    },
  }
}

/** Campo multivalor: un término por opción elegida. */
export function optionsTerm<F extends object>(
  key: string,
  field: keyof F & string,
  options: QueryOption[],
): QueryTerm<F> {
  return {
    key,
    toValues: (filters) => valuesOf(filters, field).map((value) => labelOf(options, value)),
    fromValue: (value, draft) => {
      const option = matchOption(options, value)
      if (!option) return undefined
      const current = valuesOf(draft, field)
      if (current.includes(option.value)) return {}
      return { [field]: [...current, option.value] } as Partial<F>
    },
  }
}

// ───────────────────────────────────────────────────────────────────────────

// Las claves se comparan sin mayúsculas ni tildes: quien escribe `operacion`
// quiere decir `operación`, y obligarlo a poner el acento sería un filtro que
// no funciona sin razón visible.
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

// El usuario escribe la etiqueta ("Activo"), no la clave ("ACTIVE"); se acepta
// cualquiera de las dos, sin distinguir mayúsculas ni tildes.
function matchOption(options: QueryOption[], value: string): QueryOption | undefined {
  const needle = normalizeKey(value)
  return options.find(
    (option) => normalizeKey(option.label) === needle || normalizeKey(option.value) === needle,
  )
}

// Un valor que ya no está en el catálogo se muestra crudo en vez de
// desaparecer del input: es preferible ver `estado:(XYZ)` a filtrar por algo
// que no se ve en ningún lado.
function labelOf(options: QueryOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value
}

function valuesOf<F extends object>(filters: F, field: string): string[] {
  const value = record(filters)[field]
  return Array.isArray(value) ? (value as string[]) : []
}

function record<F extends object>(filters: F): Record<string, unknown> {
  return filters as Record<string, unknown>
}

function patched<F extends object>(draft: F, patch: Partial<F>): F {
  return { ...draft, ...patch }
}
