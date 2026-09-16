import * as React from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  CaretDownIcon,
  CaretUpIcon,
  CheckCircleFillIcon,
  DotsThreeIcon,
  FileDownloadOutlinedIcon,
  FunnelIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import { paths } from "@/config/paths"
import { planillaAprobacionRoute } from "@/router"
import {
  ACTIVIDADES_PLANILLA,
  DOCENTES_APROBACION,
  ESTUDIANTES_PLANILLA_APROBACION,
  type EstudiantePlanilla,
} from "@/features/academic-management/reports/api/planilla-aprobacion-mock"

function coincide(estudiante: EstudiantePlanilla, busqueda: string): boolean {
  const texto = busqueda.trim().toLowerCase()
  if (!texto) return true
  if (estudiante.nombreCompleto.toLowerCase().includes(texto)) return true
  return ACTIVIDADES_PLANILLA.some(
    (a) => a.titulo.toLowerCase().includes(texto) && a.key in estudiante.notasPorActividad,
  )
}

function formatNota(valor: number | undefined): string {
  return valor != null ? valor.toLocaleString("es-CO", { minimumFractionDigits: 1 }) : "—"
}

function DefinitivaCelda({ estudiante }: { estudiante: EstudiantePlanilla }) {
  const { definitivaProyectada, definitivaAnterior, motivoCambio } = estudiante
  if (definitivaAnterior == null) {
    return <span className="font-semibold">{formatNota(definitivaProyectada)}</span>
  }
  const subio = definitivaProyectada > definitivaAnterior
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center gap-0.5 font-semibold"
          />
        }
      >
        {formatNota(definitivaProyectada)}
        {subio ? <CaretUpIcon className="text-green" /> : <CaretDownIcon className="text-red" />}
      </PopoverTrigger>
      <PopoverContent className="w-64 gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Nota anterior</span>
          <span className="text-sm">{formatNota(definitivaAnterior)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Nota actual</span>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-sm font-semibold",
              subio ? "text-green" : "text-red",
            )}
          >
            {formatNota(definitivaProyectada)}
            {subio ? <CaretUpIcon /> : <CaretDownIcon />}
          </span>
        </div>
        {motivoCambio && (
          <p className="text-sm">
            <span className="font-semibold">Motivo: </span>
            {motivoCambio}
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

function PlanillaTable({ estudiantes }: { estudiantes: EstudiantePlanilla[] }) {
  const [seleccionados, setSeleccionados] = React.useState<Set<number>>(new Set())
  const todosSeleccionados = estudiantes.length > 0 && estudiantes.every((e) => seleccionados.has(e.id))

  function toggle(id: number) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleTodos() {
    setSeleccionados(todosSeleccionados ? new Set() : new Set(estudiantes.map((e) => e.id)))
  }

  if (estudiantes.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No se encontraron estudiantes para la búsqueda.
      </p>
    )
  }

  return (
    <div className="overflow-auto rounded-md border border-input">
      <table className="w-full min-w-max text-sm">
        <thead className="border-b bg-muted/10">
          <tr>
            <th className="w-10 px-4 py-3">
              <Checkbox aria-label="Seleccionar todos" checked={todosSeleccionados} onCheckedChange={toggleTodos} />
            </th>
            <th className="px-4 py-3 text-left font-semibold uppercase">Apellidos y nombres</th>
            <th className="px-3 py-3 text-left font-semibold uppercase">
              <Tooltip>
                <TooltipTrigger className="inline-flex items-center gap-1 outline-none">
                  Definit Proy.
                  <InfoIcon className="size-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Definitiva proyectada con el cambio tardío ya aplicado</TooltipContent>
              </Tooltip>
            </th>
            {ACTIVIDADES_PLANILLA.map((actividad) => (
              <th key={actividad.key} className="px-3 py-3 text-left font-semibold uppercase">
                <Tooltip>
                  <TooltipTrigger className="inline-flex items-center gap-1 outline-none">
                    {actividad.titulo}
                    <InfoIcon className="size-3 shrink-0 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>{actividad.descripcion}</TooltipContent>
                </Tooltip>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {estudiantes.map((estudiante) => (
            <tr key={estudiante.id} className={cn(seleccionados.has(estudiante.id) && "bg-primary/5")}>
              <td className="px-4 py-3 align-top">
                <Checkbox
                  aria-label={`Seleccionar ${estudiante.nombreCompleto}`}
                  checked={seleccionados.has(estudiante.id)}
                  onCheckedChange={() => toggle(estudiante.id)}
                />
              </td>
              <td className="px-4 py-3 align-top font-medium whitespace-nowrap">{estudiante.nombreCompleto}</td>
              <td className="px-3 py-3 align-top">
                <DefinitivaCelda estudiante={estudiante} />
              </td>
              {ACTIVIDADES_PLANILLA.map((actividad) => (
                <td key={actividad.key} className="px-3 py-3 align-top">
                  {formatNota(estudiante.notasPorActividad[actividad.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PlanillaAprobacionContent() {
  const { notify } = useNotify()
  const navigate = useNavigate()
  const { docenteId } = planillaAprobacionRoute.useParams()
  const docente = DOCENTES_APROBACION.find((d) => d.id === Number(docenteId))
  const [busqueda, setBusqueda] = React.useState("")

  const estudiantesFiltrados = React.useMemo(
    () => ESTUDIANTES_PLANILLA_APROBACION.filter((e) => coincide(e, busqueda)),
    [busqueda],
  )

  function handleAprobar() {
    navigate({ to: paths.app.gestionAcademicaInformes.getHref() })
  }

  function handleRechazar() {
    notify("Cambios rechazados: la planilla vuelve al estado que tenía antes.", { variant: "error" })
  }

  function handleDescargar() {
    notify("La descarga de la planilla comenzará en breve.")
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>Planilla de calificación</TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        {docente && (
          <p className="mb-4 text-sm text-muted-foreground">
            {docente.nombreDocente} · {docente.asignatura} · {docente.gradoGrupo}
          </p>
        )}

        <div className="rounded-lg border border-border bg-background p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Field orientation="vertical" variant="outlined" className="w-full max-w-xl sm:w-96">
              <FieldLabel htmlFor="planilla-aprobacion-search">
                Buscar por nombre, apellido o actividad
              </FieldLabel>
              <InputGroup className="h-10 w-full rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
                <InputGroupAddon align="inline-start" className="ml-2">
                  <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="planilla-aprobacion-search"
                  type="search"
                  autoComplete="off"
                  placeholder="Buscar por"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="min-w-32 [&::-webkit-search-cancel-button]:appearance-none"
                />
                <InputGroupAddon align="inline-end" className="mr-1 gap-1">
                  {busqueda !== "" && (
                    <InputGroupButton
                      size="icon-xs"
                      variant="ghost"
                      color="muted"
                      aria-label="Limpiar búsqueda"
                      onClick={() => setBusqueda("")}
                    >
                      <XIcon />
                    </InputGroupButton>
                  )}
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <InputGroupButton size="icon-xs" variant="ghost" color="muted" aria-label="Filtrar" />
                      }
                    >
                      <FunnelIcon />
                    </TooltipTrigger>
                    <TooltipContent>Filtrar</TooltipContent>
                  </Tooltip>
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <TableScreenActions>
              <div className="flex gap-0">
                <Button
                  color="primary"
                  size="sm"
                  variant="fill"
                  className="rounded-r-none border-r-0"
                  onClick={handleAprobar}
                >
                  <CheckCircleFillIcon data-icon="inline-start" />
                  Aprobar y actualizar consolidado
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
                    <DropdownMenuItem onClick={handleRechazar}>Rechazar cambios</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button
                variant="outline"
                color="neutral"
                size="sm"
                render={<Link to={paths.app.gestionAcademicaInformes.getHref()} />}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
              <Button
                variant="outline"
                color="neutral"
                size="icon-sm"
                aria-label="Descargar planilla"
                onClick={handleDescargar}
              >
                <FileDownloadOutlinedIcon />
              </Button>
            </TableScreenActions>
          </div>
          <PlanillaTable estudiantes={estudiantesFiltrados} />
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}

export function PlanillaAprobacionPage() {
  return (
    <NoticeProvider>
      <PlanillaAprobacionContent />
    </NoticeProvider>
  )
}
