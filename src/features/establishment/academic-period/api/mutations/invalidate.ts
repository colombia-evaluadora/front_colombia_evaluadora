import type { QueryClient } from "@tanstack/react-query"

import { academicPeriodKeys } from "@/features/establishment/academic-period/api/query-keys"

// Helpers de invalidación por entidad: create/update/delete usan el mismo set.

type Key = readonly unknown[]

function invalidateAll(queryClient: QueryClient, keys: Key[]) {
  return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

export function invalidateAcademicPeriodRelated(queryClient: QueryClient) {
  return invalidateAll(queryClient, [
    academicPeriodKeys.academicPeriods.all,
    academicPeriodKeys.academicPeriod.all,
  ])
}

export function invalidateEvaluationPeriodRelated(queryClient: QueryClient) {
  return invalidateAll(queryClient, [academicPeriodKeys.evaluationPeriods.all])
}

export function invalidateGradeRelated(queryClient: QueryClient) {
  return invalidateAll(queryClient, [academicPeriodKeys.grades.all])
}

// El director del grupo re-sincroniza asignaciones de preescolar (V285).
export function invalidateGradeGroupRelated(queryClient: QueryClient) {
  return invalidateAll(queryClient, [
    academicPeriodKeys.gradeGroups.all,
    academicPeriodKeys.assignmentSubjects.all,
    academicPeriodKeys.teacherAssignments.all,
  ])
}

export function invalidateRatingScaleRelated(queryClient: QueryClient) {
  return invalidateAll(queryClient, [academicPeriodKeys.ratingScales.all])
}

export function invalidateEnfasisRelated(queryClient: QueryClient) {
  return invalidateAll(queryClient, [academicPeriodKeys.especialidades.all])
}

// En preescolar el backend arma el horario al guardar el plan (V437).
export function invalidateStudyPlanRelated(queryClient: QueryClient) {
  return invalidateAll(queryClient, [
    academicPeriodKeys.studyPlans.all,
    academicPeriodKeys.studyPlanAvailable.all,
    academicPeriodKeys.assignmentSubjects.all,
    academicPeriodKeys.teacherAssignments.all,
    academicPeriodKeys.horario.all,
  ])
}

export function invalidateSubjectRelated(queryClient: QueryClient) {
  return invalidateAll(queryClient, [
    academicPeriodKeys.areaSubjects.all,
    academicPeriodKeys.subjects.all,
    academicPeriodKeys.periodAreas.all,
    academicPeriodKeys.subjectDetails.all,
    academicPeriodKeys.studyPlanAvailable.all,
  ])
}

export function invalidateAreaSubjectRelated(queryClient: QueryClient) {
  return Promise.all([
    invalidateSubjectRelated(queryClient),
    invalidateAll(queryClient, [
      academicPeriodKeys.especialidades.all,
      academicPeriodKeys.studyPlans.all,
      academicPeriodKeys.generalAreas(),
    ]),
  ])
}
