import type { TipoPregunta } from "@/features/comunicaciones/chat/api/types"

export interface RespuestaLocal {
  opcionIds: number[]
  texto: string
}

export const RESPUESTA_VACIA: RespuestaLocal = { opcionIds: [], texto: "" }

export const estaRespondida = (tipo: TipoPregunta, r: RespuestaLocal | undefined) =>
  tipo === "REDACCION" ? !!r?.texto.trim() : (r?.opcionIds.length ?? 0) > 0
