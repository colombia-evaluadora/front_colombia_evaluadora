// Tipos de dominio de los foros. Forma de `comms-service` (`foro/ForoDtos.java`);
// el mock (`src/mocks/handlers/comunicaciones-foros.ts`) devuelve exactamente lo mismo.

import type { AutorMensaje, Mensaje } from "@/features/comunicaciones/chat/api/types"

export const COLORES_ETIQUETA = ["BLUE", "GREEN", "YELLOW", "RED", "PURPLE", "ORANGE", "NAVY"] as const
export type ColorEtiqueta = (typeof COLORES_ETIQUETA)[number]

export interface EtiquetaForo {
  id: number
  nombre: string
  color: ColorEtiqueta
  // Solo la moderación la pone o la quita (p. ej. "Anuncio").
  soloModeradores: boolean
}

/** Cabecera del foro con lo que el usuario puede hacer (política de la institución). */
export interface Foro {
  id: number
  nombre: string
  totalMiembros: number
  etiquetas: EtiquetaForo[]
  puedePublicar: boolean
  puedeResponder: boolean
  // Administrador del canal o perfil moderador: fijar, cerrar, eliminar, mover etiquetas.
  puedeModerar: boolean
}

export interface Publicacion {
  id: number
  foroId: number
  titulo: string
  autor: AutorMensaje
  // `false` en los eventos del socket: se calcula con `autor.id` al leer.
  esPropia: boolean
  fecha: string
  ultimaActividad: string
  respuestas: number
  // Reacciones sobre el cuerpo (entran en el orden "Más votadas").
  reacciones: number
  fijada: boolean
  cerrada: boolean
  // Preguntas y respuestas: la marca quien publicó o la moderación.
  resuelta: boolean
  solucionId: number | null
  etiquetas: EtiquetaForo[]
  // `false` en los eventos del socket: el cliente conserva el valor que ya tenía.
  siguiendo: boolean
  // Primeros 200 caracteres del cuerpo (con tokens `<@id>` sin resolver).
  extracto: string
  // Total del listado filtrado, repetido en cada fila (paginación 0-based).
  totalCount: number
  // Cuerpo completo (reacciones, menciones, adjunto): solo en el detalle.
  mensaje: Mensaje | null
}

export const ORDENES_FORO = ["ACTIVIDAD", "NUEVAS", "TOP"] as const
export type OrdenForo = (typeof ORDENES_FORO)[number]

export interface PublicacionesParams {
  foroId: number
  orden: OrdenForo
  etiqueta?: number
  q?: string
}

/** Respuesta hilada: el mensaje y las respuestas que lo citan. */
export interface NodoRespuesta {
  mensaje: Mensaje
  hijas: NodoRespuesta[]
}
