import { z } from "zod"

export const academicPeriodFormSchema = z.object({
  startDate: z.string().min(1, "La fecha de inicio es obligatoria"),
  endDate: z.string().min(1, "La fecha de finalización es obligatoria"),
  enrollmentDeadline: z.string().optional(),
  previousPeriodId: z.number().optional(),
  statusId: z.number,
  jornadaId: z.number,
  reservationEnabled: z.boolean(),
  defaultBlocksCount: z.coerce.number().optional(),
  scheduleStartTime: z.string().optional(),
  scheduleEndTime: z.string().optional(),
  breaks: z.array(
    z.object({
      startTime: z.string(),
      endTime: z.string(),
    })
  ),
})
export type AcademicPeriodFormInput = z.input<typeof academicPeriodFormSchema>
export type AcademicPeriodFormValues = z.infer<typeof academicPeriodFormSchema>

export const academicPeriodsFiltersFormSchema = z.object({
  sedeName: z.string(),
  schoolYearId: z.number().optional(),
  statusId: z.array(z.number()),
})
export type AcademicPeriodsFiltersFormValues = z.infer<
  typeof academicPeriodsFiltersFormSchema
>

export const ACADEMIC_PERIOD_STATUSES = ["ACTIVO", "INACTIVO"] as const

export const academicPeriodsSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  sedeName: z.string().optional().catch(undefined),
  schoolYearId: z.coerce.number().optional().catch(undefined),
  status: z.enum(ACADEMIC_PERIOD_STATUSES).optional().catch(undefined),
})
export type AcademicPeriodsSearch = z.infer<typeof academicPeriodsSearchSchema>