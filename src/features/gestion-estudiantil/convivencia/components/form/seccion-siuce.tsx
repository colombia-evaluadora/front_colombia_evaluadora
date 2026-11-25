import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { DatosSiuceFields } from "@/features/gestion-estudiantil/convivencia/components/datos-siuce-fields"
import { SoportesUpload } from "@/features/gestion-estudiantil/commons/components/soportes-upload"
import type { CasoFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-caso-form"
import { MAX_NUMERO_SIUCE } from "@/features/gestion-estudiantil/convivencia/utils/caso-form"

/** Bloque plegable «Datos para el SIUCE» con el soporte del caso. */
interface Props {
  form: Pick<CasoFormState, "v" | "set" | "errores" | "grave" | "siuceAbierto" | "setSiuceAbierto">
  /** Falso donde el endpoint no recibe el número (abrir un caso desde un plan). */
  conNumero?: boolean
}

export function SeccionSiuce({ form, conNumero = true }: Props) {
  const { v, set, errores, grave, siuceAbierto, setSiuceAbierto } = form
  return (
    <SeccionPlegable
      encuadrada
      titulo="Datos para el SIUCE"
      subtitulo="Siguen el formulario del SIUCE · obligatorios en Tipo II y III"
      abierta={siuceAbierto}
      onAbiertaChange={setSiuceAbierto}
      contentClassName="flex flex-col gap-4 px-4 pt-5 pb-5"
    >
      <DatosSiuceFields
        idPrefix="caso-siuce"
        value={v.siuce}
        onChange={(siuce) => set({ siuce })}
        required={grave}
        errores={errores}
      />
      {conNumero && (
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.numeroSiuce) || undefined}>
          <FieldLabel htmlFor="caso-numero-siuce">Número del caso en el SIUCE</FieldLabel>
          <Input
            id="caso-numero-siuce"
            maxLength={MAX_NUMERO_SIUCE}
            value={v.numeroSiuce}
            aria-invalid={Boolean(errores.numeroSiuce) || undefined}
            onChange={(e) => set({ numeroSiuce: e.target.value })}
          />
          {errores.numeroSiuce && <FieldError>{errores.numeroSiuce}</FieldError>}
        </Field>
      )}
      <SoportesUpload
        label={v.soporteExistente ? "Reemplazar el soporte" : "Soporte"}
        archivos={v.soporte}
        onChange={(soporte) => set({ soporte })}
        max={1}
      />
    </SeccionPlegable>
  )
}
