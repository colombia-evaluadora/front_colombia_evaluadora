import { z } from "zod"

import type { PermissionStatus } from "@/features/establishment/institution/api/types/permission"

export interface PermissionDraft {
  order: string
  roleId: number | null
  campusId: number | null
  workScheduleId: number | null
  status: PermissionStatus | ""
}

// El orden se valida como texto: un `number` vacío llega como NaN y daría el mensaje de tipo.
export const permissionDraftSchema = z.object({
  order: z
    .string()
    .trim()
    .min(1, "Ingresa el orden.")
    .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, {
      message: "El orden debe ser un número entero mayor que cero.",
    }),
  // `custom` deja el resultado tipado sin castear.
  roleId: z.custom<number>((value) => typeof value === "number", {
    message: "Selecciona el rol.",
  }),
  campusId: z.custom<number>((value) => typeof value === "number", {
    message: "Selecciona la sede educativa.",
  }),
  workScheduleId: z.custom<number>((value) => typeof value === "number", {
    message: "Selecciona la jornada.",
  }),
  status: z.custom<PermissionStatus>((value) => typeof value === "string" && value !== "", {
    message: "Selecciona el estado.",
  }),
})

export function createPermissionDraft(nextOrder = 1): PermissionDraft {
  return {
    order: String(nextOrder),
    roleId: null,
    campusId: null,
    workScheduleId: null,
    status: "",
  }
}
