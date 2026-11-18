import { z } from "zod"

import { maxLength, required } from "@/lib/forms/messages"
import type {
  HiloAcudientes,
  HiloAcudientesResumen,
  OpcionHiloAcudientes,
} from "@/features/comunicaciones/chat/api/types"
import { MAX_ASUNTO, MAX_MENSAJE } from "@/features/comunicaciones/chat/lib/asunto"

/**
 * Hilo común del docente con acudientes (Comunicaciones §4.5, M.2.HIL.1-3): textos del encabezado y
 * de la bandeja, valor del select "Grupo o ejecución" y validación del modal "Nuevo hilo con acudientes".
 */

/** Tope del motivo de un silencio (comms-service: fn_moderacion_validar_motivo). */
export const MAX_MOTIVO_SILENCIO = 500

/** "1 acudiente" / "N acudientes". */
export function acudientesTexto(n: number): string {
  return `${n} ${n === 1 ? "acudiente" : "acudientes"}`
}

/** Segunda línea del encabezado: "N acudientes vigentes · Moderador: {nombre}". */
export function lineaEncabezadoHilo(h: Pick<HiloAcudientes, "acudientes" | "moderador">): string {
  const vigentes = h.acudientes === 1 ? "vigente" : "vigentes"
  return `${acudientesTexto(h.acudientes)} ${vigentes} · Moderador: ${h.moderador.nombre}`
}

/** Contexto de la fila de la bandeja: "Grupo · N acudientes" (la hora la pinta la fila). */
export function contextoBandejaHilo(h: Pick<HiloAcudientesResumen, "acudientes">): string {
  return `Grupo · ${acudientesTexto(h.acudientes)}`
}

/** Motivo por el que no se escribe en el hilo, o null si se puede. */
export function motivoSinEscrituraHilo(h: Pick<HiloAcudientes, "soloLectura" | "silenciado"> | undefined): string | null {
  if (!h) return null
  if (h.soloLectura) return "Este hilo está cerrado: es de solo lectura."
  if (h.silenciado) return "El moderador te silenció en este hilo: puedes leerlo, pero no escribir."
  return null
}

/** Valor del select: "g:<grupo>" para el grupo, "e:<asignación>" para una [Ejecución]. */
export function valorOpcionHilo(o: Pick<OpcionHiloAcudientes, "grupo" | "asignacion">): string {
  return o.asignacion != null ? `e:${o.asignacion}` : `g:${o.grupo}`
}

/** Cuerpo del POST a partir de la opción elegida y los textos. */
export function cuerpoNuevoHilo(o: OpcionHiloAcudientes, asunto: string, mensaje: string) {
  return {
    FK_TGRUPO: o.grupo,
    FK_TDOCENTE_ASIGNATURA: o.asignacion,
    ASUNTO: asunto.trim(),
    TEXTO: mensaje.trim(),
  }
}

export const nuevoHiloSchema = z.object({
  opcion: z.string().min(1, required("El grupo o la ejecución")),
  asunto: z
    .string()
    .trim()
    .min(1, required("El asunto"))
    .max(MAX_ASUNTO, maxLength(MAX_ASUNTO, "El asunto")),
  mensaje: z
    .string()
    .trim()
    .min(1, required("El mensaje"))
    .max(MAX_MENSAJE, maxLength(MAX_MENSAJE, "El mensaje")),
})

export type ValoresNuevoHilo = z.infer<typeof nuevoHiloSchema>

export const silencioSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, required("El motivo"))
    .max(MAX_MOTIVO_SILENCIO, maxLength(MAX_MOTIVO_SILENCIO, "El motivo")),
})
