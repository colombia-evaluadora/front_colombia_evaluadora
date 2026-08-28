import { z } from "zod"

export const curricularReferenceFiltersFormSchema = z.object({
  search: z.string(),
  educationLevels: z.array(z.string()),
  pedagogicalApproaches: z.array(z.string()),
  evaluationTypes: z.array(z.string()),
  active: z.string(),
})

export type CurricularReferenceFiltersFormInput = z.input<typeof curricularReferenceFiltersFormSchema>

export type CurricularReferenceFiltersFormValues = z.infer<typeof curricularReferenceFiltersFormSchema>

export const curricularReferencesSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  educationLevels: z.array(z.string()).optional().catch(undefined),
  pedagogicalApproaches: z.array(z.string()).optional().catch(undefined),
  evaluationTypes: z.array(z.string()).optional().catch(undefined),
  active: z.string().optional().catch(undefined),
})

export type CurricularReferencesSearch = z.infer<typeof curricularReferencesSearchSchema>
