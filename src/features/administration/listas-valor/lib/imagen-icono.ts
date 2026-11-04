import { ICONO_MAX_BYTES } from "@/features/administration/listas-valor/api/types/icono"

export const IMAGEN_MENSAJES = {
  formato: "Solo se admite un archivo SVG o PNG.",
  inseguro: "El SVG no es válido: no puede traer scripts ni enlaces externos.",
  incrustada: "El SVG no es válido: no puede traer imágenes incrustadas.",
  pesado: "La imagen supera el máximo de 100 KB.",
  noCuadrado: "La imagen debe ser cuadrada.",
} as const

/**
 * Revisa el archivo antes de subirlo. El back solo ve nombre y peso en TARCHIVO
 * (`fn_icono_validar_archivo`): que sea cuadrado y, en un SVG, que no traiga
 * scripts ni enlaces externos se revisa aquí. Devuelve el primer problema o null.
 */
export async function validarArchivoIcono(file: File): Promise<string | null> {
  const nombre = file.name.toLowerCase()
  if (file.size > ICONO_MAX_BYTES) return IMAGEN_MENSAJES.pesado
  if (nombre.endsWith(".svg")) return validarSvg(await file.text())
  if (nombre.endsWith(".png")) return validarPng(new Uint8Array(await file.arrayBuffer()))
  return IMAGEN_MENSAJES.formato
}

// Firma PNG y cabecera IHDR: ancho en los bytes 16-19, alto en 20-23.
const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

export function validarPng(bytes: Uint8Array): string | null {
  if (bytes.length < 24 || FIRMA_PNG.some((b, i) => bytes[i] !== b)) return IMAGEN_MENSAJES.formato
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return vista.getUint32(16) === vista.getUint32(20) ? null : IMAGEN_MENSAJES.noCuadrado
}

export function validarSvg(texto: string): string | null {
  const svg = texto.trim().replace(/^(<\?xml[^>]*\?>|<!--[\s\S]*?-->|\s)+/i, "")
  if (!/^<svg[\s>]/i.test(svg) || !/<\/svg>\s*$/i.test(svg)) return IMAGEN_MENSAJES.formato
  if (
    /<\s*(script|foreignObject|iframe|embed|object)\b/i.test(svg) ||
    /\son[a-z]+\s*=/i.test(svg) ||
    /<!(DOCTYPE|ENTITY)/i.test(svg) ||
    /(javascript|vbscript):/i.test(svg) ||
    /@import/i.test(svg) ||
    /href\s*=\s*["']\s*[^#"'\s]/i.test(svg) ||
    /url\(\s*["']?\s*[^#"')\s]/i.test(svg)
  )
    return IMAGEN_MENSAJES.inseguro
  if (/<\s*image\b/i.test(svg) || /data:/i.test(svg)) return IMAGEN_MENSAJES.incrustada

  const raiz = svg.match(/^<svg[^>]*>/i)?.[0] ?? ""
  const viewBox = raiz.match(/viewBox\s*=\s*["']([^"']*)["']/i)?.[1]
  const partes = viewBox?.trim().split(/[\s,]+/).map(Number)
  if (partes?.length === 4) {
    return partes.some(Number.isNaN) || partes[2] !== partes[3] ? IMAGEN_MENSAJES.noCuadrado : null
  }
  const ancho = raiz.match(/\swidth\s*=\s*["']([^"']*)["']/i)?.[1]?.trim()
  const alto = raiz.match(/\sheight\s*=\s*["']([^"']*)["']/i)?.[1]?.trim()
  return ancho && ancho === alto ? null : IMAGEN_MENSAJES.noCuadrado
}
