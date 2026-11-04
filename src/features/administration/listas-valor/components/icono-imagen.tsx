import { env } from "@/config/env"
import { cn } from "@/lib/utils"

// URL pública (sin token, clasificación iconografia). Al SVG se le fija el mimeType:
// una máscara CSS no lo pinta si el archivo llega como application/octet-stream.
const iconoUrl = (valor: string, esSvg: boolean) =>
  `${env.API_URL}/files/public/${valor}${esSvg ? "?mimeType=image/svg%2Bxml" : ""}`

interface IconoImagenProps {
  /** URL de la imagen: la pública del ícono o el object URL de una vista previa. */
  src: string
  esSvg: boolean
  /**
   * Pinta un SVG del color del texto (`currentColor`), p. ej. el de la valoración.
   * Sin esto (la Iconografía) el ícono se ve tal como se cargó. El PNG nunca se pinta.
   */
  pintar?: boolean
  nombre: string
  className?: string
}

/**
 * Imagen de un ícono de la Iconografía. Con `pintar`, un SVG se usa como máscara
 * sobre `currentColor` y toma el color de la escala sin importar el del archivo.
 */
export function IconoImagen({ src, esSvg, pintar = false, nombre, className }: IconoImagenProps) {
  if (!esSvg || !pintar) {
    return <img src={src} alt={nombre} className={cn("object-contain", className)} />
  }
  const mascara = `url("${src}") center / contain no-repeat`
  return (
    <span
      role="img"
      aria-label={nombre}
      className={cn("inline-block bg-current", className)}
      style={{ mask: mascara, WebkitMask: mascara }}
    />
  )
}

/** El ícono guardado: decide SVG o PNG por la extensión de su clave. */
export function IconoGuardado({
  icono,
  pintar,
  className,
}: {
  icono: { nombre: string; valor: string }
  pintar?: boolean
  className?: string
}) {
  const esSvg = icono.valor.toLowerCase().endsWith(".svg")
  return (
    <IconoImagen
      src={iconoUrl(icono.valor, esSvg)}
      esSvg={esSvg}
      pintar={pintar}
      nombre={icono.nombre}
      className={className}
    />
  )
}
