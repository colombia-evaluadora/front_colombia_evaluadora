import { useEffect, useMemo, useState } from "react"

import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useEstudiantesProcesoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-proceso-apertura-query"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"

const ESPERA_MS = 300

interface Props {
  id: string
  /** pk de la matrícula elegida como texto; "" = sin elegir. */
  value: string
  /** Nombre ya conocido del estudiante, para mostrarlo sin esperar a la búsqueda. */
  nombre: string
  error?: string
  /** Llega fijo (compromiso desde una citación): se muestra en solo lectura. */
  soloLectura?: boolean
  onChange: (matricula: string, nombre: string) => void
}

/**
 * Estudiante (matrícula Cursando del alcance de quien actúa): búsqueda por nombre o documento contra
 * el mismo endpoint de opciones que usa «Abrir proceso» de Convivencia (el backend exige 2 a 100 letras).
 */
export function CampoEstudiante({ id, value, nombre, error, soloLectura, onChange }: Props) {
  const [texto, setTexto] = useState("")
  const [busqueda, setBusqueda] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), ESPERA_MS)
    return () => clearTimeout(t)
  }, [texto])
  const buscados = useEstudiantesProcesoQuery(soloLectura ? "" : busqueda)

  const opciones = useMemo(() => {
    const lista = (buscados.data ?? []).map((e) => ({
      value: String(e.fk_tmatricula),
      label: [e.nombre, e.documento, e.grado_grupo].filter(Boolean).join(" · "),
    }))
    // El elegido sigue visible aunque la búsqueda actual ya no lo traiga.
    if (value && !lista.some((o) => o.value === value)) lista.unshift({ value, label: nombre || `Matrícula ${value}` })
    return lista
  }, [buscados.data, value, nombre])

  if (soloLectura) {
    return (
      <Field orientation="vertical" variant="outlined" className="gap-2">
        <FieldLabel htmlFor={id}>Estudiante</FieldLabel>
        <Input id={id} readOnly value={nombre || (value ? `Matrícula ${value}` : "")} />
      </Field>
    )
  }

  return (
    <ComboOpciones
      id={id}
      label="Estudiante"
      required
      size="default"
      todos={false}
      placeholder="Buscar por nombre o documento"
      value={value}
      options={opciones}
      error={error}
      onInputChange={(t) => t !== nombre && setTexto(t)}
      onChange={(v) => onChange(v, opciones.find((o) => o.value === v)?.label.split(" · ")[0] ?? "")}
    />
  )
}
