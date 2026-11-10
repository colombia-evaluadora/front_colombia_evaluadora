import { useOpcionesCupoQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import type { OpcionCupoInput } from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"

const unicos = (l: string[]) => [...new Set(l)]

/**
 * Cascada de una opción de cupo (Sección 3.3): establecimiento → sede → jornada, con los
 * períodos en Inscripciones de todos los establecimientos. Si se pasa el grado, solo quedan
 * los períodos que lo ofrecen.
 */
export function useCascadaOpciones(grado?: string) {
  const { data = [] } = useOpcionesCupoQuery()
  const periodos = grado ? data.filter((p) => p.grados.some((g) => g.nombre === grado)) : data

  const establecimientos = unicos(periodos.map((p) => p.establecimiento))
  const sedesDe = (establecimiento: string) =>
    unicos(periodos.filter((p) => p.establecimiento === establecimiento).map((p) => p.sede))
  const jornadasDe = (o: Pick<OpcionCupoInput, "establecimiento" | "sede">) =>
    unicos(
      periodos
        .filter((p) => p.establecimiento === o.establecimiento && p.sede === o.sede)
        .map((p) => p.jornada),
    )
  return { establecimientos, sedesDe, jornadasDe }
}

/** Conserva el valor guardado aunque ya no esté en la lista (p. ej. al editar). */
export const conValor = (lista: string[], v: string) =>
  v && !lista.includes(v) ? [...lista, v] : lista
