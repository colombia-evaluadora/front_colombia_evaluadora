import { format } from "date-fns"
import { z } from "zod"

import { CORREO_REGEX, MENSAJE_CORREO_INVALIDO } from "@/lib/email-address"
import {
  esPalabraSinSentido,
  limpiarEspacios,
  normalizarApostrofos,
} from "@/features/establishment/shared/text-field-rules"

/**
 * Las reglas de los campos de una persona, en un solo lugar.
 *
 * Existen porque las dos pantallas que dan de alta personas —funcionarios y
 * rector/secretaria de establecimiento— tenían cada una su propia validación,
 * y ya se habían desincronizado: institución verificaba el formato del correo
 * y funcionarios no, así que el mismo correo pasaba en una pantalla y lo
 * rechazaba el backend en la otra. Cuando eso ocurre, el usuario recibe el
 * mensaje técnico de Java en vez de uno que le diga qué corregir.
 *
 * Cada regla se aplica **solo si el campo tiene algo**: la obligatoriedad se
 * decide aparte, porque depende de si la persona es nueva o ya existe.
 */

/**
 * Tipos de documento que son solo dígitos (`TLISTA_VALOR.VALOR` de
 * TIPO_DOCUMENTO). El resto —CE, PA, PPT, PEP, SC2, CD, CCa— admite letras:
 * un pasaporte o un permiso de extranjero no son numéricos. Un tipo sin
 * código conocido (el detalle a veces trae solo el id) cae en la regla
 * alfanumérica, que es la más permisiva.
 */
const DOCUMENTOS_NUMERICOS = new Set(["CC", "TI", "RC", "NUIP", "NIP", "NES"])

export function esDocumentoNumerico(codigo: string | null | undefined): boolean {
  return DOCUMENTOS_NUMERICOS.has((codigo ?? "").trim().toUpperCase())
}

/** Documento numérico: entre 3 y 15 dígitos, sin separadores. */
export const DOCUMENTO = /^\d{3,15}$/

/** Documento alfanumérico: letras y dígitos, al menos un dígito, sin separadores. */
export const DOCUMENTO_ALFANUMERICO = /^(?=.*\d)[A-Za-z\d]{3,15}$/

/** Lo que el input de documento deja escribir según el tipo elegido. */
export function toDocumentoInput(value: string, codigo: string | null | undefined): string {
  const limpio = esDocumentoNumerico(codigo)
    ? value.replace(/\D/g, "")
    : value.replace(/[^A-Za-z\d]/g, "").toUpperCase()
  return limpio.slice(0, 15)
}

/**
 * Teléfono: 7 dígitos (fijo local) o 10 (celular, o fijo con el indicativo
 * 60X del plan de numeración vigente). Menos no marca a ningún lado.
 */
export const TELEFONO = /^(\d{7}|\d{10})$/

/**
 * Correo: la regla compartida con el SSO (`@/lib/email-address`), que
 * rechaza tildes y ñ antes de la @. Un patrón propio acá se desalinea del
 * backend y la diferencia se paga con un error al guardar en lugar de un
 * mensaje debajo del campo.
 */
export const CORREO = CORREO_REGEX

/**
 * Nombres y apellidos: palabras de letras de cualquier alfabeto (tildes,
 * diéresis, ñ, ç…) unidas por un espacio, un apóstrofo (' o ’) o un guion:
 * `Ka'el`, `D'Angelo`, `Jean-Pierre`, `De la Cruz`. Así el símbolo nunca
 * empieza, termina ni se repite, y no sirve para rellenar. Sin dígitos.
 */
