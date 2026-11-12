import { useMemo } from "react"

import { Button } from "@/components/ui/button"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"

import type {
  OpcionEstudianteObservacion,
  OpcionGrupoObservacion,
} from "@/features/gestion-estudiantil/observaciones/api/types"

interface Props {
  id: string
  /** Grupos elegidos, para «Seleccionar todos» de cada uno. */
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
 * documento y «Seleccionar todos» por grupo (G.7.NUE.1).
 */
export function CampoEstudiantes({ id, grupos, estudiantes, cargando, value, error, onChange }: Props) {
  const nombres = useMemo(() => new Map(estudiantes.map((e) => [e.fk_tmatricula, e.estudiante_nombre])), [estudiantes])
  const variosGrupos = grupos.length > 1
  const sinGrupos = grupos.length === 0
  const vacio = sinGrupos ? "Elija primero el Grado/Grupo" : cargando ? "Cargando estudiantes…" : "Buscar por nombre o documento"

  function alternarGrupo(grupo: number) {
    const delGrupo = estudiantes.filter((e) => e.fk_tgrupo === grupo).map((e) => e.fk_tmatricula)
    const todos = delGrupo.length > 0 && delGrupo.every((m) => value.includes(m))
    onChange(todos ? value.filter((m) => !delGrupo.includes(m)) : [...new Set([...value, ...delGrupo])])
  }

  return (
    <div className="flex flex-col gap-1">
      <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
        <FieldLabel htmlFor={id}>Estudiantes*</FieldLabel>
        <ComboboxField<number, true> multiple disabled={sinGrupos} value={value} onValueChange={(v) => onChange(v ?? [])}>
          <ComboboxFieldTrigger id={id} className="w-full" aria-invalid={Boolean(error) || undefined}>
            <ComboboxFieldValue placeholder={vacio}>
              {(matriculas: number[]) =>
                matriculas.length === 0
                  ? vacio
                  : `${matriculas.length} · ${matriculas.map((m) => nombres.get(m) ?? `Matrícula ${m}`).join(", ")}`
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
      {!sinGrupos && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {grupos.map((g) => {
            const delGrupo = estudiantes.filter((e) => e.fk_tgrupo === g.fk_tgrupo)
            const todos = delGrupo.length > 0 && delGrupo.every((e) => value.includes(e.fk_tmatricula))
            return (
              <Button
                key={g.fk_tgrupo}
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                disabled={delGrupo.length === 0}
                onClick={() => alternarGrupo(g.fk_tgrupo)}
              >
                {todos ? "Quitar todos" : "Seleccionar todos"}
                {variosGrupos ? ` · ${g.grado_grupo}` : ""}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
