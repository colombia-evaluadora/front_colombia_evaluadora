import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import type { CasoFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-caso-form"

/** Tipo de situación, manifestación y lugar. */
export function SeccionDatosCaso({ form }: { form: CasoFormState }) {
  const { v, set, errores, editar, tipos, cambiarTipo } = form
  const manifestaciones = useCatalogo("MANIFESTACION_SITUACION")
  const lugares = useCatalogo("LUGAR_SITUACION")
  return (
    <>
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
        <ComboOpciones
          id="caso-tipo"
          label="Tipo de situación"
          required
          size="default"
          todos={false}
          disabled={editar}
          value={v.tipo}
          options={tipos}
          error={errores.tipo}
          onChange={cambiarTipo}
        />
        <ComboOpciones
          id="caso-manifestacion"
          label="Manifestación"
          required
          size="default"
          todos={false}
          value={v.manifestacion}
          options={manifestaciones}
          error={errores.manifestacion}
          onChange={(manifestacion) => set({ manifestacion })}
        />
        <ComboOpciones
          id="caso-lugar"
          label="Lugar"
          required
          size="default"
          todos={false}
          value={v.lugar}
          options={lugares}
          error={errores.lugar}
          onChange={(lugar) => set({ lugar })}
        />
      </div>
      {editar && <p className="-mt-3 text-xs text-muted-foreground">El tipo se cambia con la acción Cambiar tipo.</p>}
    </>
  )
}
