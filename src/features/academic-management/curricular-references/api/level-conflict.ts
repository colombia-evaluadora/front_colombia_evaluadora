import { fetchCurricularReferences } from "@/features/academic-management/curricular-references/api/query/use-curricular-references"

/** Conflicto de la Regla 7: otro referente activo ya gobierna el nivel. */
export interface LevelConflict {
  levelName: string
  referenceName: string
  /** null si no se pudo ubicar el referente en conflicto. */
  referenceId: number | null
}

// Texto de fn_refcurr_validar_nivel_unico_activo (el HINT con el pk no llega al front).
const CONFLICT_PATTERN = /nivel educativo "(.+?)" ya lo gobierna el referente activo "(.+?)"/i

/** Ubica el referente en conflicto por nombre entre los activos. */
async function findActiveReferenceId(name: string): Promise<number | null> {
  try {
    const { rows } = await fetchCurricularReferences({
      filters: { search: name, active: "true" },
      sorting: [],
      pageIndex: 0,
      pageSize: 10,
    })
    return rows.find((row) => row.active && row.name === name)?.id ?? null
  } catch {
    return null
  }
}

/** null si el mensaje no es un conflicto de la Regla 7. */
export async function toLevelConflict(message: string): Promise<LevelConflict | null> {
  const match = CONFLICT_PATTERN.exec(message)
  if (!match) return null
  const [, levelName, referenceName] = match
  return { levelName, referenceName, referenceId: await findActiveReferenceId(referenceName) }
}
