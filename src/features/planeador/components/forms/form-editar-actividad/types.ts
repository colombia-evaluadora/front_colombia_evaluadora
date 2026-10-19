import type { useForm } from "@tanstack/react-form"
import type { Actividad } from "@/features/planeador/api/types/actividad"

// Alias de `useForm` con `Actividad` como `TFormData`; los `TOn…` quedan en `any`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormActividad = ReturnType<typeof useForm<Actividad, any, any, any, any, any, any, any, any, any, any, any>>
