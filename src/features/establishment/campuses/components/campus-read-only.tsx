import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { ArrowCounterClockwiseIcon, LockIcon, MapPinIcon, PencilIcon, TrashIcon } from "@/components/ui/icons"
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
 * solo lectura y como tabla de pares etiqueta · valor, tres por fila.
 */
export function SyncedWithEstablishment({ pairs }: { pairs: [string, string][] }) {
  // Completa la última fila para que la grilla no quede con huecos sin borde.
  const filler = (3 - (pairs.length % 3)) % 3
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
      <p className="flex flex-wrap items-center gap-x-2 text-sm">
        <ArrowCounterClockwiseIcon aria-hidden className="size-4" />
        <span className="font-medium">Sincronizado con el establecimiento</span>
        <span className="text-xs text-muted-foreground">· Se cambia desde Establecimientos.</span>
      </p>
      {/* `gap-px` sobre fondo de borde dibuja las líneas entre celdas. */}
      <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-px overflow-hidden rounded-md border border-border bg-border text-sm lg:grid-cols-[minmax(8rem,auto)_1fr_minmax(8rem,auto)_1fr_minmax(8rem,auto)_1fr]">
        {pairs.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="contents">
            <dt className="bg-muted/40 px-3 py-2 text-muted-foreground">{etiqueta}</dt>
            <dd className="min-w-0 bg-card px-3 py-2 break-words">{valor?.trim() || "—"}</dd>
          </div>
        ))}
        {Array.from({ length: filler }, (_, i) => (
          <div key={i} aria-hidden className="hidden bg-card lg:col-span-2 lg:block" />
        ))}
      </dl>
    </section>
  )
}

/**
 * Recuadro del mapa (Regla 89) mientras se define el proveedor: deja el lugar
 * del diseño con sus botones, deshabilitados, y explica por qué.
 */
export function MapPlaceholder({ title, required = false, kind }: { title: string; required?: boolean; kind: "point" | "area" }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        {title}
        {required && "*"}
      </p>
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-4 text-center text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <MapPinIcon aria-hidden className="size-4 shrink-0" />
          El mapa estará disponible cuando se defina el proveedor de mapas.
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {kind === "point" ? (
          <Button type="button" variant="outline" color="neutral" size="sm" disabled>
            <MapPinIcon data-icon="inline-start" />
            Ubicar con la dirección
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" color="neutral" size="sm" disabled>
              <PencilIcon data-icon="inline-start" />
              Dibujar
            </Button>
            <Button type="button" variant="outline" color="neutral" size="sm" disabled>
              <TrashIcon data-icon="inline-start" />
              Borrar
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
