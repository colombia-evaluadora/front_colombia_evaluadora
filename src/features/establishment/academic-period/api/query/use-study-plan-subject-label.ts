import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { catalogoMeta } from "@/lib/offline/query-meta"
import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"
import { useReferenteCurricularQuery } from "@/features/planeador/api/query/use-referente-curricular-query"
import { useResolvedSubjectLabelQuery } from "@/features/academic-management/curricular-references/api/query/use-subject-label-resolution"

const DEFAULT_LABEL_PREESCOLAR = "Dimensión"
const DEFAULT_LABEL_OTHER = "Asignatura"

export function useStudyPlanSubjectLabel(gradeId: number | undefined, isPreescolar: boolean): string {
  const { data: referente } = useReferenteCurricularQuery(gradeId, undefined)
  const { data: resolvedLabel } = useResolvedSubjectLabelQuery(referente?.id)

  return resolvedLabel ?? (isPreescolar ? DEFAULT_LABEL_PREESCOLAR : DEFAULT_LABEL_OTHER)
}

interface GradoRotulosRow {
  nombre_asignatura: string | null
}

function fetchGradoRotulos(gradeId: number): Promise<GradoRotulosRow[]> {
  return evalCol.getRows<GradoRotulosRow>(`/grados/${gradeId}/rotulos-referente`)
}

export function useGradeSubjectLabel(gradeId: number | undefined, isPreescolar: boolean): string {
  const { data: rows } = useQuery({
    meta: catalogoMeta(),
    queryKey: academicPeriodKeys.gradeRotulos.byGrade(gradeId),
    queryFn: () => fetchGradoRotulos(gradeId as number),
    enabled: gradeId != null,
    staleTime: 1000 * 60,
  })
  return rows?.[0]?.nombre_asignatura || (isPreescolar ? DEFAULT_LABEL_PREESCOLAR : DEFAULT_LABEL_OTHER)
}
