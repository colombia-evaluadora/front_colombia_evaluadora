import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { SiNo } from "@/features/gestion-estudiantil/convivencia/components/si-no"
import type { DatosSiuce } from "@/features/gestion-estudiantil/convivencia/api/form-types"
import { useSecuelasHabilitadas, type ErroresSiuce } from "@/features/gestion-estudiantil/convivencia/api/validaciones"

interface DatosSiuceFieldsProps {
  idPrefix: string
  value: DatosSiuce
  onChange: (value: DatosSiuce) => void
  required: boolean
  errores: ErroresSiuce
  /** Cambiar tipo no toca el Evento generador. */
  conEvento?: boolean
}

/** Campos que siguen el formulario del SIUCE: Tipo de daño, agresión, evento, repetitiva y secuelas. */
export function DatosSiuceFields({ idPrefix, value: v, onChange, required, errores, conEvento = true }: DatosSiuceFieldsProps) {
  const danos = useCatalogo("TIPO_DANO")
  const agresiones = useCatalogo("TIPO_AGRESION")
  const eventos = useCatalogo("EVENTO_GENERADOR")
  const secuelasHabilitadas = useSecuelasHabilitadas(v)
  const req = required ? "*" : ""

  return (
    <div className="flex flex-col gap-4">
      <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.tiposDano) || undefined}>
        <FieldLabel id={`${idPrefix}-dano`}>Tipo de daño{req}</FieldLabel>
        <div role="group" aria-labelledby={`${idPrefix}-dano`} className="flex min-h-10 flex-wrap items-center gap-x-6 gap-y-2 px-3 pt-3">
          {danos.map((d) => (
            <label key={d.value} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={v.tiposDano.includes(d.value)}
                onCheckedChange={(c) =>
                  onChange({
                    ...v,
                    tiposDano: c ? [...v.tiposDano, d.value] : v.tiposDano.filter((x) => x !== d.value),
                  })
                }
              />
              {d.label}
            </label>
          ))}
        </div>
        {errores.tiposDano && <FieldError>{errores.tiposDano}</FieldError>}
      </Field>
      <div className={`grid grid-cols-1 items-start gap-3 ${conEvento ? "sm:grid-cols-2" : ""}`}>
        <ComboOpciones
          id={`${idPrefix}-agresion`}
          label="Tipo de agresión"
          required={required}
          size="default"
          todos={false}
          value={v.agresion}
          options={agresiones}
          error={errores.agresion}
          onChange={(agresion) => onChange({ ...v, agresion })}
        />
        {conEvento && (
          <ComboOpciones
            id={`${idPrefix}-evento`}
            label="Evento generador"
            size="default"
            todos="Ninguno"
            value={v.evento}
            options={eventos}
            onChange={(evento) => onChange({ ...v, evento })}
          />
        )}
      </div>
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        <SiNo
          id={`${idPrefix}-repetitiva`}
          label="Situación repetitiva"
          required={required}
          value={v.repetitiva}
          error={errores.repetitiva}
          onChange={(repetitiva) => onChange({ ...v, repetitiva })}
        />
        <SiNo
          id={`${idPrefix}-secuelas`}
          label="Secuelas físicas"
          required={secuelasHabilitadas && required}
          disabled={!secuelasHabilitadas}
          value={secuelasHabilitadas ? v.secuelas : null}
          error={errores.secuelas}
          onChange={(secuelas) => onChange({ ...v, secuelas })}
        />
      </div>
      {!secuelasHabilitadas && (
        <p className="text-xs text-muted-foreground">Secuelas físicas se habilita con Daño físico y Agresión física.</p>
      )}
    </div>
  )
}
