import type { SedeOption } from "@/features/establishment/academic-period/api/types/sede-option"

export interface SedeResuelta {
  sede: SedeOption | undefined
  /** Sin id, y el nombre lo tienen sedes de dos colegios del usuario. */
  ambigua: boolean
}

/**
 * La sede de una matrícula, entre las que el usuario ve.
 *
 * Por id cuando se tiene; el nombre queda como respaldo para datos que solo
 * lo traen, y SOLO si es único: dos colegios del mismo rector pueden tener
 * una "Sede principal", y tomar la primera guardaría en el colegio equivocado.
 */
export function resolverSede(
  sedes: SedeOption[] | undefined,
  { campusId, campus }: { campusId?: string; campus?: string },
): SedeResuelta {
  if (!sedes) return { sede: undefined, ambigua: false }
  if (campusId) return { sede: sedes.find((s) => String(s.pk_sede) === campusId), ambigua: false }
  if (!campus) return { sede: undefined, ambigua: false }
  const mismas = sedes.filter((s) => s.nombre === campus)
  return mismas.length === 1 ? { sede: mismas[0], ambigua: false } : { sede: undefined, ambigua: mismas.length > 1 }
}
