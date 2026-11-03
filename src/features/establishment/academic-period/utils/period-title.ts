import { ENROLLMENT_MODALITIES } from "@/features/establishment/academic-period/api/schema"
import type {
  AcademicPeriod,
  AcademicPeriodDetail,
} from "@/features/establishment/academic-period/api/types/academic-period"

/** "IE Central · 2027 · Mañana · Semestral · C2": la identidad del periodo (Regla 14). */
export function toPeriodTitle(detail: AcademicPeriodDetail, jornadaName: string | undefined): string {
  const modality = ENROLLMENT_MODALITIES.find((m) => m.value === detail.config.enrollmentModality)
  return [
    detail.sedeName,
    detail.startDate.slice(0, 4),
    jornadaName,
    modality?.label,
    `C${detail.config.cycle}`,
  ]
    .filter(Boolean)
    .join(" · ")
}

/** El mismo título desde una fila del listado de períodos. */
export function toPeriodRowTitle(period: AcademicPeriod): string {
  const modality = ENROLLMENT_MODALITIES.find((m) => m.value === period.enrollmentModality)
  return [
    period.sedeName,
    period.startDate.slice(0, 4),
    period.jornadaName,
    modality?.label,
    period.cycle != null ? `C${period.cycle}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}