export const NOMBRE = /^\p{L}+(?:[ '’-]\p{L}+)*$/u

/** Letras útiles mínimas de un nombre: los símbolos no cuentan. */
const MIN_LETRAS_NOMBRE = 2

/**
 * Lo que el input de nombres deja escribir; el formato fino lo dice `NOMBRE`.
 * El `´` de muchos teclados entra como apóstrofo, y no se puede empezar con
 * espacios ni repetirlos (un nombre "solo de espacios" no llega a escribirse).
 */
export function limpiarNombre(value: string): string {
  return limpiarEspacios(normalizarApostrofos(value).replace(/[^\p{L}\s'’-]/gu, ""))
}

/** `limpiarNombre` en mayúsculas, como escriben los nombres establecimiento y funcionarios. */
export const toNombreInput = (value: string) => limpiarNombre(value).toUpperCase()

export const MENSAJES = {
  documento: "El documento debe tener entre 3 y 15 dígitos, sin puntos ni espacios.",
  documentoAlfanumerico:
    "El documento debe tener entre 3 y 15 letras o números, con al menos un número y sin símbolos.",
  telefono: "El teléfono debe tener 7 dígitos (fijo) o 10 (celular o fijo con indicativo).",
  correo: MENSAJE_CORREO_INVALIDO,
  menorDeEdad: "La persona debe ser mayor de edad.",
  nombre: (campo: string) =>
    `${campo} solo admite letras, espacios, apóstrofo y guion entre letras (ej. D'Angelo, Jean-Pierre).`,
  nombreCorto: (campo: string) => `${campo} debe tener al menos ${MIN_LETRAS_NOMBRE} letras.`,
  nombreSinSentido: (campo: string) =>
    `${campo} no parece un nombre: tiene la misma letra tres veces seguidas o una palabra sin vocales.`,
} as const

/** Años que se exigen para considerar mayor de edad. */
export const EDAD_MINIMA = 18

const vacio = (valor: string | null | undefined) => valor == null || valor.trim() === ""

/** Mensaje de error de un nombre o apellido, o `null` si está bien (o vacío). */
export function validarNombrePersona(valor: string | null | undefined, campo: string): string | null {
  if (vacio(valor)) return null
  const texto = (valor ?? "").trim().replace(/\s+/g, " ")
  if (!NOMBRE.test(texto)) return MENSAJES.nombre(campo)
  if ((texto.match(/\p{L}/gu)?.length ?? 0) < MIN_LETRAS_NOMBRE) return MENSAJES.nombreCorto(campo)
  if (texto.split(/[ '’-]/).some(esPalabraSinSentido)) return MENSAJES.nombreSinSentido(campo)
  return null
}

/**
 * Fecha (`yyyy-MM-dd`) hasta la que se es mayor de edad hoy. Se compara como
 * texto, por día: `new Date("2008-10-22")` es medianoche UTC, y comparar
 * instantes dejaba el resultado del cumpleaños número 18 a merced de la hora.
 */
export function fechaLimiteMayorDeEdad(hoy = new Date()): string {
  const limite = new Date(hoy)
  limite.setFullYear(limite.getFullYear() - EDAD_MINIMA)
  return format(limite, "yyyy-MM-dd")
}

const NOMBRES = [
  ["firstName", "El primer nombre"],
  ["middleName", "El segundo nombre"],
  ["lastName", "El primer apellido"],
  ["secondLastName", "El segundo apellido"],
] as const

/**
 * Aplica las reglas de formato de una persona sobre un `ctx` de zod. No
 * valida obligatoriedad: un campo en blanco no produce ningún mensaje acá.
 *
 * `path` se arma con el nombre del campo tal cual lo usa cada formulario para
 * ubicar el mensaje debajo del input.
 */
export function validarFormatoPersona(
  persona: {
    documentType?: { code?: string | null } | null
    firstName?: string | null
    middleName?: string | null
    lastName?: string | null
    secondLastName?: string | null
    identification?: string | null
    phone?: string | null
    email?: string | null
    birthDate?: string | null
  },
  ctx: z.RefinementCtx,
): void {
  const revisar = (path: string, valor: string | null | undefined, regla: RegExp, message: string) => {
    if (!vacio(valor) && !regla.test((valor as string).trim())) {
      ctx.addIssue({ code: "custom", path: [path], message })
    }
  }

  if (esDocumentoNumerico(persona.documentType?.code)) {
    revisar("identification", persona.identification, DOCUMENTO, MENSAJES.documento)
  } else {
    revisar("identification", persona.identification, DOCUMENTO_ALFANUMERICO, MENSAJES.documentoAlfanumerico)
  }
  revisar("phone", persona.phone, TELEFONO, MENSAJES.telefono)
  revisar("email", persona.email, CORREO, MENSAJES.correo)

  for (const [path, campo] of NOMBRES) {
    const message = validarNombrePersona(persona[path], campo)
    if (message) ctx.addIssue({ code: "custom", path: [path], message })
  }

  if (!vacio(persona.birthDate)) {
    const nacimiento = (persona.birthDate as string).slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nacimiento) || nacimiento > fechaLimiteMayorDeEdad()) {
      ctx.addIssue({ code: "custom", path: ["birthDate"], message: MENSAJES.menorDeEdad })
    }
  }
}
