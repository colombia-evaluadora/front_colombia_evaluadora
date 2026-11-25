import { FichaDatos } from "@/components/ficha-datos"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { ArrowCounterClockwiseIcon, LockIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"

/** Dato que no se edita en este formulario (establecimiento, consecutivo de la principal, calculados). */
export function ReadOnlyValue({
  id,
  label,
  value,
  description,
  locked = false,
  required = false,
}: {
  id: string
  label: string
  value: string
  description?: string
  locked?: boolean
  required?: boolean
}) {
  return (
    <Field orientation="vertical" variant="outlined" data-disabled>
      <FieldLabel htmlFor={id}>
        {label}
        {required && "*"}
      </FieldLabel>
      <div className="relative">
        <Input id={id} value={value} readOnly disabled className={locked ? "pr-9" : undefined} />
        {locked ? (
          <LockIcon aria-hidden className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-muted-foreground" />
        ) : null}
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  )
}

/**
 * Datos de la sede principal que vienen del establecimiento (Regla 85): en
 * solo lectura y en la ficha de datos de los Ver detalle (`FichaDatos`).
 */
export function SyncedWithEstablishment({ pairs }: { pairs: [string, string][] }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
      <p className="flex flex-wrap items-center gap-x-2 text-sm">
        <ArrowCounterClockwiseIcon aria-hidden className="size-4" />
        <span className="font-medium">Sincronizado con el establecimiento</span>
        <span className="text-xs text-muted-foreground">· Se cambia desde Establecimientos.</span>
      </p>
      <FichaDatos datos={pairs.map(([etiqueta, valor]) => ({ etiqueta, valor: valor?.trim() }))} />
    </section>
  )
}
