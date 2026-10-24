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
  // Bajo el comunicado: `actividad.actualizada` (alguien lo vio) también la refresca.
  recepcion: (conversacionId: number | "none") =>
    [...conversacion(conversacionId), "comunicado", "recepcion"] as const,
  evaluacion: (conversacionId: number | "none") =>
    [...conversacion(conversacionId), "evaluacion"] as const,
  entregas: (conversacionId: number | "none") =>
    [...conversacion(conversacionId), "evaluacion", "entregas"] as const,
  miembros: (conversacionId: number | "none") =>
    [...conversacion(conversacionId), "miembros"] as const,
  politica: [...all, "politica"] as const,
  // Disponibilidad propia, la de los directos y el mapa usuarioId → estado que alimenta el socket.
  disponibilidad: [...all, "disponibilidad"] as const,
  disponibilidadDirectos: [...all, "disponibilidad", "directos"] as const,
  presencia: [...all, "presencia"] as const,
  respuestasAutomaticas: [...all, "respuestas-automaticas"] as const,
  votantesOpciones: [...all, "votantes", "opciones"] as const,
  jornadasEleccion: [...all, "elecciones", "jornadas"] as const,
  seleccionOpciones: [...all, "grupos", "seleccion", "opciones"] as const,
  votantes: (grupo: string, valor: string) => [...all, "votantes", grupo, valor] as const,
  borradores: [...all, "borradores"] as const,
  borradoresActividad: [...all, "borradores-actividad"] as const,
  // Fuera del prefijo de la lista: invalidarla (al autoguardar o publicar) no vuelve a pedir el
  // detalle de un borrador abierto, que ya se eliminó al publicar.
  borradorActividad: (id: number) => [...all, "borrador-actividad", id] as const,
  enviados: (tipo: string) => [...all, "enviados", tipo] as const,
  eleccion: (conversacionId: number | "none") =>
    [...conversacion(conversacionId), "eleccion"] as const,
  encuesta: (conversacionId: number | "none") =>
    [...conversacion(conversacionId), "encuesta"] as const,
} as const
