import { useQueries } from "@tanstack/react-query"

import { EDUCATION_LEVELS } from "@/features/academic-management/curricular-references/api/catalogs"
import { useCurricularReferencesQuery } from "@/features/academic-management/curricular-references/api/query/use-curricular-references"
import {
  curricularReferenceAreasQueryKey,
  fetchCurricularReferenceAreas,
} from "@/features/academic-management/curricular-references/api/query/use-curricular-reference-areas"
import {
  curricularStatementsQueryKey,
  fetchStatements,
} from "@/features/academic-management/curricular-references/api/query/use-curricular-statements"
import { nivelEducativoCodeForGradoPalabra } from "@/features/planeador/lib/grado-nivel-educativo"

/**
 * Enunciados de DBA disponibles para el "Grado" elegido en la unidad — el
 * cruce pedido es SOLO grado → nivel educativo → Referente Curricular, sin
 * pasar por la asignatura (a diferencia de `useEnfoquePedagogicoDerivado`,
 * que resuelve lo mismo pero solo necesita saber SI hay algún referente
 * Formativo, acá hace falta el texto real de los enunciados).
 *
 * El endpoint de enunciados (`fetchStatements`) exige un `areaId` puntual
 * —no hay un "todas las áreas" en el mock/backend—, así que para juntar
 * TODOS los enunciados de un referente hay que recorrer sus áreas primero
 * (`fetchCurricularReferenceAreas`) y traer los enunciados de cada una.
 * Doble `useQueries` en cascada, mismo patrón que `useGradoGrupoCombos`
 * (grados → grupos) para una cantidad de queries que varía en runtime.
 */
export function useEnunciadosDbaQuery(gradoPalabra: string) {
  const nivelCode = nivelEducativoCodeForGradoPalabra(gradoPalabra)
  const nivelId = nivelCode ? EDUCATION_LEVELS.find((l) => l.code === nivelCode)?.id : undefined

  const { data: referenciasResult, isPending: isPendingReferencias } = useCurricularReferencesQuery({
    filters: { educationLevels: nivelId != null ? [String(nivelId)] : [] },
    sorting: [],
    pageIndex: 0,
    pageSize: 20,
  })

  // Solo referentes activos: uno dado de baja no debería seguir ofreciendo
  // enunciados nuevos para elegir.
  const referencias = nivelId != null ? (referenciasResult?.rows ?? []).filter((r) => r.active) : []

  const areasQueries = useQueries({
    queries: referencias.map((referencia) => ({
      queryKey: curricularReferenceAreasQueryKey(referencia.id),
      queryFn: () => fetchCurricularReferenceAreas(referencia.id),
      staleTime: Infinity,
    })),
  })

  const areaPares = referencias.flatMap((referencia, index) => {
    const areas = areasQueries[index]?.data ?? []
    return areas.map((area) => ({ curricularReferenceId: referencia.id, areaId: area.id }))
  })

  const statementsQueries = useQueries({
    queries: areaPares.map((par) => ({
      queryKey: curricularStatementsQueryKey(par.curricularReferenceId, par.areaId),
      queryFn: () => fetchStatements(par.curricularReferenceId, par.areaId),
      staleTime: Infinity,
    })),
  })

  const isPending =
    nivelId != null &&
    (isPendingReferencias ||
      areasQueries.some((q) => q.isPending) ||
      statementsQueries.some((q) => q.isPending))

  // Dedupe por id: en teoría dos áreas de un mismo referente no deberían
  // repetir un enunciado, pero si pasara no queremos la opción duplicada
  // en el `<Select>`.
  const vistos = new Set<number>()
  const enunciados = statementsQueries
    .flatMap((q) => q.data ?? [])
    .filter((statement) => {
      if (!statement.active || vistos.has(statement.id)) return false
      vistos.add(statement.id)
      return true
    })

  return { enunciados, isPending }
}
