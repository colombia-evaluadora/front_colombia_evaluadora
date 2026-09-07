import { useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQueries } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { DotsThreeIcon, InboxIcon, MagnifyingGlassIcon, PlusCircleIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import {
  FiltroPlanillaCascada,
  type FiltroPlanillaValue,
} from "@/features/planeador/components/forms/filtro-planilla-cascada"
import { useActividadesQuery } from "@/features/planeador/api/query/use-actividades-query"
import { calificacionesQueryOptions } from "@/features/planeador/api/query/use-calificaciones-query"
import { CalificarActividadBulk } from "@/features/planeador/components/planilla/calificar-actividad-bulk"
import { PlanillaGrid } from "@/features/planeador/components/planilla/planilla-grid"
import type { EstadoAsistencia, NotaCriterio } from "@/features/planeador/api/types/calificacion"

/** Opciones de "Ver por" de esta pantalla — a diferencia del listado del
 *  Planeador (`VIEW_OPTIONS`), acá no hay "Instrumento": la planilla siempre
 *  agrupa columnas por actividad o por unidad, nunca por instrumento.
 *  "Unidad" queda seleccionable pero sin implementar todavía — mismo
 *  criterio que `viewOption` en el listado principal del Planeador. */
const VER_POR_OPTIONS = [
  { value: "actividad", label: "Actividad" },
  { value: "unidad", label: "Unidad" },
] as const
type VerPorOption = (typeof VER_POR_OPTIONS)[number]["value"]

/** `actividadId:estudianteId` — clave de los overrides locales. */
function overrideKey(actividadId: number, estudianteId: number): string {
  return `${actividadId}:${estudianteId}`
}

/**
 * "Planilla de calificación": grilla de notas por estudiante, con una
 * columna por actividad del Grado/Grupo/Asignatura/Periodo elegidos en
 * "Filtro". Sin endpoint propio: las columnas salen de filtrar
 * `useActividadesQuery` client-side, y las notas de pedir las calificaciones
 * de cada actividad filtrada en paralelo con `useQueries`.
 *
 * Todas las ediciones (celda a celda o en bloque) viven en `overrides`,
 * estado local de esta página — no hay mutación/endpoint de escritura
 * todavía (mismo nivel que `CalificacionesAprobacionView`/el viejo
 * `InstrumentoPopover`): se pierden al recargar la página.
 */
export function PlaneadorPlanillaPage() {
  const [verPor, setVerPor] = useState<VerPorOption>("actividad")
  const [buscar, setBuscar] = useState("")
  const [filtro, setFiltro] = useState<FiltroPlanillaValue | null>(null)
  const [vista, setVista] = useState<{ tipo: "grid" } | { tipo: "bulk"; actividadId: number }>({
    tipo: "grid",
  })
  const [overrides, setOverrides] = useState<Map<string, NotaCriterio[]>>(new Map())

  // Recién con Grado, Grupo Y Asignatura elegidos hay contra qué buscar
  // actividades/unidades reales — antes de eso no tiene sentido mostrar una
  // grilla vacía intentando adivinar qué traer.
  const filtroCompleto = filtro != null

  const { data: todasLasActividades = [] } = useActividadesQuery()

  const actividadesFiltradas = useMemo(() => {
    if (!filtro) return []
    const term = buscar.trim().toLowerCase()
    return todasLasActividades.filter((actividad) => {
      if (actividad.grado !== filtro.gradoNombre) return false
      if (actividad.grupo !== filtro.grupoCodigo) return false
      if (actividad.asignatura !== filtro.asignaturaNombre) return false
      // Solapamiento de rangos `yyyy-MM-dd` — comparación lexicográfica
      // válida porque todas son ISO del mismo largo.
      if (actividad.fechaCierre < filtro.periodoEvaluacion.startDate) return false
      if (actividad.fechaInicio > filtro.periodoEvaluacion.endDate) return false
      if (!term) return true
      // "Ver por: Unidad" busca por el nombre de la unidad (agrupa por
      // eso); "Actividad" busca por el nombre de la actividad — mismo
      // criterio que el placeholder del buscador.
      const campo = verPor === "unidad" ? actividad.unidad.nombre : actividad.nombre
      return campo.toLowerCase().includes(term)
    })
  }, [todasLasActividades, filtro, verPor, buscar])

  const calificacionesQueries = useQueries({
    queries: actividadesFiltradas.map((actividad) => calificacionesQueryOptions(actividad.id)),
  })

  // Roster de estudiantes: unión por id de todas las actividades cargadas
  // (en el mock comparten el mismo roster por grado+grupo, así que en la
  // práctica coinciden).
  const estudiantes = useMemo(() => {
    const porId = new Map<number, { id: number; nombres: string; apellidos: string }>()
    for (const query of calificacionesQueries) {
      for (const estudiante of query.data ?? []) {
        if (!porId.has(estudiante.id)) {
          porId.set(estudiante.id, {
            id: estudiante.id,
            nombres: estudiante.nombres,
            apellidos: estudiante.apellidos,
          })
        }
      }
    }
    return [...porId.values()].sort((a, b) =>
      `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`),
    )
  }, [calificacionesQueries])

  // Notas por actividad, con los overrides locales ya aplicados encima de
  // lo que trajo el mock.
  const notasPorActividad = useMemo(() => {
    const map = new Map<number, Map<number, NotaCriterio[]>>()
    actividadesFiltradas.forEach((actividad, index) => {
      const porEstudiante = new Map<number, NotaCriterio[]>()
      for (const estudiante of calificacionesQueries[index]?.data ?? []) {
        const override = overrides.get(overrideKey(actividad.id, estudiante.id))
        porEstudiante.set(estudiante.id, override ?? estudiante.notas)
      }
      map.set(actividad.id, porEstudiante)
    })
    return map
  }, [actividadesFiltradas, calificacionesQueries, overrides])

  // Asistencia de cada estudiante en cada actividad — no tiene overrides
  // (esta pantalla no la edita, solo la lee): si faltó a la actividad, la
  // celda de esa nota se bloquea en vez de mostrar un valor editable.
  const asistenciaPorActividad = useMemo(() => {
    const map = new Map<number, Map<number, EstadoAsistencia>>()
    actividadesFiltradas.forEach((actividad, index) => {
      const porEstudiante = new Map<number, EstadoAsistencia>()
      for (const estudiante of calificacionesQueries[index]?.data ?? []) {
        porEstudiante.set(estudiante.id, estudiante.asistencia.estado)
      }
      map.set(actividad.id, porEstudiante)
    })
    return map
  }, [actividadesFiltradas, calificacionesQueries])

  function guardarCelda(actividadId: number, estudianteId: number, nota: NotaCriterio[]) {
    setOverrides((prev) => new Map(prev).set(overrideKey(actividadId, estudianteId), nota))
  }

  function guardarBulk(actividadId: number, estudianteIds: number[], nota: NotaCriterio[]) {
    setOverrides((prev) => {
      const next = new Map(prev)
      for (const estudianteId of estudianteIds) {
        next.set(overrideKey(actividadId, estudianteId), nota)
      }
      return next
    })
  }

  const actividadEnBulk =
    vista.tipo === "bulk"
      ? actividadesFiltradas.find((actividad) => actividad.id === vista.actividadId)
      : undefined
  const indexActividadEnBulk = actividadEnBulk
    ? actividadesFiltradas.indexOf(actividadEnBulk)
    : -1
  const estudiantesEnBulk = (calificacionesQueries[indexActividadEnBulk]?.data ?? []).map(
    (estudiante) => ({
      id: estudiante.id,
      nombres: estudiante.nombres,
      apellidos: estudiante.apellidos,
    }),
  )

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex gap-0">
              <Button
                color="primary"
                size="sm"
                variant="fill"
                aria-label="Nueva actividad"
                className="rounded-r-none border-r-0"
                render={<Link to={paths.app.planeadorActividadCrear.getHref()} />}
              >
                <PlusCircleIcon data-icon="inline-start" />
                Nueva actividad
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      color="primary"
                      size="sm"
                      variant="fill"
                      aria-label="Más opciones"
                      className="rounded-l-none"
                    />
                  }
                >
                  <DotsThreeIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>Exportar todo</DropdownMenuItem>
                  <DropdownMenuItem disabled>Importar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        >
          Planilla de calificación
        </TableScreenTitle>

        <TableScreenToolbar>
          <div className="grid flex-1 gap-4 sm:grid-cols-3">
            <Field variant="outlined">
              <FieldLabel>Ver por</FieldLabel>
              <Select value={verPor} onValueChange={(v) => v && setVerPor(v as VerPorOption)}>
                <SelectTrigger>
                  <SelectValue>
                    {(v) => VER_POR_OPTIONS.find((o) => o.value === v)?.label ?? "Actividad"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {VER_POR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field variant="outlined">
              <FieldLabel htmlFor="buscar-planilla">Buscar</FieldLabel>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="buscar-planilla"
                  placeholder={verPor === "unidad" ? "Buscar unidad" : "Buscar actividad"}
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  className="pl-9"
                />
              </div>
            </Field>

            <Field variant="outlined">
              <FieldLabel>Filtro</FieldLabel>
              <FiltroPlanillaCascada value={filtro} onChange={setFiltro} />
            </Field>
          </div>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        {!filtroCompleto && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <InboxIcon className="size-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Seleccione Grado, Grupo o Asignatura</p>
          </div>
        )}

        {filtroCompleto && vista.tipo === "grid" && (
          <PlanillaGrid
            actividades={actividadesFiltradas}
            verPor={verPor}
            notasPorActividad={notasPorActividad}
            asistenciaPorActividad={asistenciaPorActividad}
            estudiantes={estudiantes}
            onAbrirBulk={(actividadId) => setVista({ tipo: "bulk", actividadId })}
            onGuardarCelda={guardarCelda}
          />
        )}

        {filtroCompleto && vista.tipo === "bulk" && actividadEnBulk && (
          <CalificarActividadBulk
            actividad={actividadEnBulk}
            estudiantes={estudiantesEnBulk}
            onVolver={() => setVista({ tipo: "grid" })}
            onGuardar={(estudianteIds, nota) =>
              guardarBulk(actividadEnBulk.id, estudianteIds, nota)
            }
          />
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
