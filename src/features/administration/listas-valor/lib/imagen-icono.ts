import { ICONO_MAX_BYTES } from "@/features/administration/listas-valor/api/types/icono"

export const IMAGEN_MENSAJES = {
  formato: "Solo se admite un archivo SVG.",
  inseguro: "El SVG no es válido: no puede traer scripts ni enlaces externos.",
  incrustada: "El SVG no es válido: no puede traer imágenes incrustadas.",
  pesado: "La imagen supera el máximo de 100 KB.",
  noCuadrado: "La imagen debe ser cuadrada.",
} as const

/**
 * Revisa el archivo antes de subirlo (S.1.ICO.3: solo SVG, cuadrado, máx. 100 KB). El back solo ve nombre y
 * peso en TARCHIVO (`fn_icono_validar_archivo`): que sea cuadrado y que no traiga scripts ni enlaces externos
 * se revisa aquí. Devuelve el primer problema o null. Los PNG cargados antes siguen viéndose (IconoGuardado),
 * pero ya no se aceptan nuevos.
 */
export async function validarArchivoIcono(file: File): Promise<string | null> {
  if (file.size > ICONO_MAX_BYTES) return IMAGEN_MENSAJES.pesado
  if (!file.name.toLowerCase().endsWith(".svg")) return IMAGEN_MENSAJES.formato
  return validarSvg(await file.text())
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
