/**
 * Composición de los campos de texto libre del establecimiento (nombre,
 * barrio, comuna, localidad, dirección, resolución, licencia).
 *
 * Filtrar caracteres al escribir no alcanza: con solo letras, dígitos y unos
 * pocos separadores igual se arma "cccccccccc----" o "6767676ghhggh". Por eso,
 * además del juego de caracteres de cada campo, se mira la forma del dato:
 * que empiece por letra o dígito, que no traiga símbolos seguidos ni letras
 * repetidas de relleno, y lo mínimo que cada campo necesita para ser lo que
 * dice ser (letras en un nombre, el número en una resolución).
 *
 * Cada regla devuelve el mensaje del error o `null`; un valor en blanco es
 * válido acá (la obligatoriedad se decide aparte).
 */

const LETRA = /\p{L}/gu
const DIGITO = /\p{N}/u

/** Letras, dígitos, espacios y los separadores de un nombre propio o un lugar. */
const TEXTO = /^[\p{L}\p{N}\s.,'’()&#/º°-]*$/u
/** Dirección: sin comillas ni paréntesis (`CL 10 # 15-20`, `Mz A L 27`, `Km 5 vía al mar`). */
const DIRECCION = /^[\p{L}\p{N}\s.,#/º°-]*$/u
/** Identificación administrativa (`Resolución 1234 de 2010`, `0045/2019`, `No. 12-A`). */
const IDENTIFICACION = /^[\p{L}\p{N}\s.,#/º°()-]*$/u

/** Lo que el input deja escribir en cada tipo de campo; la forma la dicen los `validar*`. */
export const toTextoInput = (value: string, max = 130) =>
  value.replace(/[^\p{L}\p{N}\s.,'’()&#/º°-]/gu, "").slice(0, max)
export const toDireccionInput = (value: string, max = 130) =>
  value.replace(/[^\p{L}\p{N}\s.,#/º°-]/gu, "").slice(0, max)
export const toIdentificacionInput = (value: string, max = 130) =>
  value.replace(/[^\p{L}\p{N}\s.,#/º°()-]/gu, "").slice(0, max)

const contarLetras = (texto: string) => texto.match(LETRA)?.length ?? 0

/**
 * Símbolos de relleno: dos iguales seguidos (`--`, `..`, `''`) o tres
 * cualesquiera (`'-.`), sin contar espacios para que `- - -` no se escape.
 */
function tieneSimbolosSeguidos(texto: string): boolean {
  const compacto = texto.replace(/\s+/g, "")
  return /([^\p{L}\p{N}])\1/u.test(compacto) || /[^\p{L}\p{N}]{3,}/u.test(compacto)
}

/** La misma letra cuatro veces seguidas (`cccc`): ninguna palabra la tiene. */
const tieneLetraRepetida = (texto: string) => /(\p{L})\1{3,}/iu.test(texto)

const empiezaBien = (texto: string) => /^[\p{L}\p{N}]/u.test(texto)

/** Lo común: sin relleno de símbolos ni letras y arrancando por letra o dígito. */
function relleno(texto: string, campo: string): string | null {
  if (!empiezaBien(texto)) return `${campo} debe empezar por una letra o un número.`
  if (tieneSimbolosSeguidos(texto)) return `${campo} no puede tener símbolos seguidos.`
  if (tieneLetraRepetida(texto)) return `${campo} no puede repetir la misma letra tantas veces.`
  return null
}

const enBlanco = (valor: string | null | undefined) => valor == null || valor.trim() === ""

/**
 * Nombre del establecimiento: al menos tres letras (un nombre se lee, no es
 * solo un número) y el juego de caracteres de un nombre propio.
 */
export function validarNombreEstablecimiento(valor: string | null | undefined): string | null {
  if (enBlanco(valor)) return null
  const texto = (valor ?? "").trim()
  if (!TEXTO.test(texto)) return "El nombre solo admite letras, números y . , ' ( ) & # / -"
  if (contarLetras(texto) < 3) return "El nombre debe tener al menos tres letras."
  return relleno(texto, "El nombre")
}

/** Barrio, comuna y localidad: "Comuna 5", "5" o "El Prado" valen; símbolos sueltos no. */
export function validarLugar(valor: string | null | undefined, campo: string): string | null {
  if (enBlanco(valor)) return null
  const texto = (valor ?? "").trim()
  if (!TEXTO.test(texto)) return `${campo} solo admite letras, números y . , ' ( ) & # / -`
  return relleno(texto, campo)
}

/**
 * Dirección: al menos dos partes (`CL 10`, `Mz A L 27`; una rural puede no
 * llevar números) y ninguna parte que mezcle un número con más de tres
 * letras: `26D`, `7A` o `45BIS` son placas; `6767676ghhggh` no.
 */
export function validarDireccion(valor: string | null | undefined): string | null {
  if (enBlanco(valor)) return null
  const texto = (valor ?? "").trim()
  const ejemplo = "Ingresa una dirección válida (ej. CL 10 # 15-20 o Mz A L 27)."
  if (!DIRECCION.test(texto)) return "La dirección solo admite letras, números y # - . , / º"
  const comun = relleno(texto, "La dirección")
  if (comun) return comun
  const partes = texto.split(/[\s#.,/º°-]+/u).filter(Boolean)
  if (partes.length < 2 || contarLetras(texto) === 0) return ejemplo
  const placaRara = partes.some((p) => DIGITO.test(p) && contarLetras(p) > 3)
  return placaRara ? ejemplo : null
}

/** Lo que deja escribir la ubicación: dígitos, punto, coma, signo y espacios. */
export const toUbicacionInput = (value: string, max = 60) => value.replace(/[^\d.,\s-]/g, "").slice(0, max)

/**
 * Ubicación de una sede (`TSEDE.GEOREFERENCIACION`): "latitud, longitud" en
 * grados decimales, como la copia Google Maps (`4.7110, -74.0721`), dentro
 * de los rangos de una coordenada real.
 */
export function validarUbicacion(valor: string | null | undefined): string | null {
  if (enBlanco(valor)) return null
  const m = (valor ?? "").trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/)
  const ejemplo = "Ingresa la ubicación como latitud, longitud (ej. 4.7110, -74.0721)."
  if (!m) return ejemplo
  const [lat, lng] = [Number(m[1]), Number(m[2])]
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? null : ejemplo
}

/**
 * Resolución de aprobación y licencia de funcionamiento: identificaciones
 * administrativas, así que llevan el número (al menos un dígito) y solo
 * letras, dígitos y separadores de numeración.
 */
export function validarIdentificacionAdministrativa(
  valor: string | null | undefined,
  campo: string,
): string | null {
  if (enBlanco(valor)) return null
  const texto = (valor ?? "").trim()
  if (!IDENTIFICACION.test(texto)) return `${campo} solo admite letras, números y - / . # º`
  if (!DIGITO.test(texto)) return `${campo} debe incluir su número.`
  return relleno(texto, campo)
}
