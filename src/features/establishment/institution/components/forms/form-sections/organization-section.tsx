import { MarcoOpciones } from "@/components/marco-opciones"
import { TituloConAyuda } from "@/components/titulo-con-ayuda"
import { Field, FieldLabel } from "@/components/ui/field"
import { LockIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { EstablishmentOrganization } from "@/features/establishment/institution/api/types/establishment"
import {
  PREGUNTAS_ARTICULACION,
  PREGUNTAS_CALCULADAS,
  PREGUNTAS_ORGANIZACION,
  type RespuestaOrganizacion,
} from "@/features/establishment/institution/utils/organizacion"

interface OrganizationFormSectionProps {
  value: EstablishmentOrganization
  onChange: (next: EstablishmentOrganization) => void
}

/**
 * Organización y articulación: las trece preguntas Sí o No del formato de establecimiento del SIMPADE.
 * Once las marca quien edita el establecimiento, sin valor predeterminado; las otras dos las calcula el
 * sistema y no viajan al guardar.
 */
export function OrganizationFormSection({ value, onChange }: OrganizationFormSectionProps) {
  function pregunta({ key, label }: { key: RespuestaOrganizacion; label: string }) {
    const actual = value[key]
    return (
      <MarcoOpciones key={key} id={`establishment-${key}`} label={label}>
        <RadioGroup
          aria-labelledby={`establishment-${key}-label`}
          value={actual === true ? "S" : actual === false ? "N" : ""}
          onValueChange={(selected) => onChange({ ...value, [key]: selected === "S" })}
        >
          <label className="flex items-center gap-2">
            <RadioGroupItem value="S" />
            Sí
          </label>
          <label className="flex items-center gap-2">
            <RadioGroupItem value="N" />
            No
          </label>
        </RadioGroup>
      </MarcoOpciones>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        Trece preguntas Sí o No del formato de establecimiento del SIMPADE: ocho de organización y
        cinco de articulación. Se actualizan cada año; sin valor predeterminado, vacío es Sin
        información.
      </p>

      <section className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold">Organización</h4>
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-3">
          {PREGUNTAS_ORGANIZACION.map(pregunta)}
          {PREGUNTAS_CALCULADAS.map(({ key, label, ayuda }) => (
            <Field key={key} orientation="vertical" variant="outlined">
              <FieldLabel htmlFor={`establishment-${key}`}>
                <TituloConAyuda titulo={label} ayuda={ayuda} />
              </FieldLabel>
              <div className="relative">
                <Input
                  id={`establishment-${key}`}
                  readOnly
                  disabled
                  value={value[key] === true ? "Sí" : "No"}
                />
                <LockIcon
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
              </div>
            </Field>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold">Articulación</h4>
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-3">
          {PREGUNTAS_ARTICULACION.map(pregunta)}
        </div>
      </section>
    </div>
  )
}
