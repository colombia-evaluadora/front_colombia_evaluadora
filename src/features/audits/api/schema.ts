import { z } from "zod"

export const SESSION_STATUSES = ["active", "closed"] as const

export const auditFiltersFormSchema = z.object({
  author: z.string(),
  statuses: z.array(z.enum(SESSION_STATUSES)),
  // yyyy-MM-dd, string en vez de Date para que el form/URL los serialicen igual.
  startedFrom: z.string(),
  startedTo: z.string(),
})
export type AuditFiltersFormInput = z.input<typeof auditFiltersFormSchema>
export type AuditFiltersFormValues = z.infer<typeof auditFiltersFormSchema>

export const auditsSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  author: z.string().optional().catch(undefined),
  statuses: z.array(z.enum(SESSION_STATUSES)).optional().catch(undefined),
  startedFrom: z.string().optional().catch(undefined),
  startedTo: z.string().optional().catch(undefined),
})
export type AuditsSearch = z.infer<typeof auditsSearchSchema>

export const OPERATION_TYPES = ["INSERT", "UPDATE", "DELETE"] as const

export const tableOperationsFiltersFormSchema = z.object({
  author: z.string(),
  operations: z.array(z.enum(OPERATION_TYPES)),
  occurredFrom: z.string(),
  occurredTo: z.string(),
})
export type TableOperationsFiltersFormInput = z.input<
  typeof tableOperationsFiltersFormSchema
>
export type TableOperationsFiltersFormValues = z.infer<
  typeof tableOperationsFiltersFormSchema
>

export const tableOperationsSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  author: z.string().optional().catch(undefined),
  operations: z.array(z.enum(OPERATION_TYPES)).optional().catch(undefined),
  occurredFrom: z.string().optional().catch(undefined),
  occurredTo: z.string().optional().catch(undefined),
})
export type TableOperationsSearch = z.infer<typeof tableOperationsSearchSchema>
