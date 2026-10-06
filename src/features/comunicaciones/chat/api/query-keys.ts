const all = ["comunicaciones-chat"] as const
const conversacion = (id: number | "none") => [...all, "conversacion", id] as const

export const chatKeys = {
  all,
  institucion: [...all, "institucion"] as const,
  conversaciones: [...all, "conversaciones"] as const,
  conversacion,
  mensajes: (id: number | "none") => [...conversacion(id), "mensajes"] as const,
  archivos: [...all, "archivos"] as const,
  borradores: [...all, "borradores"] as const,
  eleccion: (conversacionId: number | "none") =>
    [...conversacion(conversacionId), "eleccion"] as const,
} as const
