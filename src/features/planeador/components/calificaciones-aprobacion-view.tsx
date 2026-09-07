import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { MagnifyingGlassIcon } from "@/components/ui/icons"

import { useCalificacionesQuery } from "@/features/planeador/api/query/use-calificaciones-query"
import type { Actividad } from "@/features/planeador/api/types/actividad"

interface CalificacionesAprobacionViewProps {
  actividad: Actividad
}

/**
 * Vista de aprobación de calificaciones: el docente selecciona (con
 * checkbox) a qué estudiantes del grupo les aprueba la calificación
 * asociada al instrumento de la actividad, y elige el `Diseño` y la
 * `Modalidad` que se aplican al instrumento.
 *
 * Es la contraparte "bulk" de la vista `CalificacionesView` (que carga
 * nota por criterio): acá no se edita criterio por criterio, sino que
 * se aprueba o no el resultado entero de cada estudiante. Las dos
 * vistas se acceden desde botones distintos del header —el chulito
 * "Marcar" abre `CalificacionesView`; el clipboard-check "Aprobar"
 * abre esta.
 *
 * La barra inferior con el aviso "Se detectaron cambios" y el botón
 * `Guardar` aparece apenas se toca cualquier checkbox o select —
 * coherente con la convención del resto del form.
 */
export function CalificacionesAprobacionView({
  actividad,
}: CalificacionesAprobacionViewProps) {
  const { data: calificaciones = [], isPending, isError, refetch } =
    useCalificacionesQuery(actividad.id)

  // Set de ids aprobados + diseño/modalidad. Se inicializan con
  // todos seleccionados para que el docente "desmarque" a los que
  // rechaza, no al revés — más rápido en la mayoría de los casos.
  const [aprobados, setAprobados] = useState<Set<number>>(() => {
    if (calificaciones.length === 0) return new Set()
    return new Set(calificaciones.map((c) => c.id))
  })
  // Se re-sincroniza cuando llegan las calificaciones y todavía no
  // se tocó nada (caso "todo aprobado" → marcar todos por default).
  const [inicializado, setInicializado] = useState(false)
  if (!inicializado && calificaciones.length > 0) {
    setAprobados(new Set(calificaciones.map((c) => c.id)))
    setInicializado(true)
  }

  const [diseno, setDiseno] = useState("excelente")
  const [modalidad, setModalidad] = useState("presencial")
  const [filtro, setFiltro] = useState("")
  const [dirty, setDirty] = useState(false)

  const filtrados = useMemo(() => {
    const term = filtro.trim().toLowerCase()
    if (!term) return calificaciones
    return calificaciones.filter((c) =>
      `${c.nombres} ${c.apellidos}`.toLowerCase().includes(term),
    )
  }, [calificaciones, filtro])

  const toggle = (id: number) => {
    setDirty(true)
    setAprobados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (isPending) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
        <Spinner /> Cargando estudiantes…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="text-red text-sm">
          Ocurrió un error al cargar los estudiantes.
        </p>
        <Button
          variant="outline"
          color="neutral"
          size="sm"
          onClick={() => refetch()}
        >
          Reintentar
        </Button>
      </div>
    )
  }

  if (calificaciones.length === 0) {
    return (
      <div className="text-muted-foreground px-6 py-12 text-center text-sm">
        Esta actividad todavía no tiene estudiantes asignados.
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <h4 className="text-base font-semibold">
        Instrumento: {actividad.instrumento}
      </h4>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field variant="outlined">
          <FieldLabel>Diseño</FieldLabel>
          <Select
            value={diseno}
            onValueChange={(value) => {
              setDirty(true)
              setDiseno(value ?? "")
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excelente">Excelente</SelectItem>
              <SelectItem value="bueno">Bueno</SelectItem>
              <SelectItem value="aceptable">Aceptable</SelectItem>
              <SelectItem value="bajo">Bajo</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field variant="outlined">
          <FieldLabel>Modalidad</FieldLabel>
          <Select
            value={modalidad}
            onValueChange={(value) => {
              setDirty(true)
              setModalidad(value ?? "")
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
              <SelectItem value="mixta">Mixta</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field variant="outlined">
        <FieldLabel>Apellidos y nombres</FieldLabel>
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

      {/* Lista de estudiantes con checkbox. Mismo rounded border que la
          tabla de `CalificacionesView`, pero con una sola columna
          centrada. `divide-border` separa las filas. */}
      <ul className="border-input flex-1 overflow-y-auto rounded-md border">
        {filtrados.map((estudiante) => {
          const id = estudiante.id
          const checked = aprobados.has(id)
          return (
            <li
              key={id}
              className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggle(id)}
                aria-label={`Aprobar a ${estudiante.nombres} ${estudiante.apellidos}`}
              />
              <span className="font-medium uppercase">
                {estudiante.nombres} {estudiante.apellidos}
              </span>
            </li>
          )
        })}
      </ul>

      {/* Footer de cambios: aparece solo si huboDirty. Mismo patrón que
          los demás footers del form (mensaje + Guardar a la derecha). */}
      {dirty && (
        <div className="flex items-center justify-between rounded-md border bg-card px-4 py-3">
          <p className="text-sm">
            Se detectaron cambios. Guarda para conservar la información.
          </p>
          <Button
            variant="fill"
            color="primary"
            size="sm"
            onClick={() => setDirty(false)}
          >
            Guardar
          </Button>
        </div>
      )}
    </div>
  )
}
