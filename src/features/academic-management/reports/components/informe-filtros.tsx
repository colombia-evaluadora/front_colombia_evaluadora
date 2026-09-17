import * as React from "react"

import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  useAniosInformeQuery,
  useJornadasInformeQuery,
  useSedesInformeQuery,
} from "@/features/academic-management/reports/api/query/use-cascada-query"

export interface FiltrosInforme {
  sedeId: number | null
  anio: number | null
  jornadaId: number | null
}

interface InformeFiltrosProps {
  filtros: FiltrosInforme
  onChange: (filtros: FiltrosInforme) => void
}

export function InformeFiltros({ filtros, onChange }: InformeFiltrosProps) {
  const sedes = useSedesInformeQuery()
  const anios = useAniosInformeQuery(filtros.sedeId)
  const jornadas = useJornadasInformeQuery(filtros.sedeId, filtros.anio)

  const sedeItems = React.useMemo(
    () => Object.fromEntries((sedes.data ?? []).map((sede) => [String(sede.id), sede.nombre])),
    [sedes.data],
  )
  const anioItems = React.useMemo(
    () => Object.fromEntries((anios.data ?? []).map((a) => [String(a.anio), String(a.anio)])),
    [anios.data],
  )
  const jornadaItems = React.useMemo(
    () =>
      Object.fromEntries((jornadas.data ?? []).map((j) => [String(j.id), j.nombre])),
    [jornadas.data],
  )

  // Una sola opción no es una elección: obliga a un clic que solo puede
  // terminar en ese valor. Nivel 3 alcanza una sede y una jornada.
  React.useEffect(() => {
    const unica = sedes.data?.length === 1 ? sedes.data[0] : undefined
    if (unica && filtros.sedeId == null) {
      onChange({ sedeId: unica.id, anio: null, jornadaId: null })
    }
  }, [sedes.data, filtros.sedeId, onChange])

  React.useEffect(() => {
    if (filtros.anio != null || !anios.data?.length) return
    const actual = anios.data.find((a) => a.esActual) ?? anios.data[0]
    onChange({ ...filtros, anio: actual.anio, jornadaId: null })
  }, [anios.data, filtros, onChange])

  React.useEffect(() => {
    if (filtros.jornadaId != null || !jornadas.data?.length) return
    const enCurso = jornadas.data.find((j) => j.enCurso)
    const elegida = enCurso ?? (jornadas.data.length === 1 ? jornadas.data[0] : undefined)
    if (elegida) onChange({ ...filtros, jornadaId: elegida.id })
  }, [jornadas.data, filtros, onChange])

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field variant="outlined">
        <FieldLabel htmlFor="informe-sede">Sede</FieldLabel>
        <Select
          items={sedeItems}
          value={filtros.sedeId != null ? String(filtros.sedeId) : null}
          onValueChange={(value) =>
            value && onChange({ sedeId: Number(value), anio: null, jornadaId: null })
          }
        >
          <SelectTrigger id="informe-sede" disabled={sedes.isPending}>
            <SelectValue placeholder="Seleccione una sede" />
          </SelectTrigger>
          <SelectContent>
            {(sedes.data ?? []).map((sede) => (
              <SelectItem key={sede.id} value={String(sede.id)}>
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
            value && onChange({ ...filtros, anio: Number(value), jornadaId: null })
          }
        >
          <SelectTrigger id="informe-anio" disabled={filtros.sedeId == null || anios.isPending}>
            <SelectValue placeholder="Seleccione un año" />
          </SelectTrigger>
          <SelectContent>
            {(anios.data ?? []).map((a) => (
              <SelectItem key={a.anio} value={String(a.anio)}>
                {a.anio}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field variant="outlined">
        <FieldLabel htmlFor="informe-jornada">Jornada</FieldLabel>
        <Select
          items={jornadaItems}
          value={filtros.jornadaId != null ? String(filtros.jornadaId) : null}
          onValueChange={(value) => value && onChange({ ...filtros, jornadaId: Number(value) })}
        >
          <SelectTrigger
            id="informe-jornada"
            disabled={filtros.anio == null || jornadas.isPending}
          >
            <SelectValue placeholder="Seleccione una jornada" />
          </SelectTrigger>
          <SelectContent>
            {(jornadas.data ?? []).map((jornada) => (
              <SelectItem key={jornada.periodoAcademicoId} value={String(jornada.id)}>
                {jornada.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}
