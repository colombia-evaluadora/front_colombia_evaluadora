/**
 * Interruptores de las funciones del chat que en su momento solo existieron
 * en MSW. Hoy comms-service implementa todas: conversaciones, mensajes,
 * adjuntos, archivos, borradores, duplicar canal, votaciones rápidas,
 * comunicados, encuestas, elecciones y evaluaciones (V580). Se conservan para
 * apagar una función con mocks desactivados ("Próximamente") si el backend
 * deja de ofrecerla: basta con volverla `env.ENABLE_API_MOCKING`.
 */
export const CHAT_FUNCIONES = {
  duplicar: true,
  votacionRapida: true,
  archivos: true,
  borradores: true,
  comunicados: true,
  encuestas: true,
  elecciones: true,
  evaluaciones: true,
} as const

export const PROXIMAMENTE = "Próximamente"
