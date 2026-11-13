import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"

import { SubjectsMultiSelect } from "@/features/establishment/academic-period/components/fields/subjects-multi-select"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import type { FormularioCaracterizacion } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizacion-form"

/** Estrategias de permanencia que el estudiante requeriría, las reciba o no (no crea beneficiario). */
export function SeccionEstrategias({ f }: { f: FormularioCaracterizacion }) {
  const opciones = (f.listas.TIPO_ESTRATEGIA_PERMANENCIA ?? []).map((o) => ({ id: o.value, label: o.label }))
  return (
    <SeccionPlegable encuadrada comoSeccion titulo="Estrategias que requiere el estudiante" contentClassName="px-4 py-4">
      <Field orientation="vertical" variant="outlined" className="gap-2">
        <FieldLabel htmlFor="estrategias-requeridas">Estrategias de permanencia</FieldLabel>
        <SubjectsMultiSelect
          id="estrategias-requeridas"
          options={opciones}
          value={f.v.estrategias}
          disabled={f.lectura}
          placeholder="Seleccione"
          emptyMessage="No hay tipos de estrategia de permanencia."
          onChange={(estrategias) => f.set({ estrategias })}
        />
        <FieldDescription>Las que necesitaría para permanecer, las reciba o no.</FieldDescription>
      </Field>
    </SeccionPlegable>
  )
}
