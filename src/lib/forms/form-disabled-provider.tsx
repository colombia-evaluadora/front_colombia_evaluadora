import type { ReactNode } from "react"

import { FormDisabledContext, useFormDisabled } from "@/lib/forms/form-disabled-context"

/**
 * Deshabilita todos los campos registrados que queden debajo. Los providers
 * anidados se suman: un hijo con `disabled={false}` NO rehabilita lo que un
 * ancestro deshabilitó (mismo criterio que `<fieldset disabled>` nativo).
 */
export function FormDisabledProvider({
  disabled = true,
  children,
}: {
  disabled?: boolean
  children: ReactNode
}) {
  const parentDisabled = useFormDisabled()
  return (
    <FormDisabledContext.Provider value={parentDisabled || disabled}>
      {children}
    </FormDisabledContext.Provider>
  )
}
