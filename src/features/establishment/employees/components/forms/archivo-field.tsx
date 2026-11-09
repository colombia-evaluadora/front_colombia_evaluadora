import { useRef } from "react"
import { useStore } from "@tanstack/react-form"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { FileTextIcon, PaperclipIcon, XIcon } from "@/components/ui/icons"
import { formatBytes } from "@/lib/image-file"
import { isFieldInvalid, toFieldErrors, useFieldContext, useFormDisabled } from "@/lib/forms"
import { fileTooLarge, invalidFileType } from "@/lib/forms/messages"

interface ArchivoFieldProps {
  label: string
  /** "PDF, Word, Excel, JPG o PNG; máximo 10 MB." */
  hint: string
  extensions: readonly string[]
  maxMb: number
  required?: boolean
}

/** Un solo archivo, con su tipo y peso validados al elegirlo (el back los vuelve a validar). */
export function ArchivoField({ label, hint, extensions, maxMb, required }: ArchivoFieldProps) {
  const field = useFieldContext<File | null>()
  const state = useStore(field.store, (s) => s)
  const submissionAttempts = useStore(field.form.store, (s) => s.submissionAttempts)
  const disabled = useFormDisabled()
  const input = useRef<HTMLInputElement>(null)
  const file = state.value
  const invalid = isFieldInvalid({ state }, submissionAttempts)

  function choose(next: File) {
    const extension = next.name.split(".").pop()?.toLowerCase() ?? ""
    if (!extensions.includes(extension)) {
      field.setMeta((meta) => ({ ...meta, isTouched: true, errorMap: { ...meta.errorMap, onChange: invalidFileType(hint.split(";")[0]) } }))
      return
    }
    if (next.size > maxMb * 1024 * 1024) {
      field.setMeta((meta) => ({ ...meta, isTouched: true, errorMap: { ...meta.errorMap, onChange: fileTooLarge(maxMb) } }))
      return
    }
    field.handleChange(next)
    field.handleBlur()
  }

  return (
    <Field orientation="vertical" data-invalid={invalid || undefined} data-disabled={disabled || undefined}>
      <FieldLabel htmlFor={`${field.name}-input`}>
        {label}
        {required && " *"}
      </FieldLabel>
      <FieldDescription>{hint}</FieldDescription>
      <input
        ref={input}
        id={`${field.name}-input`}
        type="file"
        hidden
        accept={extensions.map((e) => `.${e}`).join(",")}
        onChange={(event) => {
          const next = event.target.files?.[0]
          event.target.value = ""
          if (next) choose(next)
        }}
      />
      {file ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <FileTextIcon className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-primary">
            {file.name} · {formatBytes(file.size)}
          </span>
          {disabled ? null : (
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label="Quitar archivo"
              onClick={() => field.handleChange(null)}
            >
              <XIcon />
            </Button>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          color="neutral"
          size="sm"
          className="w-fit"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          <PaperclipIcon data-icon="inline-start" />
          Elegir archivo
        </Button>
      )}
      {invalid ? <FieldError errors={toFieldErrors(state.meta.errors)} /> : null}
    </Field>
  )
}
