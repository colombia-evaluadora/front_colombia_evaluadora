import { env } from "@/config/env"

/**
 * Funciones del chat que hoy SOLO existen en MSW. comms-service implementa
 * conversaciones, miembros, mensajes, reacciones, fijar/editar/eliminar,
 * directos, adjuntos por file-service, archivos compartidos, borradores,
 * duplicar canal y votaciones rápidas, pero no: comunicados, encuestas,
 * elecciones ni evaluaciones. Con mocks apagados esas entradas se muestran
 * deshabilitadas con "Próximamente" (o se ocultan) y sus queries no se
 * disparan, para que no aparezcan 404 en pantalla.
 *
 * Cuando el backend las agregue, basta con volver `true` la que corresponda.
 */
const soloMock = env.ENABLE_API_MOCKING

export const CHAT_FUNCIONES = {
  duplicar: true,
  votacionRapida: true,
  archivos: true,
  borradores: true,
  comunicados: soloMock,
  encuestas: soloMock,
  elecciones: soloMock,
  evaluaciones: soloMock,
} as const

export const PROXIMAMENTE = "Próximamente"
