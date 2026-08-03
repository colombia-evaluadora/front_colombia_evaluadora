import type {
  RatingSymbol,
  RatingSymbolCategory,
} from "@/features/establishment/academic-period/api/types/rating-scales"

// Catálogo de íconos de escala de valoración. Las imágenes viven en `assets/`
// y Vite las resuelve a URLs servidas por el front (dev y build). Así el mock
// "consulta" los íconos como si el backend devolviera URLs de imagen.
//
// ── Convención de nombres de archivo ─────────────────────────────────────────
// Caritas   (assets/caras/):  "<n>_<expresion>/<n>_<expresion>_<color>.png"
//     ej: "02_muy_feliz/02_muy_feliz_verde.png"
//     · `<n>` es un prefijo numérico de 2 dígitos que define el orden de la
//       escala emocional (01=riendo, 02=muy feliz, …, 08=llorando).
//     · `<color>` debe ser uno de CARITA_COLOR_ORDER (define el orden de
//       columnas dentro de cada fila).
//     · `<expresion>` es el resto antes del último `_`; se humaniza con
//       espacios en el label.
//
// Letras    (assets/letras/): "letra_<LETRA>_<color>.png"
//     ej: "letra_A_azul.png", "letra_B_rosa.png"
//     · `<LETRA>` es una sola letra (A, B, D, E, I…).
//     · `<color>` define la tonalidad de la imagen; no se usa para separar
//       ni para el label (la letra sola alcanza).
// ─────────────────────────────────────────────────────────────────────────────

const caritaUrls = import.meta.glob("./assets/caras/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

const valoracionUrls = import.meta.glob("./assets/letras/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

// Indexa cada URL por el nombre de archivo (sin carpeta ni extensión).
function byBasename(modules: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [path, url] of Object.entries(modules)) {
    const name = path.split("/").pop()?.replace(/\.png$/i, "") ?? path
    out[name] = url
  }
  return out
}

// Orden de colores de las caritas: define el orden de las columnas dentro
// de cada fila del picker. Las letras no se separan por color — cada
// imagen ya viene coloreada y la letra sola basta como label.
const CARITA_COLOR_ORDER = [
  "amarillo",
  "verde",
  "azul",
  "naranja",
  "dorado",
  "rojo",
]

// Orden fijo de las letras: A, I, S, D, E, B, Bj. Es la convención del
// proyecto, no alfabética — por eso la definimos explícita y no usamos
// `localeCompare` sobre el label.
const LETRA_ORDER = ["A", "I", "S", "D", "E", "B", "Bj"]

function humanize(text: string): string {
  const words = text.replace(/_/g, " ").trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// Parsea "<n>_<expresion>_<color>". Devuelve `null` si el nombre no respeta
// la convención (en ese caso el archivo se ignora).
function parseCara(name: string):
  | { number: string; expression: string; color: string }
  | null {
  const match = name.match(/^(\d{2})_(.+)_([a-záéíóúñ]+)$/i)
  if (!match) return null
  const color = match[3].toLowerCase()
  if (!CARITA_COLOR_ORDER.includes(color)) return null
  return { number: match[1], expression: match[2], color }
}

function parseLetra(name: string): { letter: string; color: string } | null {
  const match = name.match(/^letra_([A-Z])_([a-záéíóúñ]+)$/i)
  if (!match) return null
  return { letter: match[1].toUpperCase(), color: match[2].toLowerCase() }
}

function colorRank(order: string[], color?: string): number {
  const index = color ? order.indexOf(color) : -1
  return index === -1 ? order.length : index
}

const caritaSymbols: RatingSymbol[] = []
for (const [name, valor] of Object.entries(byBasename(caritaUrls))) {
  const parsed = parseCara(name)
  if (!parsed) continue
  const { number, expression, color } = parsed
  caritaSymbols.push({
    id: `carita-${number}-${expression}-${color}`,
    categoria: "carita" as RatingSymbolCategory,
    kind: "imagen",
    valor,
    color,
    label: `${humanize(expression)} ${color}`,
  })
}
// Ordena por color (fila) y, dentro de cada color, por número de expresión
// (columna). Así el grid del picker queda con 5 filas, una por color, y
// cada fila recorre la escala emocional de izquierda a derecha.
caritaSymbols.sort((a, b) => {
  const an = a.id.match(/^carita-(\d{2})-/)![1]
  const bn = b.id.match(/^carita-(\d{2})-/)![1]
  return (
    colorRank(CARITA_COLOR_ORDER, a.color) -
    colorRank(CARITA_COLOR_ORDER, b.color) ||
    an.localeCompare(bn)
  )
})

const valoracionSymbols: RatingSymbol[] = []
for (const [name, valor] of Object.entries(byBasename(valoracionUrls))) {
  const parsed = parseLetra(name)
  if (!parsed) continue
  const { letter, color } = parsed
  valoracionSymbols.push({
    id: `valoracion-${letter}-${color}`,
    categoria: "valoracion" as RatingSymbolCategory,
    kind: "imagen",
    valor,
    color,
    label: letter,
  })
}
valoracionSymbols.sort((a, b) => {
  const ai = LETRA_ORDER.indexOf(a.label)
  const bi = LETRA_ORDER.indexOf(b.label)
  // Si la letra no está en el orden canónico, la mandamos al final.
  const ar = ai === -1 ? LETRA_ORDER.length : ai
  const br = bi === -1 ? LETRA_ORDER.length : bi
  return ar - br
})

export const ratingSymbolsDb: RatingSymbol[] = [
  ...caritaSymbols,
  ...valoracionSymbols,
]
