import { paymentsHandlers } from "./payments"
import { navigationHandlers } from "./navigation"
import { authHandlers } from "./auth"
import { auditsHandlers } from "./audits"
import { auditTablesHandlers } from "./audit-tables"
import { auditSessionStatusesHandlers } from "./audits/audit-session-statuses"
import { auditOperationTypesHandlers } from "./audits/audit-operation-types"
import { academicPeriodsHandlers } from "./academic-period/academic-periods"
import { evaluationPeriodsHandlers } from "./academic-period/evaluation-periods"
import { gradesHandlers } from "./academic-period/grades"
import { gradeGroupsHandlers } from "./academic-period/grade-groups"
import { studyPlansHandlers } from "./academic-period/study-plans"
import { ratingScalesHandlers } from "./academic-period/rating-scales"
import { areaSubjectsHandlers } from "./academic-period/area-subject"
import { promotionCriteriaHandlers } from "./academic-period/promotion-criteria"
import { evaluationCriteriaHandlers } from "./academic-period/evaluation-criteria"
import { generalAreasHandlers } from "./academic-period/general-areas"
import { gradeConfigsHandlers } from "./academic-period/grade-configs"
import { academicAssignmentsHandlers } from "./academic-period/academic-assignments"
import { metodologiasHandlers } from "./academic-period/metodologias"
import { ratingScaleTypesHandlers } from "./academic-period/rating-scale-types"
import { curriculumNodesHandlers } from "./academic-period/curriculum-nodes"
import { evaluationPeriodStatusesHandlers } from "./academic-period/evaluation-period-statuses"
import { academicPeriodStatusesHandlers } from "./academic-period/academic-period-statuses"
import { especialidadesHandlers } from "./academic-period/especialidades"
import { jornadasHandlers } from "./academic-period/jornadas"
import { establishmentHandlers } from "./establishments"
import { campusHandlers } from "./campuses"
import { employeeHandlers } from "./employees"
import { catalogHandlers } from "./catalog"
import { reservationsHandlers } from "./reservations"

export const handlers = [
  ...authHandlers,
  ...paymentsHandlers,
  ...navigationHandlers,
  ...auditsHandlers,
  ...auditTablesHandlers,
  ...auditSessionStatusesHandlers,
  ...auditOperationTypesHandlers,
  ...academicPeriodsHandlers,
  ...evaluationPeriodsHandlers,
  ...gradesHandlers,
  ...gradeGroupsHandlers,
  ...studyPlansHandlers,
  ...areaSubjectsHandlers,
  ...ratingScalesHandlers,
  ...promotionCriteriaHandlers,
  ...evaluationCriteriaHandlers,
  ...generalAreasHandlers,
  ...gradeConfigsHandlers,
  ...academicAssignmentsHandlers,
  ...metodologiasHandlers,
  ...ratingScaleTypesHandlers,
  ...curriculumNodesHandlers,
  ...evaluationPeriodStatusesHandlers,
  ...academicPeriodStatusesHandlers,
  ...especialidadesHandlers,
  ...jornadasHandlers,
  ...reservationsHandlers,
  ...establishmentHandlers,
  ...campusHandlers,
  ...employeeHandlers,
  ...catalogHandlers
]
