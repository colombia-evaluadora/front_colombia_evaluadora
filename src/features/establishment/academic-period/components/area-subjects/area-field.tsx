import type { ReactNode } from "react"
import type { AnyFieldApi } from "@tanstack/react-form"

import { Field, FieldError, FieldLabel } from "@/components/ui/field"

// Campo del formulario del área: comparte el shell `Field + Label + error` y
// deja que cada campo aporte su control específico vía `children`.
export function AreaField({
  field,
  label,
  children,
}: {
  field: AnyFieldApi
  label: string
  children: (isInvalid: boolean) => ReactNode
}) {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
  return (
    <Field variant="outlined" data-invalid={isInvalid} className="w-auto min-w-[11rem] flex-1">
      <FieldLabel htmlFor={field.name} className="flex-1">
        {label}
      </FieldLabel>
      {children(isInvalid)}
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  )
}
