import type { CreateMatriculaInput } from "@/features/coverage/matricula/api/types/matricula"

// Formatos de los bloques 2.1 a 2.15 (docs/Matricula.md, tablas de cada bloque).
// La obligatoriedad va aparte (config del establecimiento); esto solo valida lo
// que ya tiene valor.

/** Letras (con tildes y ñ), espacios, apóstrofo y guion. */
export const NOMBRE_PERMITIDO = /[^\p{L}\s'’-]/gu
/** Teléfono: «+» opcional al inicio y 7 a 15 dígitos. */
const TELEFONO_REGEX = /^\+?\d{7,15}$/
export const EDAD_MAXIMA = 80

/** Quita lo que no es letra, espacio, apóstrofo o guion. */
export const aNombre = (valor: string) => valor.replace(NOMBRE_PERMITIDO, "")
/** «+» solo al inicio y dígitos. */
export const aTelefono = (valor: string) => {
  const limpio = valor.replace(/[^\d+]/g, "")
  return (limpio.startsWith("+") ? "+" : "") + limpio.replace(/\+/g, "")
}
/** Documento de extranjero (PPT, PEP, pasaporte, NES): letras y dígitos en mayúscula. */
export const aDocumentoAlfanumerico = (valor: string) => valor.replace(/[^A-Za-z0-9]/g, "").toUpperCase()

/** Tipos de documento de extranjero, por nombre del catálogo TIPO_DOCUMENTO. */
export const esTipoDocExtranjero = (nombre: string) =>
  /pasaporte|ppt|pep|permiso|nes\b|extranjer|n[uú]mero establecido/i.test(nombre)

/** Lo que la validación necesita de los catálogos (sale de `useMatriculaValidacionOpciones`). */
export interface MatriculaValidacionOpciones {
  /** ids de TIPO_DOCUMENTO de extranjero: su documento es alfanumérico. */
  tiposDocExtranjero?: Set<string>
  /** ids de POB_VICT_CONF que no son víctima («No aplica»). */
  poblacionNoVictima?: Set<string>
  /** id de Colombia en la lista PAIS. */
  paisColombia?: string
  /** ids de SITUACION_SRPA que son «No aplica». */
  srpaNoAplica?: Set<string>
}

export function documentoValido(numero: string, extranjero: boolean) {
  return extranjero ? /^[A-Z0-9]{5,20}$/i.test(numero) : /^\d{5,20}$/.test(numero)
}

export function esVictima(population: string, opciones?: MatriculaValidacionOpciones) {
  return Boolean(population) && !opciones?.poblacionNoVictima?.has(population)
}

export function fechaMinimaNacimiento(hoy = new Date()) {
  const d = new Date(hoy)
  d.setFullYear(d.getFullYear() - EDAD_MAXIMA)
  return d
}

interface Regla {
  get: (v: CreateMatriculaInput) => string
  /** null si está bien; si no, el mensaje (sin el nombre del campo). */
  check: (valor: string, values: CreateMatriculaInput) => string | null
}

const largo = (min: number, max: number) => (valor: string) =>
  valor.length < min || valor.length > max ? `debe tener entre ${min} y ${max} caracteres` : null
const nombre = (valor: string) =>
  /[^\p{L}\s'’-]/u.test(valor)
    ? "solo admite letras, espacios, apóstrofo y guion"
    : largo(2, 50)(valor)
const telefono = (valor: string) => (TELEFONO_REGEX.test(valor) ? null : "debe tener entre 7 y 15 dígitos (puede iniciar con +)")

export const MATRICULA_FORMATOS: Record<string, Regla> = {
  "student-first-name": { get: (v) => v.student.firstName, check: nombre },
  "student-second-name": { get: (v) => v.student.secondName, check: nombre },
  "student-last-name": { get: (v) => v.student.lastName, check: nombre },
  "student-second-last-name": { get: (v) => v.student.secondLastName, check: nombre },
  "guardian-first-name": { get: (v) => v.guardian.firstName, check: nombre },
  "guardian-second-name": { get: (v) => v.guardian.secondName, check: nombre },
  "guardian-last-name": { get: (v) => v.guardian.lastName, check: nombre },
  "guardian-second-last-name": { get: (v) => v.guardian.secondLastName, check: nombre },
  "student-residence-address": { get: (v) => v.studentAddress.address, check: largo(8, 150) },
  "student-residence-neighborhood": { get: (v) => v.studentAddress.neighborhood ?? "", check: largo(5, 100) },
  "guardian-residence-address": { get: (v) => v.guardianAddress.address, check: largo(8, 150) },
  "student-contact-phone": { get: (v) => v.studentContact.phone, check: telefono },
  "guardian-contact-phone": { get: (v) => v.guardianContact.phone, check: telefono },
  "previous-institution": { get: (v) => v.previousYear.previousInstitution, check: largo(3, 150) },
  "origin-which-municipality": { get: (v) => v.originSector.whichMunicipality, check: largo(3, 100) },
  "complementary-eps": { get: (v) => v.complementary.eps, check: largo(2, 100) },
  "complementary-ars": { get: (v) => v.complementary.ars, check: largo(2, 100) },
  "guardian-employment-entity-name": { get: (v) => v.guardianEmployment.entityName, check: largo(3, 150) },
  "guardian-employment-entity-address": { get: (v) => v.guardianEmployment.entityAddress, check: largo(8, 150) },
  "guardian-employment-entity-phone": { get: (v) => v.guardianEmployment.entityPhone, check: telefono },
  "complementary-srpa-start": {
    get: (v) => v.complementary.srpaInicio ?? "",
    check: (valor) => (valor > new Date().toISOString().slice(0, 10) ? "no puede ser una fecha futura" : null),
  },
  "complementary-srpa-end": {
    get: (v) => v.complementary.srpaFin ?? "",
    check: (valor, v) =>
      v.complementary.srpaInicio && valor < v.complementary.srpaInicio
        ? "no puede ser anterior a la fecha de inicio"
        : null,
  },
  "student-birth-date": {
    get: (v) => v.student.birthDate,
    check: (valor) => {
      const hoy = new Date().toISOString().slice(0, 10)
      if (valor > hoy) return "no puede ser una fecha futura"
      if (valor < fechaMinimaNacimiento().toISOString().slice(0, 10)) return `no puede ser de hace más de ${EDAD_MAXIMA} años`
      return null
    },
  },
}

/** Mensaje de formato del campo, o null si está vacío o bien. */
export function errorDeFormato(id: string, values: CreateMatriculaInput): string | null {
  const regla = MATRICULA_FORMATOS[id]
  if (!regla) return null
  const valor = regla.get(values).trim()
  return valor ? regla.check(valor, values) : null
}
