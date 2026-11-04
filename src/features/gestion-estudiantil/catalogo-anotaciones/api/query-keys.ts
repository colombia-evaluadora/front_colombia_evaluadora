import { observadorKeys } from "@/features/gestion-estudiantil/observador/api/query-keys"

const all = [...observadorKeys.all, "catalogo"] as const

/** Cuelga de `observadorKeys`: un cambio aquí refresca también el selector de códigos del Observador. */
export const catalogoKeys = {
  all,
  lista: <P>(params: P) => [...all, "lista", params] as const,
} as const
