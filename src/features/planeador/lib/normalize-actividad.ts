import type { Actividad } from "@/features/planeador/api/types/actividad"

/**
 * `Actividad.recursos` está tipado como siempre presente (el mock lo trae
 * poblado — aunque sea `[]` — para todas las actividades), pero el backend
 * real puede omitirlo directamente en la fila (visto en producción:
 * "act.recursos is not iterable" al iterarlo en
 * `dialog-biblioteca-recursos.tsx`). Se normaliza acá, en el único lugar por
 * donde pasan las filas crudas (`use-actividades-query.ts` /
 * `use-actividad-detalle-query.ts`), para no tener que defenderse de
 * `undefined` en cada consumidor.
 */
export function normalizeActividad(raw: Actividad): Actividad {
  return {
    ...raw,
    recursos: raw.recursos ?? [],
  }
}
