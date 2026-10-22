const all = ["comunicaciones-chat"] as const
const conversacion = (id: number | "none") => [...all, "conversacion", id] as const

export const chatKeys = {
  all,
  conversaciones: [...all, "conversaciones"] as const,
  // Invitaciones pendientes a grupos (acudientes).
  invitaciones: [...all, "invitaciones"] as const,
  conversacion,
  mensajes: (id: number | "none") => [...conversacion(id), "mensajes"] as const,
  archivos: [...all, "archivos"] as const,
  documento: (archivoId: number | "none") => [...all, "archivos", archivoId, "documento"] as const,
  personas: [...all, "personas"] as const,
  comunicado: (conversacionId: number | "none") =>
    [...conversacion(conversacionId), "comunicado"] as const,
  evaluacion: (conversacionId: number | "none") =>
    [...conversacion(conversacionId), "evaluacion"] as const,
  entregas: (conversacionId: number | "none") =>
    [...conversacion(conversacionId), "evaluacion", "entregas"] as const,
  miembros: (conversacionId: number | "none") =>
    [...conversacion(conversacionId), "miembros"] as const,
  politica: [...all, "politica"] as const,
  votantesOpciones: [...all, "votantes", "opciones"] as const,
  seleccionOpciones: [...all, "grupos", "seleccion", "opciones"] as const,
  votantes: (grupo: string, valor: string) => [...all, "votantes", grupo, valor] as const,
  borradores: [...all, "borradores"] as const,
  enviados: (tipo: string) => [...all, "enviados", tipo] as const,
  eleccion: (conversacionId: number | "none") =>
    [...conversacion(conversacionId), "eleccion"] as const,
  encuesta: (conversacionId: number | "none") =>
    [...conversacion(conversacionId), "encuesta"] as const,
} as const
