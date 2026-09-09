import { useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"

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
import { usePlanillaColumnasQuery } from "@/features/planeador/api/query/use-planilla-columnas-query"
import { usePlanillaCalificacionesQuery } from "@/features/planeador/api/query/use-planilla-calificaciones-query"
import {
  useAgrupacionPlanillaOptionsQuery,
  type AgrupacionPlanillaKey,
} from "@/features/planeador/api/query/use-agrupacion-planilla-catalog"
import { CalificarActividadBulk } from "@/features/planeador/components/planilla/calificar-actividad-bulk"
import { PlanillaGrid } from "@/features/planeador/components/planilla/planilla-grid"
import type { PlanillaColumna } from "@/features/planeador/api/types/planilla"

/** Fallback mientras carga (o si el mock no tiene) el catálogo real
 *  `AGRUPACION_PLANILLA`. "Unidad" agrupa las columnas de la grilla por la
 *  unidad temática de cada actividad (`PlanillaColumna.unidad`);
 *  "Actividades" las deja sueltas. */
const VER_POR_FALLBACK: { key: AgrupacionPlanillaKey; label: string }[] = [
  { key: "actividad", label: "Actividades" },
  { key: "unidad", label: "Unidad" },
]
type VerPorOption = AgrupacionPlanillaKey

/**
 * "Planilla de calificación": grilla de notas por estudiante, con una
 * columna por actividad del Grado/Grupo/Asignatura/Periodo elegidos en
 * "Filtro". Columnas y celdas salen de los endpoints reales
 * (`/planilla/columnas`, `/planilla/calificaciones`) — el backend ya trae
 * el cruce grado/grupo/asignatura y las notas/definitiva calculadas, así
 * que acá no se recalcula nada; solo se filtra por texto y por rango de
 * fechas del periodo elegido (el endpoint no acepta esos dos como filtro
 * propio).
 *
 * Guardar una nota (celda a celda o en bloque) pega directo contra el
 * backend desde `CeldaNotaPopover`/`CalificarActividadBulk` — no hay
 * overrides locales: al guardar se invalida la query y la grilla vuelve a
 * traer la verdad del servidor.
 */
export function PlaneadorPlanillaPage() {
  const [verPor, setVerPor] = useState<VerPorOption>("actividad")
  const [buscar, setBuscar] = useState("")
  const [filtro, setFiltro] = useState<FiltroPlanillaValue | null>(null)
  const [columnaEnBulk, setColumnaEnBulk] = useState<PlanillaColumna | null>(null)

  const { data: verPorOptions } = useAgrupacionPlanillaOptionsQuery()
  const opcionesVerPor = verPorOptions?.length ? verPorOptions : VER_POR_FALLBACK

  // Recién con Grado, Grupo Y Asignatura elegidos hay contra qué pedir
  // columnas/calificaciones reales — antes de eso no tiene sentido pegarle
  // al backend adivinando.
  const params = filtro
    ? { grupoId: filtro.grupoId, asignaturaId: filtro.asignaturaId, gradoId: filtro.gradoId }
    : null

  const { data: todasLasColumnas = [] } = usePlanillaColumnasQuery(params)
  const { data: calificacionesResult } = usePlanillaCalificacionesQuery(params)
  const filas = calificacionesResult?.rows ?? []

  const columnas = useMemo(() => {
    if (!filtro) return []
    const term = buscar.trim().toLowerCase()
    return todasLasColumnas.filter((columna) => {
      // Solapamiento de rangos `yyyy-MM-dd` contra el periodo elegido —
      // comparación lexicográfica válida porque todas son ISO del mismo
      // largo. El endpoint no filtra por periodo, así que se hace acá.
      if (columna.fechaCierre < filtro.periodoEvaluacion.startDate) return false
      if (columna.fechaInicio > filtro.periodoEvaluacion.endDate) return false
      if (!term) return true
      // "Ver por: Unidad" busca por el nombre de la unidad (agrupa por
      // eso); "Actividades" busca por el título de la actividad — mismo
      // criterio que el placeholder del buscador.
      const campo = verPor === "unidad" ? (columna.unidad ?? "") : columna.titulo
      return campo.toLowerCase().includes(term)
    })
  }, [todasLasColumnas, filtro, verPor, buscar])

  const columnaIds = useMemo(() => new Set(columnas.map((c) => c.pkTactividad)), [columnas])
  const filasFiltradas = useMemo(
    () =>
      filas.map((fila) => ({
        ...fila,
        celdas: fila.celdas.filter((celda) => columnaIds.has(celda.pkTactividad)),
      })),
    [filas, columnaIds],
  )

  const estudiantesEnBulk = filas.map((fila) => ({
    id: fila.pkTestudiante,
    nombres: fila.nombreEstudiante,
    apellidos: "",
  }))

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
                    {(v) => opcionesVerPor.find((o) => o.key === v)?.label ?? "Actividad"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {opcionesVerPor.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
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
        {!filtro && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <InboxIcon className="size-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Seleccione Grado, Grupo o Asignatura</p>
          </div>
        )}

        {filtro && !columnaEnBulk && (
          <PlanillaGrid
            columnas={columnas}
            verPor={verPor}
            filas={filasFiltradas}
            onAbrirBulk={setColumnaEnBulk}
          />
        )}

        {filtro && columnaEnBulk && (
          <CalificarActividadBulk
            actividadId={columnaEnBulk.pkTactividad}
            titulo={columnaEnBulk.titulo}
            fecha={columnaEnBulk.fechaInicio}
            estudiantes={estudiantesEnBulk}
            onVolver={() => setColumnaEnBulk(null)}
          />
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
