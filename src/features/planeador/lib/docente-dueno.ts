/**
 * Columnas del docente dueño que el backend agrega a las filas de
 * actividades/unidades cuando un Super Admin o Coordinador mira el
 * planeador ajeno (o el de toda su sede). Todas opcionales: una respuesta
 * sin ellas (la del docente mirando lo suyo, o un backend viejo) mapea a
 * `undefined` y nada cambia.
 *
 * `es_propia` puede llegar como booleano o como flag `"S"|"N"` (convención
 * del resto del contrato del planeador); se aceptan las dos formas.
 */
export interface DocenteDuenoRow {
  fk_tfuncionario_docente?: number | null
  docente_nombre?: string | null
  es_propia?: boolean | "S" | "N" | null
}

export interface DocenteDueno {
  docenteId?: number
  docenteNombre?: string
  esPropia?: boolean
}

function toEsPropia(value: DocenteDuenoRow["es_propia"]): boolean | undefined {
  if (value === true || value === "S") return true
  if (value === false || value === "N") return false
  return undefined
}

export function toDocenteDueno(row: DocenteDuenoRow): DocenteDueno {
  return {
    docenteId: row.fk_tfuncionario_docente ?? undefined,
    docenteNombre: row.docente_nombre?.trim() || undefined,
    esPropia: toEsPropia(row.es_propia),
  }
}

/** Fila ajena = el backend dijo explícitamente que no es del usuario. Sin
 *  el dato no se bloquea nada en el front: el backend sigue rechazando
 *  (42501) cualquier escritura sobre algo que no le corresponde. */
export function esAjena(item: { esPropia?: boolean } | undefined): boolean {
  return item?.esPropia === false
}
