import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { planeadorKeys } from "@/features/planeador/api/query-keys"

/** Rótulo por defecto: el que usa el backend cuando ningún referente
 *  aplica al grado (`docs/rotulo-actividad.md`), y también lo que pinta
 *  la UI mientras la consulta está en vuelo o el `grado` todavía no se
 *  conoce — nunca un literal "Actividad" suelto en el resto del código. */
export const ROTULO_ACTIVIDAD_FALLBACK = "Actividad"

/** `GET /planeador/rotulo-actividad?grado=&asignatura=&anio=`
 *  (`fn_planeador_rotulo_actividad`, V511) — cómo se llama la actividad
 *  ("Actividad"/"Experiencia"/"Proyecto"…) para un grado puntual, según el
 *  `ROTULO_EJECUCION` del referente curricular que le aplica (misma regla
 *  que resuelve la unidad, `fn_unidad_referente_aplicable`). Siempre una
 *  fila; sin referente aplicable, `rotulo_ejecucion` ya viene en
 *  `ROTULO_ACTIVIDAD_FALLBACK` desde el propio backend. */
interface RotuloActividadRow {
  fk_tgrado: number
  pk_referente_curricular: number | null
  rotulo_ejecucion: string
}

export interface RotuloActividad {
  referenteId: number | null
  rotulo: string
}

function toRotuloActividad(row: RotuloActividadRow | undefined): RotuloActividad {
  return {
    referenteId: row?.pk_referente_curricular ?? null,
    rotulo: row?.rotulo_ejecucion ?? ROTULO_ACTIVIDAD_FALLBACK,
  }
}

async function fetchRotuloActividad(
  gradoId: number,
  asignaturaId: number | undefined,
  anio: number | undefined,
): Promise<RotuloActividad> {
  const query = new URLSearchParams({ grado: String(gradoId) })
  if (asignaturaId != null) query.set("asignatura", String(asignaturaId))
  if (anio != null) query.set("anio", String(anio))
  const rows = await evalCol.getRows<RotuloActividadRow>(`/planeador/rotulo-actividad?${query}`)
  return toRotuloActividad(rows[0])
}

/**
 * `gradoId` en `undefined` deshabilita la consulta — mismo criterio que
 * `useReferenteCurricularQuery`: el llamador la apaga sin condicional propio
 * antes de que el docente elija Grado, momento en el que no hay de dónde
 * resolver el rótulo todavía (queda en `ROTULO_ACTIVIDAD_FALLBACK` vía
 * `data` en `undefined`, que cada caller cubre con `??`).
 */
/** El backend lo devuelve con mayúscula inicial ("Actividad"/"Experiencia de
 *  aprendizaje", pensado para arrancar una oración o un `<Select>`) — para
 *  embeberlo a mitad de frase ("Identificación de la actividad") hace falta
 *  la variante en minúscula, sin tocar el resto del texto (por si el rótulo
 *  trae una sigla propia más adelante). */
export function rotuloEnMinuscula(rotulo: string): string {
  return rotulo.charAt(0).toLowerCase() + rotulo.slice(1)
}

export function useRotuloActividadQuery(
  gradoId: number | undefined,
  asignaturaId?: number,
  anio?: number,
) {
  return useQuery({
    queryKey:
      gradoId != null
        ? planeadorKeys.rotuloActividad(gradoId, asignaturaId, anio)
        : planeadorKeys.rotuloActividad("none"),
    queryFn: () => fetchRotuloActividad(gradoId!, asignaturaId, anio),
    enabled: gradoId != null,
    staleTime: 1000 * 60,
    // Igual que `useReferenteCurricularQuery`: sin esto, cambiar de
    // Asignatura hace parpadear el rótulo al default mientras se resuelve
    // el nuevo.
    placeholderData: (previousData) => previousData,
  })
}
