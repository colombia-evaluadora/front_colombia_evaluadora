import type { PublicacionesParams } from "@/features/comunicaciones/foros/api/types"

const all = ["comunicaciones-foros"] as const
const foro = (id: number | "none") => [...all, "foro", id] as const
const publicacion = (id: number | "none") => [...all, "publicacion", id] as const

export const forosKeys = {
  all,
  foro,
  // Canales FORO del usuario (sale de `/conversaciones`, filtrado).
  lista: [...all, "lista"] as const,
  // Cabecera: nombre, etiquetas y permisos del usuario en el foro.
  cabecera: (id: number | "none") => [...foro(id), "cabecera"] as const,
  // Prefijo de todos los listados de un foro (cualquier orden, etiqueta o búsqueda).
  publicacionesDe: (foroId: number | "none") => [...foro(foroId), "publicaciones"] as const,
  publicaciones: (p: PublicacionesParams) =>
    [...foro(p.foroId), "publicaciones", { orden: p.orden, etiqueta: p.etiqueta ?? null, q: p.q ?? "" }] as const,
  publicacion,
  respuestas: (id: number | "none") => [...publicacion(id), "respuestas"] as const,
} as const
