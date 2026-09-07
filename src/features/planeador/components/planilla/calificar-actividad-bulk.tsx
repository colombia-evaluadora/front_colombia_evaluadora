import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ArrowLeftIcon, MagnifyingGlassIcon } from "@/components/ui/icons"

import type { Actividad } from "@/features/planeador/api/types/actividad"
import type { NotaCriterio } from "@/features/planeador/api/types/calificacion"
import { InstrumentoGradingFields } from "@/features/planeador/components/planilla/instrumento-grading-fields"

interface FilaEstudiante {
  id: number
  nombres: string
  apellidos: string
}

interface CalificarActividadBulkProps {
  actividad: Actividad
  estudiantes: FilaEstudiante[]
  onVolver: () => void
  /** Aplica `nota` a cada estudiante de `estudianteIds` — todos con el
   *  mismo valor, de una sola vez. */
  onGuardar: (estudianteIds: number[], nota: NotaCriterio[]) => void
}

/**
 * Pantalla completa de calificación en bulk para UNA actividad: el mismo
 * formulario "volátil" de `InstrumentoGradingFields`, cargado una sola vez
 * arriba, más una lista con checkbox de los estudiantes a los que aplicarle
 * ese mismo valor. Reemplaza el body de `PlaneadorPlanillaPage` mientras
 * está abierta — se llega acá desde el botón del header de una columna de
 * la grilla y se vuelve con la flecha.
 *
 * Mismo patrón de checklist que `CalificacionesAprobacionView` (arranca con
 * todos tildados — el docente destilda a los que no aplica, que suele ser
 * el caso menos común) y mismo footer "Se detectaron cambios" + Guardar.
 */
export function CalificarActividadBulk({
  actividad,
  estudiantes,
  onVolver,
  onGuardar,
}: CalificarActividadBulkProps) {
  const [nota, setNota] = useState<NotaCriterio[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<number>>(
    () => new Set(estudiantes.map((e) => e.id)),
  )
  const [filtro, setFiltro] = useState("")
  const [dirty, setDirty] = useState(false)

  const filtrados = useMemo(() => {
    const term = filtro.trim().toLowerCase()
    if (!term) return estudiantes
    return estudiantes.filter((e) =>
      `${e.nombres} ${e.apellidos}`.toLowerCase().includes(term),
    )
  }, [estudiantes, filtro])

  function toggle(id: number) {
    setDirty(true)
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function guardar() {
    onGuardar([...seleccionados], nota)
    onVolver()
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-md border bg-card p-3">
      <div className="flex items-center gap-2 border-b pb-3">
        <Button
          variant="ghost"
          color="neutral"
          size="icon-sm"
          onClick={onVolver}
          aria-label="Volver a la planilla"
        >
          <ArrowLeftIcon className="size-6" />
        </Button>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold">Calificaciones: {actividad.nombre}</h2>
          <p className="text-muted-foreground text-xs">Instrumento: {actividad.instrumento}</p>
        </div>
      </div>

      <InstrumentoGradingFields
        actividad={actividad}
        value={nota}
        onChange={(next) => {
          setDirty(true)
          setNota(next)
        }}
      />

      <Field variant="outlined">
        <FieldLabel>Estudiantes</FieldLabel>
        <div className="relative">
          <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar por"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="pl-9"
          />
        </div>
      </Field>

      <ul className="border-input flex-1 overflow-y-auto rounded-md border">
        {filtrados.map((estudiante) => {
          const checked = seleccionados.has(estudiante.id)
          return (
            <li
              key={estudiante.id}
              className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggle(estudiante.id)}
                aria-label={`Aplicar a ${estudiante.nombres} ${estudiante.apellidos}`}
              />
              <span className="font-medium uppercase">
                {estudiante.nombres} {estudiante.apellidos}
              </span>
            </li>
          )
        })}
      </ul>

      {dirty && (
        <div className="flex items-center justify-between rounded-md border bg-card px-4 py-3">
          <p className="text-sm">Se detectaron cambios. Guarda para conservar la información.</p>
          <Button
            variant="fill"
            color="primary"
            size="sm"
            disabled={seleccionados.size === 0 || nota.length === 0}
            onClick={guardar}
          >
            Guardar
          </Button>
        </div>
      )}
    </div>
  )
}
