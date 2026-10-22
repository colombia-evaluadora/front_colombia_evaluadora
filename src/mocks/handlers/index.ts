import { authHandlers } from "@/mocks/handlers/auth"
import { devicesHandlers } from "@/mocks/handlers/devices"
import { notificacionesHandlers } from "@/mocks/handlers/notificaciones"
import { comunicacionesGruposHandlers } from "@/mocks/handlers/comunicaciones-grupos"
import { healthHandlers } from "@/mocks/handlers/health"
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
import { areasHandlers } from "@/mocks/handlers/academic-period/areas"
import { subjectsHandlers } from "@/mocks/handlers/academic-period/subjects"
import { areaSubjectsHandlers } from "@/mocks/handlers/academic-period/area-subject"
import { promotionCriteriaHandlers } from "@/mocks/handlers/academic-period/promotion-criteria"
import { evaluationCriteriaHandlers } from "@/mocks/handlers/academic-period/evaluation-criteria"
import { generalAreasHandlers } from "@/mocks/handlers/academic-period/general-areas"
import { criteriosPrioridadHandlers } from "@/mocks/handlers/criterios-prioridad"
import { superadministradoresHandlers } from "@/mocks/handlers/superadministradores"
import { parametrosEdadHandlers } from "@/mocks/handlers/parametros-edad"
import { academicAssignmentsHandlers } from "@/mocks/handlers/academic-period/academic-assignments"
import { horarioHandlers } from "@/mocks/handlers/academic-period/horario"
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
import { reportesHandlers } from "@/mocks/handlers/reportes"
import { verificacionBoletinHandlers } from "@/mocks/handlers/verificacion-boletin"
import { preMatriculaHandlers } from "@/mocks/handlers/pre-matricula"
import { enrollmentsHandlers } from "@/mocks/handlers/enrollments"
import { matriculaHandlers } from "@/mocks/handlers/matricula"
import { curricularReferencesHandlers } from "@/mocks/handlers/academic-management/curricular-references"
import { curricularStatementsHandlers } from "@/mocks/handlers/academic-management/curricular-statements"
import { planeadorHandlers } from "@/mocks/handlers/planeador"
import { planeadorDocentesHandlers } from "@/mocks/handlers/planeador/docentes"
import { planeadorPlanillaHandlers } from "@/mocks/handlers/planeador/planilla"
import { planeadorValidacionCoordinadorHandlers } from "@/mocks/handlers/planeador/validacion-coordinador"
import { asistenciaHandlers } from "@/mocks/handlers/asistencia/asistencia"
import { informesHandlers } from "@/mocks/handlers/informes"
import {
  comunicacionesArchivosHandlers,
  comunicacionesHandlers,
  comunicacionesMensajesHandlers,
} from "@/mocks/handlers/comunicaciones"
import { comunicacionesEleccionesHandlers } from "@/mocks/handlers/comunicaciones-elecciones"
import { forosHandlers } from "@/mocks/handlers/comunicaciones-foros"
import { comunicacionesEncuestasHandlers } from "@/mocks/handlers/comunicaciones-encuestas"
import { comunicacionesEvaluacionesHandlers } from "@/mocks/handlers/comunicaciones-evaluaciones"
import { comunicacionesComunicadosHandlers } from "@/mocks/handlers/comunicaciones-comunicados"
import { pushHandlers } from "@/mocks/handlers/notificaciones/push"
import { realtimeHandlers } from "@/mocks/handlers/realtime"
import { agenteHandlers } from "@/mocks/handlers/agente"

export const handlers = [
  ...authHandlers,
  ...devicesHandlers,
  ...agenteHandlers,
  ...healthHandlers,
  ...verificacionBoletinHandlers,
  ...reportesHandlers,
  ...auditsHandlers,
  ...auditTablesHandlers,
  ...auditSessionStatusesHandlers,
  ...auditOperationTypesHandlers,
  ...academicPeriodsHandlers,
  ...evaluationPeriodsHandlers,
  ...gradesHandlers,
  ...gradeGroupsHandlers,
  ...studyPlansHandlers,
  ...areasHandlers,
  ...subjectsHandlers,
  ...areaSubjectsHandlers,
  ...ratingScalesHandlers,
  ...promotionCriteriaHandlers,
  ...evaluationCriteriaHandlers,
  ...generalAreasHandlers,
  ...criteriosPrioridadHandlers,
  ...superadministradoresHandlers,
  ...parametrosEdadHandlers,
  ...academicAssignmentsHandlers,
  ...horarioHandlers,
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
  ...preMatriculaHandlers,
  ...enrollmentsHandlers,
  // Antes de `planeadorHandlers`: MSW usa el primer match.
  ...planeadorValidacionCoordinadorHandlers,
  ...planeadorHandlers,
  ...planeadorDocentesHandlers,
  ...planeadorPlanillaHandlers,
  ...matriculaHandlers,
  ...curricularReferencesHandlers,
  ...curricularStatementsHandlers,
  ...asistenciaHandlers,
  ...informesHandlers,
  ...comunicacionesArchivosHandlers,
  ...comunicacionesEleccionesHandlers,
  ...comunicacionesEncuestasHandlers,
  ...comunicacionesEvaluacionesHandlers,
  ...comunicacionesComunicadosHandlers,
  ...pushHandlers,
  ...realtimeHandlers,
  ...forosHandlers,
  ...comunicacionesMensajesHandlers,
  // Antes que el chat general: atiende los grupos y deja caer el resto.
  ...comunicacionesGruposHandlers,
  ...comunicacionesHandlers,
  ...notificacionesHandlers,
]
