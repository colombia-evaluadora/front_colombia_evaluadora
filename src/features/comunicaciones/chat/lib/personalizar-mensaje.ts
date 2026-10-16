import type { Mensaje } from "@/features/comunicaciones/chat/api/types"

/**
 * Calcula en el cliente lo que depende de quién mira el mensaje.
 *
 * comms-service (PR SSO #692) difunde cada `mensaje.creado|actualizado` UNA
 * vez por canal, en forma neutra: `esPropio`, `meMenciona` y `reacciones[].mia`
 * vienen en `false`. El REST sí los trae calculados para el visor, pero se
 * recalculan siempre para que REST, socket y mock se comporten igual:
 *
 * - `esPropio`: `autor.id` es el usuario actual.
 * - `meMenciona`: no es propio y alguna mención es masiva (`@canal`/`@todos`)
 *   o es `USUARIO` con `usuarioId` del usuario actual (misma regla del backend).
 * - `mia`: el usuario actual está en `reacciones[].usuarios`.
 *
 * `userId` nulo (token sin claim `uid`) = no se toca nada: se respeta lo que
 * mandó el servidor.
 */
export function personalizarMensaje(m: Mensaje, userId: number | null | undefined): Mensaje {
  if (userId == null) return m
  const esPropio = m.autor?.id === userId
  const meMenciona =
    !esPropio && !m.sistema && (m.menciones ?? []).some((x) => x.tipo !== "USUARIO" || x.usuarioId === userId)
  return {
    ...m,
    esPropio,
    meMenciona,
    reacciones: m.reacciones?.map((r) => (r.usuarios ? { ...r, mia: r.usuarios.includes(userId) } : r)),
  }
}

export const personalizarMensajes = (ms: Mensaje[], userId: number | null | undefined) =>
  userId == null ? ms : ms.map((m) => personalizarMensaje(m, userId))
