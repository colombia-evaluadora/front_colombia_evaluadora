import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { BotonQuitar } from "@/features/gestion-estudiantil/commons/components/boton-quitar"
import type {
  CargoFila,
  ErroresCargo,
} from "@/features/gestion-estudiantil/convivencia/utils/proceso-form"

interface Props {
  fila: CargoFila
  numero: number
  codigos: Opcion[]
  clasificaciones: Opcion[]
  errores?: ErroresCargo
  puedeQuitar: boolean
  onChange: (patch: Partial<CargoFila>) => void
  onQuitar: () => void
}

/** Un cargo: código, clasificación de la falta, norma del Manual y descripción de la conducta. */
export function FilaCargo({
  fila: c,
  numero,
  codigos,
  clasificaciones,
  errores,
  puedeQuitar,
  onChange,
  onQuitar,
}: Props) {
  const id = `cargo-${c.key}`
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="text-sm font-semibold">Cargo {numero}</p>
        {/* Código, clasificación y norma en una fila. */}
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
          <ComboOpciones
            id={`${id}-codigo`}
            label="Código"
            required
            size="default"
            todos={false}
            value={c.codigo}
            options={codigos}
            error={errores?.codigo}
            onChange={(codigo) => onChange({ codigo })}
          />
          <ComboOpciones
            id={`${id}-clasificacion`}
            label="Clasificación de la falta"
            required
            size="default"
            todos={false}
            value={c.clasificacion}
            options={clasificaciones}
            error={errores?.clasificacion}
            onChange={(clasificacion) => onChange({ clasificacion })}
          />
          <Field
            orientation="vertical"
            variant="outlined"
            className="gap-2"
            data-invalid={Boolean(errores?.norma) || undefined}
          >
            <FieldLabel htmlFor={`${id}-norma`}>Norma del manual de convivencia*</FieldLabel>
            <Input
              id={`${id}-norma`}
              maxLength={200}
              placeholder="Artículo y numeral que la conducta infringe"
              value={c.norma}
              aria-invalid={Boolean(errores?.norma) || undefined}
              onChange={(e) => onChange({ norma: e.target.value })}
            />
            {errores?.norma && <FieldError>{errores.norma}</FieldError>}
          </Field>
        </div>
        <TextoLargo
          id={`${id}-descripcion`}
          label="Descripción de la conducta"
          required
          rows={4}
          max={2000}
          placeholder="Hechos concretos que se le atribuyen: qué, cuándo y dónde. No nombre a otros estudiantes."
          value={c.descripcion}
          error={errores?.descripcion}
          onChange={(descripcion) => onChange({ descripcion })}
        />
      </div>
      {puedeQuitar && <BotonQuitar label={`Quitar el cargo ${numero}`} onClick={onQuitar} />}
    </div>
  )
}
