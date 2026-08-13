
import { navigationHandlers } from "@/mocks/handlers/navigation"
import { authHandlers } from "@/mocks/handlers/auth"
import { auditsHandlers } from "@/mocks/handlers/audits"
import { auditTablesHandlers } from "@/mocks/handlers/audit-tables"
import { auditSessionStatusesHandlers } from "@/mocks/handlers/audits/audit-session-statuses"
import { auditOperationTypesHandlers } from "@/mocks/handlers/audits/audit-operation-types"
import { academicPeriodsHandlers } from "@/mocks/handlers/academic-period/academic-periods"
import { evaluationPeriodsHandlers } from "@/mocks/handlers/academic-period/evaluation-periods"
import { gradesHandlers } from "@/mocks/handlers/academic-period/grades"
import { gradeGroupsHandlers } from "@/mocks/handlers/academic-period/grade-groups"
import { studyPlansHandlers } from "@/mocks/handlers/academic-period/study-plans"
import { ratingScalesHandlers } from "@/mocks/handlers/academic-period/rating-scales"
import { areaSubjectsHandlers } from "@/mocks/handlers/academic-period/area-subject"
import { promotionCriteriaHandlers } from "@/mocks/handlers/academic-period/promotion-criteria"
import { evaluationCriteriaHandlers } from "@/mocks/handlers/academic-period/evaluation-criteria"
import { generalAreasHandlers } from "@/mocks/handlers/academic-period/general-areas"
import { gradeConfigsHandlers } from "@/mocks/handlers/academic-period/grade-configs"
import { academicAssignmentsHandlers } from "@/mocks/handlers/academic-period/academic-assignments"
import { metodologiasHandlers } from "@/mocks/handlers/academic-period/metodologias"
import { ratingScaleTypesHandlers } from "@/mocks/handlers/academic-period/rating-scale-types"
import { curriculumNodesHandlers } from "@/mocks/handlers/academic-period/curriculum-nodes"
import { especialidadesHandlers } from "@/mocks/handlers/academic-period/especialidades"
import { establishmentHandlers } from "@/mocks/handlers/establishments"
import { campusHandlers } from "@/mocks/handlers/campuses"
import { employeeHandlers } from "@/mocks/handlers/employees"
import { selectCatalogHandlers } from "./academic-period/select-catalog"
import { catalogHandlers } from "@/mocks/handlers/catalog"
import { reservationsHandlers } from "@/mocks/handlers/reservations"
import { rolesHandlers } from "@/mocks/handlers/roles"
import { plansHandlers } from "@/mocks/handlers/plans"

export const handlers = [
  ...authHandlers,
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
  ...especialidadesHandlers,
  ...selectCatalogHandlers,
  ...reservationsHandlers,
  ...establishmentHandlers,
  ...campusHandlers,
  ...employeeHandlers,
  ...catalogHandlers,
  ...rolesHandlers,
  ...plansHandlers,
]
