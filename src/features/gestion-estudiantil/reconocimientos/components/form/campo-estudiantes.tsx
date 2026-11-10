import { useEffect, useMemo, useRef, useState } from "react"

import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useOpcionesEstudiantesQuery } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-opciones-reconocimiento-query"

const ESPERA_MS = 300

interface Props {
  id: string
  establecimiento: number | null
  /** Matrículas elegidas. */
  value: number[]
  error?: string
  onChange: (matriculas: number[]) => void
}

/**
 * Estudiantes* (multiselección): búsqueda por nombre o documento contra `opciones/estudiantes`. Los ya
 * elegidos siguen en la lista aunque la búsqueda actual ya no los traiga.
 */
export function CampoEstudiantes({ id, establecimiento, value, error, onChange }: Props) {
  const [texto, setTexto] = useState("")
  const [busqueda, setBusqueda] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), ESPERA_MS)
    return () => clearTimeout(t)
  }, [texto])

  const { data } = useOpcionesEstudiantesQuery({ establecimiento, search: busqueda })
  const conocidos = useRef(new Map<number, string>())
  const opciones = useMemo(() => {
    for (const e of data ?? []) {
      conocidos.current.set(e.fk_tmatricula, [e.estudiante_nombre, e.grado_grupo].filter(Boolean).join(" · "))
    }
    const lista = (data ?? []).map((e) => ({ value: e.fk_tmatricula, label: conocidos.current.get(e.fk_tmatricula)! }))
    for (const m of value) {
      if (!lista.some((o) => o.value === m)) lista.unshift({ value: m, label: conocidos.current.get(m) ?? `Matrícula ${m}` })
    }
    return lista
  }, [data, value])

  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>Estudiantes*</FieldLabel>
      <ComboboxField<number, true>
        multiple
        value={value}
        onValueChange={(v) => onChange(v ?? [])}
        onInputValueChange={(t) => setTexto(t)}
      >
        <ComboboxFieldTrigger id={id} className="w-full" aria-invalid={Boolean(error) || undefined}>
          <ComboboxFieldValue placeholder="Buscar por nombre o documento">
            {(matriculas: number[]) =>
              matriculas.length === 0
                ? "Buscar por nombre o documento"
                : `${matriculas.length} · ${matriculas.map((m) => (conocidos.current.get(m) ?? `Matrícula ${m}`).split(" · ")[0]).join(", ")}`
            }
          </ComboboxFieldValue>
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {opciones.map((o) => (
            <ComboboxFieldItem key={o.value} value={o.value} title={o.label}>
              {o.label}
            </ComboboxFieldItem>
          ))}
        </ComboboxFieldContent>
      </ComboboxField>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

/** Estudiante fijo (modificar y otorgar): solo lectura. */
export function EstudianteFijo({ id, nombre }: { id: string; nombre: string }) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={id}>Estudiante</FieldLabel>
      <Input id={id} readOnly value={nombre} />
    </Field>
  )
}
