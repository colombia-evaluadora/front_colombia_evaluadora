import Axios from "axios"

/** Retirar para todos: primeros 15 minutos desde el envío (Comunicaciones §4.3). El servidor manda. */
export const PLAZO_RETIRO_MS = 15 * 60 * 1000

/** Milisegundos que le quedan al retiro de un mensaje (0 si ya venció). */
export function restanteRetiro(fecha: string, ahora: number) {
  return Math.max(0, Date.parse(fecha) + PLAZO_RETIRO_MS - ahora)
}

/** Aviso exacto de la Guía de Diseño (M.2.NUE.3). */
export const AVISO_ENVIOS_REPETIDOS = "Envió muchos mensajes seguidos. Espere un momento para enviar otro."

const PAUSA_POR_DEFECTO_S = 30

/** Segundos de pausa si `error` es el 429 de envíos repetidos; `null` si es otro error. */
export function segundosDePausa(error: unknown): number | null {
  if (!Axios.isAxiosError(error) || error.response?.status !== 429) return null
  const segundos = Number(error.response.headers?.["retry-after"])
  return Number.isFinite(segundos) && segundos > 0 ? segundos : PAUSA_POR_DEFECTO_S
}
