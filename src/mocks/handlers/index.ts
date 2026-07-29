import { paymentsHandlers } from "./payments"
import { navigationHandlers } from "./navigation"
import { authHandlers } from "./auth"
import { auditsHandlers } from "./audits"
import { auditTablesHandlers } from "./audit-tables"
import { academicPeriodsHandlers } from "./academic-periods"
import { evaluationPeriodsHandlers } from "./evaluation-periods"
import { gradesHandlers } from "./grades"
import { gradeGroupsHandlers } from "./grade-groups"
import { studyPlansHandlers } from "./study-plans"
import { teachersHandlers } from "./teachers"
import { ratingScalesHandlers } from "./rating-scales"
import { areaSubjectsHandlers } from "./area-subject"
import { promotionCriteriaHandlers } from "./promotion-criteria"
import { evaluationCriteriaHandlers } from "./evaluation-criteria"
import { generalAreasHandlers } from "./general-areas"
import { gradeConfigsHandlers } from "./grade-configs"
import { academicAssignmentsHandlers } from "./academic-assignments"
import { metodologiasHandlers } from "./metodologias"
import { ratingScaleTypesHandlers } from "./rating-scale-types"
import { reservationsHandlers } from "./reservations"

export const handlers = [
  ...authHandlers,
  ...paymentsHandlers,
  ...navigationHandlers,
  ...auditsHandlers,
  ...auditTablesHandlers,
  ...academicPeriodsHandlers,
  ...evaluationPeriodsHandlers,
  ...gradesHandlers,
  ...gradeGroupsHandlers,
  ...studyPlansHandlers,
  ...teachersHandlers,
  ...areaSubjectsHandlers,
  ...ratingScalesHandlers,
  ...promotionCriteriaHandlers,
  ...evaluationCriteriaHandlers,
  ...generalAreasHandlers,
  ...gradeConfigsHandlers,
  ...academicAssignmentsHandlers,
  ...metodologiasHandlers,
  ...ratingScaleTypesHandlers,
  ...reservationsHandlers,
]
