import { useReferenteCurricularQuery } from "@/features/planeador/api/query/use-referente-curricular-query"
import { useResolvedSubjectLabelQuery } from "@/features/academic-management/curricular-references/api/query/use-subject-label-resolution"

const DEFAULT_LABEL_PREESCOLAR = "Dimensión"
const DEFAULT_LABEL_OTHER = "Asignatura"

export function useStudyPlanSubjectLabel(gradeId: number | undefined, isPreescolar: boolean): string {
  const { data: referente } = useReferenteCurricularQuery(gradeId, undefined)
  const { data: resolvedLabel } = useResolvedSubjectLabelQuery(referente?.id)

  return resolvedLabel ?? (isPreescolar ? DEFAULT_LABEL_PREESCOLAR : DEFAULT_LABEL_OTHER)
}
