// Catálogo de emojis basado en emoji-datasource (iamcal/emoji-data).
// Se guarda y envía el emoji como texto; en pantalla se pinta con el set de Google.

const VERSION_IMAGENES = "16.0.0"

// Atajo de reacciones en la barra de un mensaje.
export const REACCIONES_RAPIDAS = ["👍", "❤️", "😂", "🙌", "👏", "✅"]

export interface EmojiCatalogo {
  emoji: string
  nombres: string[]
}

export interface GrupoEmojis {
  id: string
  nombre: string
  // Emoji que representa al grupo en las pestañas.
  icono: string
  emojis: EmojiCatalogo[]
}

// Categorías del dataset en el orden del selector. Se omiten "Component" (tonos de piel sueltos)
// y "Flags": Windows no dibuja banderas y en el texto salen como letras.
const CATEGORIAS = [
  { id: "Smileys & Emotion", nombre: "Caras y emociones", icono: "😊" },
  { id: "People & Body", nombre: "Personas", icono: "👋" },
  { id: "Animals & Nature", nombre: "Animales y naturaleza", icono: "🐻" },
  { id: "Food & Drink", nombre: "Comida", icono: "🍎" },
  { id: "Activities", nombre: "Actividades", icono: "⚽" },
  { id: "Travel & Places", nombre: "Viajes y lugares", icono: "🚀" },
  { id: "Objects", nombre: "Objetos", icono: "💡" },
  { id: "Symbols", nombre: "Símbolos", icono: "❤️" },
]

// "1F44D-1F3FB" → "👍🏻"
const desdeUnified = (unified: string) =>
  String.fromCodePoint(...unified.split("-").map((h) => parseInt(h, 16)))

// "👍" → "1f44d": nombre del archivo en el set de imágenes.
const aUnified = (emoji: string) =>
  [...emoji].map((c) => c.codePointAt(0)!.toString(16)).join("-")

export const urlEmoji = (emoji: string) =>
  `https://cdn.jsdelivr.net/npm/emoji-datasource-google@${VERSION_IMAGENES}/img/google/64/${aUnified(emoji)}.png`

let cache: Promise<GrupoEmojis[]> | null = null

// El JSON pesa ~1 MB: se carga la primera vez que se abre el selector.
export function cargarGruposEmojis() {
  cache ??= import("emoji-datasource").then(({ default: datos }) => {
    const validos = datos
      .filter((e) => e.has_img_google && !e.obsoleted_by)
      .sort((a, b) => a.sort_order - b.sort_order)
    return CATEGORIAS.map((c) => ({
      ...c,
      emojis: validos
        .filter((e) => e.category === c.id)
        .map((e) => ({ emoji: desdeUnified(e.unified), nombres: e.short_names })),
    }))
  })
  return cache
}

// Busca por nombre corto del dataset (en inglés: "smile", "thumbsup", "book").
export function buscarEmojis(grupos: GrupoEmojis[], texto: string) {
  const q = texto.trim().toLowerCase().replace(/\s+/g, "_")
  if (!q) return []
  return grupos.flatMap((g) => g.emojis).filter((e) => e.nombres.some((n) => n.includes(q)))
}
