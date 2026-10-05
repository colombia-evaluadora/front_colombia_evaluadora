import { createFormHookContexts } from "@tanstack/react-form"

/**
 * Contextos compartidos por `useAppForm` y los campos registrados. Viven
 * aparte de `index.ts` para que `fields.tsx` pueda leer el `field` actual
 * sin import circular (index → fields → index).
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()
