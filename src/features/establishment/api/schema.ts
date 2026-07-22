import { z } from "zod"

export const ACADEMIC_PERIOD_STATUSES = ["ACTIVO", "INACTIVO"] as const


export const academicPeriodFormSchema = z.object({
  startDate: z.string().min(1, "La fecha de inicio es obligatoria"),
  endDate: z.string().min(1, "La fecha de finalización es obligatoria"),
  enrollmentDeadline: z.string(),
  previousPeriodId: z.number().int().positive().nullable(),
  status: z.enum(ACADEMIC_PERIOD_STATUSES),
  jornadaId: z.number().int().positive("La jornada es obligatoria"),
  reservationEnabled: z.boolean(),
  defaultBlocksCount: z.number().int().nonnegative().nullable(),
  scheduleStartTime: z.string(),
  scheduleEndTime: z.string(),
  breaks: z.array(
    z.object({
      startTime: z.string().min(1),
      endTime: z.string().min(1),
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