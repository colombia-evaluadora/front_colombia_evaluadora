export interface HorarioEntryRecord {
  id: number
  grupoId: number
  planItemId: number
  diaId: number
  bloque: number
}

// Horario de ejemplo de 6°A (grupo 1): bloque 0-based, días 272 (lunes) a 276
// (viernes). planItemId = código del plan de Sexto en `study-plans.ts`.
const SEED_6A: [diaId: number, bloque: number, planItemId: number][] = [
  [272, 0, 1], [272, 1, 2], [272, 2, 3], [272, 3, 4], [272, 4, 6],
  [273, 0, 2], [273, 2, 1], [273, 3, 6],
  [274, 0, 3], [274, 1, 1], [274, 3, 5],
  [275, 0, 1], [275, 1, 2], [275, 2, 6], [275, 3, 3],
  [276, 0, 4], [276, 1, 6], [276, 2, 1], [276, 3, 2],
]

export const horarioDb: HorarioEntryRecord[] = SEED_6A.map(([diaId, bloque, planItemId], i) => ({
  id: i + 1,
  grupoId: 1,
  planItemId,
  diaId,
  bloque,
}))

export function nextHorarioId(): number {
  return horarioDb.reduce((max, row) => Math.max(max, row.id), 0) + 1
}

// TLISTA_VALOR categoría DIA_SEMANA — mismos ids que ya hardcodea el front
// en `schedule-data.ts` (`DAYS`).
export const DIA_SEMANA_NAMES: Record<number, string> = {
  272: "Lunes",
  273: "Martes",
  274: "Miércoles",
  275: "Jueves",
  276: "Viernes",
}
