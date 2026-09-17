import * as React from "react"

import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useSedesOpcionesQuery } from "@/features/academic-management/asistencia/api/query/use-sedes-opciones-query"
import { useJornadasQuery } from "@/features/establishment/academic-period/api/query/use-jornadas"

export interface FiltrosInforme {
  sedeId: number | null
  anio: number | null
  /** Nombre, no id: `PeriodoInforme.jornada` llega como texto. */
  jornada: string | null
}

const TODOS = "__todos__"
const ANIOS_ATRAS = 4

interface InformeFiltrosProps {
  filtros: FiltrosInforme
  onChange: (filtros: FiltrosInforme) => void
}

export function InformeFiltros({ filtros, onChange }: InformeFiltrosProps) {
  const sedes = useSedesOpcionesQuery()
  const jornadas = useJornadasQuery()

  const anios = React.useMemo(() => {
    const actual = new Date().getFullYear()
    return Array.from({ length: ANIOS_ATRAS + 1 }, (_, i) => actual - i)
  }, [])

  const sedeItems = React.useMemo(
    () => Object.fromEntries((sedes.data ?? []).map((sede) => [String(sede.pk_sede), sede.nombre])),
    [sedes.data],
  )
  const jornadaItems = React.useMemo(
    () => Object.fromEntries((jornadas.data ?? []).map((jornada) => [jornada.name, jornada.name])),
    [jornadas.data],
  )
  const anioItems = React.useMemo(
    () => Object.fromEntries(anios.map((anio) => [String(anio), String(anio)])),
    [anios],
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field variant="outlined">
        <FieldLabel htmlFor="informe-sede">Sede</FieldLabel>
        <Select
          items={sedeItems}
          value={filtros.sedeId != null ? String(filtros.sedeId) : null}
          onValueChange={(value) =>
            onChange({ ...filtros, sedeId: value && value !== TODOS ? Number(value) : null })
          }
        >
          <SelectTrigger id="informe-sede">
            <SelectValue placeholder="Seleccione una sede" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas las sedes</SelectItem>
            {(sedes.data ?? []).map((sede) => (
              <SelectItem key={sede.pk_sede} value={String(sede.pk_sede)}>
                {sede.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field variant="outlined">
        <FieldLabel htmlFor="informe-anio">Año</FieldLabel>
        <Select
          items={anioItems}
          value={filtros.anio != null ? String(filtros.anio) : null}
          onValueChange={(value) =>
            onChange({ ...filtros, anio: value && value !== TODOS ? Number(value) : null })
          }
        >
          <SelectTrigger id="informe-anio">
            <SelectValue placeholder="Seleccione un año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Año en curso</SelectItem>
            {anios.map((anio) => (
              <SelectItem key={anio} value={String(anio)}>
                {anio}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field variant="outlined">
        <FieldLabel htmlFor="informe-jornada">Jornada</FieldLabel>
        <Select
          items={jornadaItems}
          value={filtros.jornada}
          onValueChange={(value) =>
            onChange({ ...filtros, jornada: value && value !== TODOS ? value : null })
          }
        >
          <SelectTrigger id="informe-jornada">
            <SelectValue placeholder="Seleccione una jornada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas las jornadas</SelectItem>
            {(jornadas.data ?? []).map((jornada) => (
              <SelectItem key={jornada.id} value={jornada.name}>
                {jornada.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}
