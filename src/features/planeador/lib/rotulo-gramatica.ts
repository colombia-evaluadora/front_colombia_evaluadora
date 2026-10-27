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

/** Palabras terminadas en "-s" que son singulares (no se leen como plural
 *  del rótulo): además de las "-is"/"-us" ("Análisis", "Tesis", "Virus"). */
const SINGULARES_EN_S = new Set(["mes", "compas", "lunes", "martes", "miercoles", "jueves", "viernes"])

/** ¿El rótulo ya viene en plural? El usuario escribe el rótulo libremente
 *  ("Tareas", "Proyectos") y antes lo tratábamos siempre como singular, lo
 *  que daba "Nombre de la tareas". Heurística sobre el sustantivo núcleo:
 *  termina en "-s" y no es un singular conocido en "-s". */
export function esPluralRotulo(rotulo: string): boolean {
  const palabra = primeraPalabra(rotulo)
  if (palabra.length < 3 || !palabra.endsWith("s")) return false
  if (SINGULARES_EN_S.has(palabra) || /(is|us)$/.test(palabra)) return false
  return true
}

/** Singular aproximado del sustantivo núcleo, SOLO para decidir el género
 *  ("tareas" → "tarea", "talleres" → "taller", "actividades" → "actividad").
 *  Nunca se muestra: el texto visible usa el rótulo tal cual. */
function singularNucleo(palabra: string): string {
  const sinS = palabra.slice(0, -1)
  if (/[ao]$/.test(sinS) || FEMENINOS_EN_E.has(sinS)) return sinS
  if (palabra.endsWith("ces")) return `${palabra.slice(0, -3)}z`
  if (/[^aeiou]es$/.test(palabra)) return palabra.slice(0, -2)
  return sinS
}

/** Género del sustantivo núcleo del rótulo. Sin palabra (rótulo vacío) cae
 *  a femenino, el de los dos genéricos ("Actividad"/"Unidad temática"). */
export function generoRotulo(rotulo: string): GeneroRotulo {
  const crudo = primeraPalabra(rotulo)
  if (!crudo) return "f"
  const palabra = esPluralRotulo(rotulo) ? singularNucleo(crudo) : crudo
  if (MASCULINOS_EN_A.has(palabra)) return "m"
  if (FEMENINOS_EN_E.has(palabra) || FEMENINOS_EN_O.has(palabra)) return "f"
  if (/(a|dad|tad|tud|ion|umbre|sis|ez)$/.test(palabra)) return "f"
  return "m"
}

/** "la"/"el"/"las"/"los" — artículo definido concordado en género y número. */
export function articuloDefinidoRotulo(rotulo: string): "la" | "el" | "las" | "los" {
  const m = generoRotulo(rotulo) === "m"
  if (esPluralRotulo(rotulo)) return m ? "los" : "las"
  return m ? "el" : "la"
}

/** "una"/"un"/"unas"/"unos" — artículo indefinido concordado. */
export function articuloIndefinidoRotulo(rotulo: string): "una" | "un" | "unas" | "unos" {
  const m = generoRotulo(rotulo) === "m"
  if (esPluralRotulo(rotulo)) return m ? "unos" : "unas"
  return m ? "un" : "una"
}

/** "esta"/"este"/"estas"/"estos" — demostrativo concordado. */
export function demostrativoRotulo(rotulo: string): "esta" | "este" | "estas" | "estos" {
  const m = generoRotulo(rotulo) === "m"
  if (esPluralRotulo(rotulo)) return m ? "estos" : "estas"
  return m ? "este" : "esta"
}

/** "de la"/"del"/"de las"/"de los" — "de el" no se escribe, se contrae. */
export function deArticuloRotulo(rotulo: string): "de la" | "del" | "de las" | "de los" {
  const m = generoRotulo(rotulo) === "m"
  if (esPluralRotulo(rotulo)) return m ? "de los" : "de las"
  return m ? "del" : "de la"
}

/** Terminación de GÉNERO para participios/adjetivos en un texto que ya se
 *  arma en plural (`vinculad${t}s`, `tod${t}s`). */
export function terminacionRotulo(rotulo: string): "a" | "o" {
  return generoRotulo(rotulo) === "m" ? "o" : "a"
}

/** Terminación concordada en género Y número para un adjetivo/participio que
 *  acompaña al rótulo tal cual lo escribió el usuario ("Nueva Actividad" /
 *  "Nuevas Tareas", "vinculado" / "vinculados"). */
export function concordanciaRotulo(rotulo: string): "a" | "o" | "as" | "os" {
  const t = terminacionRotulo(rotulo)
  if (!esPluralRotulo(rotulo)) return t
  return t === "o" ? "os" : "as"
}

/** "ningún"/"ninguna"/"ningunos"/"ningunas" concordado con el rótulo. */
export function ningunRotulo(rotulo: string): string {
  const m = generoRotulo(rotulo) === "m"
  if (esPluralRotulo(rotulo)) return m ? "ningunos" : "ningunas"
  return m ? "ningún" : "ninguna"
}

/**
 * El rótulo tal como lo escribió el usuario en el referente curricular, para
 * embeberlo a mitad de oración. NUNCA se baja a minúscula: si el usuario
 * escribió "Tareas" o "Proyecto STEM", así se muestra en labels, botones y
 * mensajes (antes se forzaba `toLowerCase()` → "Nombre de la tareas").
 */
export function rotuloEnFrase(rotulo: string): string {
  return rotulo.trim()
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
  // Ya plural ("Tareas"): se respeta tal cual lo escribió el usuario.
  if (esPluralRotulo(rotulo)) return rotulo.trim()
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
