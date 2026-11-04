import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"
import { DatosSiuceFields } from "@/features/gestion-estudiantil/convivencia/components/datos-siuce-fields"
import { SoportesUpload } from "@/features/gestion-estudiantil/convivencia/components/soportes-upload"
import type { CasoFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-caso-form"

/** Bloque plegable «Datos para el SIUCE» con el soporte del caso. */
export function SeccionSiuce({ form }: { form: CasoFormState }) {
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
      <SoportesUpload
        label={v.soporteExistente ? "Reemplazar el soporte" : "Soporte"}
        archivos={v.soporte}
        onChange={(soporte) => set({ soporte })}
        max={1}
      />
    </SeccionPlegable>
  )
}
