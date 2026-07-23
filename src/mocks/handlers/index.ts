import { paymentsHandlers } from "./payments"
import { navigationHandlers } from "./navigation"
import { authHandlers } from "./auth"
import { auditsHandlers } from "./audits"
import { auditTablesHandlers } from "./audit-tables"
import { academicPeriodsHandlers } from "./academic-periods"
import { evaluationPeriodsHandlers } from "./evaluation-periods"
import { gradesHandlers } from "./grades"
import { ratingScalesHandlers } from "./rating-scales"
import { areaSubjectsHandlers } from "./area-subject"

export const handlers = [
  ...authHandlers,
  ...paymentsHandlers,
  ...navigationHandlers,
  ...auditsHandlers,
  ...auditTablesHandlers,
  ...academicPeriodsHandlers,
  ...evaluationPeriodsHandlers,
  ...gradesHandlers,
  ...areaSubjectsHandlers,
  ...ratingScalesHandlers,
]
