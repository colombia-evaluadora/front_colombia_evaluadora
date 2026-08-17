export interface HorarioEntryRecord {
  id: number
  grupoId: number
  planItemId: number
  diaId: number
  bloque: number
}

export const horarioDb: HorarioEntryRecord[] = []

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
