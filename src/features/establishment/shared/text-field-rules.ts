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

/**
 * El acento agudo, la comilla invertida y la comilla de apertura son el
 * apóstrofo que dan muchos teclados (`D´ANGELO`): se escriben como `'` en
 * vez de borrarse, para que no parezca que el campo no acepta apóstrofos.
 */
export const normalizarApostrofos = (value: string) => value.replace(/[´`‘ʼ]/g, "'")

/**
 * Sin espacios al inicio ni dobles: así un campo no se puede llenar solo de
 * espacios (y guardarse "en blanco" con contenido).
 */
export const limpiarEspacios = (value: string) =>
  value.replace(/\s/g, " ").replace(/^ +/, "").replace(/ {2,}/g, " ")

/** Lo que el input deja escribir en cada tipo de campo; la forma la dicen los `validar*`. */
export const toTextoInput = (value: string, max = 130) =>
  limpiarEspacios(normalizarApostrofos(value).replace(/[^\p{L}\p{N}\s.,'’()&#/º°-]/gu, "")).slice(0, max)
export const toDireccionInput = (value: string, max = 130) =>
  limpiarEspacios(value.replace(/[^\p{L}\p{N}\s.,#/º°-]/gu, "")).slice(0, max)
export const toIdentificacionInput = (value: string, max = 130) =>
  limpiarEspacios(value.replace(/[^\p{L}\p{N}\s.,#/º°()-]/gu, "")).slice(0, max)

const contarLetras = (texto: string) => texto.match(LETRA)?.length ?? 0

/**
 * Símbolos de relleno: dos iguales seguidos (`--`, `..`, `''`) o tres
 * cualesquiera (`'-.`), sin contar espacios para que `- - -` no se escape.
 */
function tieneSimbolosSeguidos(texto: string): boolean {
  const compacto = texto.replace(/\s+/g, "")
  return /([^\p{L}\p{N}])\1/u.test(compacto) || /[^\p{L}\p{N}]{3,}/u.test(compacto)
}

/** Partes del texto separadas por espacios y signos. */
const partesDe = (texto: string) => texto.split(/[^\p{L}\p{N}]+/u).filter(Boolean)

const ROMANO = /^[IVXLCDM]+$/i
const VOCAL = /[aeiouyw]/i
const esLatina = (letras: string) => /^\p{Script=Latin}+$/u.test(letras)

/**
 * Una palabra que no se lee: la misma letra tres veces seguidas (`aaa`,
 * `cccc`; salvo un romano como `III`) o cuatro letras latinas o más sin
 * ninguna vocal (`ghhggh`, `KKSK`). Las abreviaturas de tres (`CRA`, `BLQ`)
 * pasan, y un alfabeto sin vocales escritas (chino, árabe) no se mira.
 */
export function esPalabraSinSentido(parte: string): boolean {
  if (/(\p{L})\1{2,}/iu.test(parte) && !ROMANO.test(parte)) return true
  const letras = parte.normalize("NFD").replace(/[^\p{L}]/gu, "")
  if (letras.length < 4 || !esLatina(letras) || ROMANO.test(letras)) return false
  return !VOCAL.test(letras)
}

const tieneLetraRepetida = (texto: string) => partesDe(texto).some(esPalabraSinSentido)

/** Una palabra que se lee: tres letras o más, con vocal (`Prado`, `Suba`, `Comuna`). */
const esPalabraLegible = (parte: string) =>
  /^\p{L}{3,}$/u.test(parte) && (!esLatina(parte) || VOCAL.test(parte.normalize("NFD")))

const empiezaBien = (texto: string) => /^[\p{L}\p{N}]/u.test(texto)

/** Lo común: sin relleno de símbolos ni letras y arrancando por letra o dígito. */
function relleno(texto: string, campo: string): string | null {
  if (!empiezaBien(texto)) return `${campo} debe empezar por una letra o un número.`
  if (tieneSimbolosSeguidos(texto)) return `${campo} no puede tener símbolos seguidos.`
  if (tieneLetraRepetida(texto)) return `${campo} tiene palabras que no se leen (letras repetidas o sin vocales).`
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

/** Número corto, solo o con sufijo de letra: `5`, `12A`, `2026`. */
const esNumeroCorto = (parte: string) => /^\p{N}{1,4}\p{L}{0,2}$/u.test(parte)

/**
 * Barrio, comuna y localidad: "Comuna 5", "5", "20 de Julio" o "El Prado"
 * valen. Cada parte es una palabra o un número corto, y al menos una se lee
 * o es número: `99998uuu` o `ç çç/f` no.
 */
export function validarLugar(valor: string | null | undefined, campo: string): string | null {
  if (enBlanco(valor)) return null
  const texto = (valor ?? "").trim()
  if (!TEXTO.test(texto)) return `${campo} solo admite letras, números y . , ' ( ) & # / -`
  const comun = relleno(texto, campo)
  if (comun) return comun
  const partes = partesDe(texto)
  if (!partes.every((p) => /^\p{L}+$/u.test(p) || esNumeroCorto(p))) {
    return `${campo} no puede mezclar así números y letras (ej. Comuna 5, Sector 12A).`
  }
  if (!partes.some((p) => esPalabraLegible(p) || esNumeroCorto(p))) {
    return `${campo} debe ser un nombre o un número (ej. El Prado, Comuna 5).`
  }
  return null
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
  const partes = partesDe(texto)
  if (partes.length < 2 || contarLetras(texto) === 0) return ejemplo
  // Ninguna parte de una dirección tiene más de 6 cifras.
  const placaRara = partes.some(
    (p) => DIGITO.test(p) && (contarLetras(p) > 3 || p.replace(/\D/g, "").length > 6),
  )
  if (placaRara) return ejemplo
  // La urbana lleva números (`CL 10`); la rural, palabras que se lean (`Vereda El Rosal`).
  return DIGITO.test(texto) || partes.some(esPalabraLegible) ? null : ejemplo
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
