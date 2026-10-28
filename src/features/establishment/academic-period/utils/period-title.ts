import { ENROLLMENT_MODALITIES } from "@/features/establishment/academic-period/api/schema"
import type { AcademicPeriodDetail } from "@/features/establishment/academic-period/api/types/academic-period"

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
