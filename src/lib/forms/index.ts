import { createFormHook } from "@tanstack/react-form"

import {
  fieldContext,
  formContext,
  useFieldContext,
  useFormContext,
} from "@/lib/forms/form-context"
import {
  CheckboxField,
  DateField,
  NumberField,
  SelectField,
  TextareaField,
  TextField,
} from "@/lib/forms/fields"

/**
 * Hook de formularios de la app. `useAppForm` + `<form.AppField>` exponen
 * los campos registrados como `field.TextField`, `field.SelectField`, etc.
 * (ver `fields.tsx`), que ya traen label, error, estado inválido y
 * `disabled` del `FormDisabledProvider`.
 *
 * `useFieldContext`/`useFormContext` comparten los mismos contextos, así un
 * componente propio (un combobox, un campo muy particular) puede leer el
 * `field` actual sin recibirlo por props: basta con montarlo dentro de
 * `<form.AppField>`.
 */
export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    TextareaField,
    NumberField,
    SelectField,
    DateField,
    CheckboxField,
  },
  formComponents: {},
})

export { useFieldContext, useFormContext }
export { isFieldInvalid, toFieldErrors } from "@/lib/forms/field-state"
export { FormDisabledContext, useFormDisabled } from "@/lib/forms/form-disabled-context"
export { FormDisabledProvider } from "@/lib/forms/form-disabled-provider"
