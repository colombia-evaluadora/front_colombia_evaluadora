/**
 * Concordancia gramatical para los rótulos que vienen del referente
 * curricular: el de la unidad ("Unidad temática"/"Proyecto pedagógico"/…,
 * `GET /planeador/unidades/tabs`) y el de la actividad ("Actividad"/
 * "Experiencia de aprendizaje"/…, `rotulo_ejecucion`). Ninguno de los dos es
 * un dato controlado —el referente puede traer cualquier texto—, así que no
 * hay catálogo de género ni de plural que consultar: estas funciones son
 * heurísticas del español sobre la PRIMERA palabra (el sustantivo núcleo),
 * pensadas para no romper con los valores reales conocidos y degradar con
 * dignidad ante uno nuevo (nada de "Actividads", ver el bug original).
 */

export type GeneroRotulo = "m" | "f"

/** Palabras que terminan en "-a" pero son masculinas (y viceversa para
 *  "-e"/"-o"): solo las que tienen alguna chance real de aparecer como
 *  rótulo pedagógico. */
const MASCULINOS_EN_A = new Set(["dia", "mapa", "tema", "problema", "programa", "sistema", "esquema"])
const FEMENINOS_EN_E = new Set(["clase", "fase", "base", "parte", "fuente", "llave", "calle", "gente", "noche"])
const FEMENINOS_EN_O = new Set(["mano", "foto"])

/** Conectores que cortan el sintagma nominal: en "Experiencia de
 *  aprendizaje" solo concuerda/pluraliza lo que va antes de "de". */
const CONECTORES = new Set(["de", "del", "con", "en", "para", "a", "al", "y", "e", "o", "u", "sin", "por", "sobre", "entre"])

function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "")
}

function primeraPalabra(rotulo: string): string {
  return sinTildes(rotulo.trim().split(/\s+/)[0] ?? "").toLowerCase()
}

/** Género del sustantivo núcleo del rótulo. Sin palabra (rótulo vacío) cae
 *  a femenino, el de los dos genéricos ("Actividad"/"Unidad temática"). */
export function generoRotulo(rotulo: string): GeneroRotulo {
  const palabra = primeraPalabra(rotulo)
  if (!palabra) return "f"
  if (MASCULINOS_EN_A.has(palabra)) return "m"
  if (FEMENINOS_EN_E.has(palabra) || FEMENINOS_EN_O.has(palabra)) return "f"
  if (/(a|dad|tad|tud|ion|umbre|sis|ez)$/.test(palabra)) return "f"
  return "m"
}

/** "la"/"el" — artículo definido singular. */
export function articuloDefinidoRotulo(rotulo: string): "la" | "el" {
  return generoRotulo(rotulo) === "m" ? "el" : "la"
}

/** "una"/"un" — artículo indefinido singular. */
export function articuloIndefinidoRotulo(rotulo: string): "una" | "un" {
  return generoRotulo(rotulo) === "m" ? "un" : "una"
}

/** "esta"/"este" — demostrativo singular. */
export function demostrativoRotulo(rotulo: string): "esta" | "este" {
  return generoRotulo(rotulo) === "m" ? "este" : "esta"
}

/** "de la"/"del" — "de el" no se escribe, se contrae. */
export function deArticuloRotulo(rotulo: string): "de la" | "del" {
  return generoRotulo(rotulo) === "m" ? "del" : "de la"
}

/** Terminación de género para participios/adjetivos ("vinculada"/
 *  "vinculado"). */
export function terminacionRotulo(rotulo: string): "a" | "o" {
  return generoRotulo(rotulo) === "m" ? "o" : "a"
}

/** Plural de UNA palabra. Reglas generales del español; las palabras
 *  terminadas en "-s"/"-x" (crisis, tórax) quedan iguales. */
function pluralizarPalabra(palabra: string): string {
  if (!palabra) return palabra
  const ultima = palabra.slice(-1)
  const ultimaBase = sinTildes(ultima).toLowerCase()
  const esMayuscula = palabra === palabra.toUpperCase() && palabra !== palabra.toLowerCase()
  const sufijo = (s: string) => (esMayuscula ? s.toUpperCase() : s)

  // "-í"/"-ú" tónicas: "rubí" → "rubíes" (forma culta).
  if (/[íúÍÚ]$/.test(palabra)) return palabra + sufijo("es")
  if (/[aeiouáéó]$/i.test(palabra)) return palabra + sufijo("s")
  if (ultimaBase === "s" || ultimaBase === "x") return palabra
  if (ultimaBase === "z") return palabra.slice(0, -1) + sufijo("ces")
  // Aguda con tilde en la última sílaba ("sesión", "rincón", "compás"): al
  // sumar una sílaba deja de llevarla.
  const aguda = palabra.match(/^(.*)([áéíóú])([nslr])$/i)
  if (aguda) return aguda[1] + sinTildes(aguda[2]) + aguda[3] + sufijo("es")
  return palabra + sufijo("es")
}

/**
 * Plural del rótulo, concordando sustantivo y adjetivos hasta el primer
 * conector: "Unidad temática" → "Unidades temáticas", "Proyecto
 * pedagógico" → "Proyectos pedagógicos", "Experiencia de aprendizaje" →
 * "Experiencias de aprendizaje". Respeta mayúsculas/minúsculas de entrada.
 */
export function pluralizarRotulo(rotulo: string): string {
  const palabras = rotulo.trim().split(/(\s+)/)
  let cortado = false
  return palabras
    .map((token) => {
      if (/^\s+$/.test(token) || token === "") return token
      if (cortado) return token
      if (CONECTORES.has(token.toLowerCase())) {
        cortado = true
        return token
      }
      return pluralizarPalabra(token)
    })
    .join("")
}
