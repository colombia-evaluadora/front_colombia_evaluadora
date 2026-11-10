import type { SoporteAccion } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"

export const MAX_SOPORTES = 5

/** Soportes vigentes y versiones anteriores (`vigente=false`) de una acción. */
export function partirSoportes(lista: SoporteAccion[] | undefined) {
  const todos = lista ?? []
  return { vigentes: todos.filter((s) => s.vigente), anteriores: todos.filter((s) => !s.vigente) }
}

/** Vincular o cargar se deshabilita con 5 soportes vigentes o con el caso cerrado. */
export const puedeAgregarSoporte = (vigentes: number, cerrado: boolean) => !cerrado && vigentes < MAX_SOPORTES

/** Motivo de retirar o sustituir: 10 a 500 caracteres. */
export const errorMotivoSoporte = (motivo: string) => errorLargo(motivo, 10, 500, "El motivo")

/** 1536 → «1,5 KB». */
export function formatPeso(bytes: number | null | undefined) {
  if (bytes == null) return ""
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1).replace(".", ",")} KB`
  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`
}
