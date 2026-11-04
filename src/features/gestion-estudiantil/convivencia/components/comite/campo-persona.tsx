import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import type { DatoCargo } from "@/features/gestion-estudiantil/convivencia/utils/comite"
import { ComboEstudianteComite, ComboFuncionarioComite } from "@/features/gestion-estudiantil/convivencia/components/comite/combos-persona"

export interface PersonaValor {
  fk_funcionario: number | null
  fk_matricula: number | null
  nombre: string
}

interface CampoPersonaProps {
  id: string
  dato: DatoCargo | null
  periodo: number | null
  valor: PersonaValor
  onChange: (valor: PersonaValor) => void
  disabled?: boolean
  error?: string
}

/** El campo que identifica a la persona del cargo depende del dato que ese cargo pide (Funcionario, Estudiante o Nombre). */
export function CampoPersona({ id, dato, periodo, valor, onChange, disabled, error }: CampoPersonaProps) {
  if (dato === "FUNCIONARIO")
    return (
      <ComboFuncionarioComite
        id={id}
        label="Funcionario"
        required
        periodo={periodo}
        disabled={disabled}
        error={error}
        value={valor.fk_funcionario != null ? String(valor.fk_funcionario) : ""}
        nombre={valor.nombre}
        onChange={(pk, nombre) => onChange({ fk_funcionario: pk, fk_matricula: null, nombre })}
      />
    )
  if (dato === "ESTUDIANTE")
    return (
      <ComboEstudianteComite
        id={id}
        label="Estudiante"
        required
        periodo={periodo}
        disabled={disabled}
        error={error}
        value={valor.fk_matricula != null ? String(valor.fk_matricula) : ""}
        nombre={valor.nombre}
        onChange={(pk, nombre) => onChange({ fk_funcionario: null, fk_matricula: pk, nombre })}
      />
    )
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>Nombre*</FieldLabel>
      <Input
        id={id}
        maxLength={150}
        disabled={disabled || dato == null}
        value={valor.nombre}
        aria-invalid={Boolean(error) || undefined}
        onChange={(e) => onChange({ fk_funcionario: null, fk_matricula: null, nombre: e.target.value })}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}
