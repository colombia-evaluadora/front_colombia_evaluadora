import { createContext, useContext } from "react"

/**
 * Deshabilita los campos registrados de `@/lib/forms` sin pasar `disabled`
 * por props a cada sección.
 *
 * Existe porque los controles de Base UI (Select, Checkbox, Combobox,
 * DatePicker…) ignoran `<fieldset disabled>`: hasta ahora cada sección
 * recibía `disabled` y lo repartía a mano. Con `FormDisabledProvider`
 * alcanza con envolver la sección (o el form entero).
 */
export const FormDisabledContext = createContext(false)

/** `true` si algún `FormDisabledProvider` ancestro deshabilita el form. */
export function useFormDisabled(): boolean {
  return useContext(FormDisabledContext)
}
