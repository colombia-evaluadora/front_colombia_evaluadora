import { z } from "zod"

/**
 * Validación de las imágenes que suben los formularios (escudo del
 * establecimiento, foto de funcionario) — una sola fuente para las tres
 * capas que hoy tenían que coincidir a mano:
 *
 *   1. el `accept` y el `maxSize` del dropzone,
 *   2. el texto de ayuda que se le muestra al usuario,
 *   3. la validación de submit, que es la que de verdad frena el envío.
 *
 * Antes solo existía (1): el dropzone descartaba el archivo grande en
 * silencio —un borde rojo de dos segundos, sin mensaje— y nada más abajo
 * volvía a mirarlo. Cualquier `File` que llegara al estado por otro camino
 * (edición, arrastre múltiple, un cambio futuro del componente) viajaba
 * entero al multipart y el fallo aparecía recién en el gateway.
 */

/** Tope de peso. `file-service` corta bastante más arriba; este es el de negocio. */
export const IMAGE_MAX_SIZE = 2 * 1024 * 1024

/** MIME types aceptados, en el orden en que se listan en el `hint`. */
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/svg+xml"] as const

/** Valor listo para el atributo `accept` de un `<input type="file">`. */
export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(",")

/**
 * Tope por lado, en píxeles. Es un límite distinto del peso y no redundante
 * con él: un PNG de plano —pocos colores, mucha superficie— entra en 1,5 MB
 * comprimido y ocupa `ancho × alto × 4` bytes al descomprimirse. 10000×10000
 * son 400 MB de RAM en la pestaña; ahí no falla el envío, se muere el
 * navegador al pintar la vista previa.
 *
 * 4000 px de lado (64 MB descomprimidos en el peor caso) es de sobra para un
 * escudo o una foto de perfil, que se muestran a menos de 300 px.
 */
export const IMAGE_MAX_DIMENSION = 4000

/** Texto de ayuda: tiene que decir lo mismo que validan las reglas de acá. */
export const IMAGE_HINT = "JPG, PNG o SVG · Máximo 2 MB y 4000 × 4000 px"

/** Solo para los mensajes de error: 2 MB, 1,5 MB, 800 KB. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const megabytes = bytes / (1024 * 1024)
    return `${megabytes.toFixed(megabytes < 10 && megabytes % 1 !== 0 ? 1 : 0).replace(".", ",")} MB`
  }
  return `${Math.round(bytes / 1024)} KB`
}

/** Etiqueta corta por MIME type, para no mostrarle "image/svg+xml" al usuario. */
const TYPE_LABELS: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/svg+xml": "SVG",
  "image/webp": "WEBP",
  "image/gif": "GIF",
}

function typeLabel(mime: string): string {
  return TYPE_LABELS[mime] ?? mime.replace(/^image\//, "").toUpperCase()
}

export interface ImageFileRules {
  /** Tamaño máximo en bytes. Por defecto `IMAGE_MAX_SIZE`. */
  maxSize?: number
  /** MIME types permitidos. Por defecto `IMAGE_MIME_TYPES`. */
  types?: readonly string[]
}

/**
 * Esquema de una imagen ya elegida. Se valida por MIME type y por peso: no
 * se abre el binario, así que un archivo renombrado pasa el filtro del front
 * — quien decide de verdad es `file-service`, que sí mira el contenido.
 *
 * Ojo con el orden de los `refine`: primero el tipo y después el peso, para
 * que un PDF de 40 MB se reporte como "formato no permitido" (que es lo que
 * el usuario tiene que corregir) y no como "pesa demasiado".
 */
export function imageFileSchema({ maxSize = IMAGE_MAX_SIZE, types = IMAGE_MIME_TYPES }: ImageFileRules = {}) {
  const allowed = types.map(typeLabel).join(", ")

  return z
    .instanceof(File, { message: "Selecciona un archivo de imagen." })
    .refine((file) => file.size > 0, {
      message: "El archivo está vacío.",
    })
    .refine((file) => types.includes(file.type), {
      message: `Formato no permitido. Usa ${allowed}.`,
    })
    .refine((file) => file.size <= maxSize, {
      message: `La imagen supera el máximo de ${formatBytes(maxSize)}.`,
    })
}

/** El de siempre: el que usan escudo y foto. */
export const imageFile = imageFileSchema()

/**
 * Campo de imagen opcional: `null`/`undefined` es válido y significa "sin
 * imagen" (al crear) o "conservá la que ya tiene" (al editar).
 */
export const optionalImageFile = imageFile.nullish()

/**
 * El mismo esquema en la forma que espera un dropzone: el primer mensaje de
 * error, o `null` si el archivo sirve. Es lo que se le pasa a `onFileValidate`.
 */
export function validateImageFile(file: File, rules?: ImageFileRules): string | null {
  const result = imageFileSchema(rules).safeParse(file)
  return result.success ? null : result.error.issues[0]?.message ?? "Archivo no válido."
}
