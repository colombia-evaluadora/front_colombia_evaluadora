import { useMemo } from "react"

import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { ChipsSeleccion } from "@/components/chips-seleccion"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"

import type {
  OpcionEstudianteObservacion,
  OpcionGrupoObservacion,
} from "@/features/gestion-estudiantil/observaciones/api/types"

interface Props {
  id: string
  /** Grupos elegidos: sin grupo el campo se deshabilita; con varios, cada opción dice su grupo. */
  grupos: OpcionGrupoObservacion[]
  /** Matrículas Cursando de esos grupos. */
  estudiantes: OpcionEstudianteObservacion[]
  cargando: boolean
  value: number[]
  error?: string
  onChange: (matriculas: number[]) => void
}

/**
 * Estudiantes* (multiselección): matrículas Cursando de los grupos elegidos, con búsqueda por nombre o
 * documento (G.7.NUE.1). Sin «Seleccionar todos» por grupo (decisión del equipo, aunque el md lo
 * pide): para todo el grupo ya está «Dirigida a › Todo el grupo», que además guarda un solo registro.
 */
export function CampoEstudiantes({ id, grupos, estudiantes, cargando, value, error, onChange }: Props) {
  const nombres = useMemo(() => new Map(estudiantes.map((e) => [e.fk_tmatricula, e.estudiante_nombre])), [estudiantes])
  const variosGrupos = grupos.length > 1
  const sinGrupos = grupos.length === 0
  const vacio = sinGrupos ? "Elija primero el Grado/Grupo" : cargando ? "Cargando estudiantes…" : "Buscar por nombre o documento"

  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>
        Estudiantes<span data-required-mark="">*</span>
      </FieldLabel>
      <ComboboxField<number, true> multiple disabled={sinGrupos} value={value} onValueChange={(v) => onChange(v ?? [])}>
        <ComboboxFieldTrigger id={id} className="w-full" aria-invalid={Boolean(error) || undefined}>
          <ComboboxFieldValue placeholder={vacio}>
            {(matriculas: number[]) =>
              matriculas.length === 0
                ? vacio
                : (
                    <ChipsSeleccion
                      elementos={matriculas.map((m) => ({ id: m, label: nombres.get(m) ?? `Matrícula ${m}` }))}
                      deshabilitado={sinGrupos}
                      onQuitar={(m) => onChange(matriculas.filter((x) => x !== m))}
                    />
                  )
            }
          </ComboboxFieldValue>
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {estudiantes.map((e) => {
            const texto = [e.estudiante_nombre, e.estudiante_documento, variosGrupos ? e.grado_grupo : null]
              .filter(Boolean)
              .join(" · ")
            return (
              <ComboboxFieldItem key={e.fk_tmatricula} value={e.fk_tmatricula} title={texto}>
                {texto}
              </ComboboxFieldItem>
            )
          })}
        </ComboboxFieldContent>
      </ComboboxField>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        <FieldDescription>Matrículas Cursando de los grupos elegidos.</FieldDescription>
      )}
    </Field>
  )
}
