import * as React from "react"
import { Link } from "@tanstack/react-router"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckCircleFillIcon,
  DotsThreeIcon,
  FileDownloadOutlinedIcon,
  FolderOpenIcon,
  FunnelIcon,
  InfoIcon,
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
import { SearchInput } from "@/features/academic-management/reports/components/search-input"

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
  const { definitivaProyectada, definitivaAnterior } = estudiante
  // Sin `definitivaAnterior` la nota no cambió desde el último cierre: no
  // hay nada que comparar, así que no lleva flecha.
  if (definitivaAnterior == null) {
    return <span className="font-semibold">{formatNota(definitivaProyectada)}</span>
  }
  const subio = definitivaProyectada > definitivaAnterior
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn("inline-flex items-center gap-0.5 font-semibold", subio ? "text-green" : "text-red")}
      >
        {subio ? <CaretUpIcon /> : <CaretDownIcon />}
        {formatNota(definitivaProyectada)}
      </span>
      <span className="text-xs text-muted-foreground line-through">{formatNota(definitivaAnterior)}</span>
    </div>
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
  const { docenteId } = planillaAprobacionRoute.useParams()
  const docente = DOCENTES_APROBACION.find((d) => d.id === Number(docenteId))
  const [busqueda, setBusqueda] = React.useState("")

  const estudiantesFiltrados = React.useMemo(
    () => ESTUDIANTES_PLANILLA_APROBACION.filter((e) => coincide(e, busqueda)),
    [busqueda],
  )

  function handleAprobar() {
    notify("Cambios aprobados: el consolidado del período quedó actualizado.")
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
        <TableScreenTitle
          action={
            <div className="flex items-center gap-2">
              <Button color="primary" size="sm" variant="fill" onClick={handleAprobar}>
                <CheckCircleFillIcon data-icon="inline-start" />
                Aprobar y actualizar consolidado
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="outline" color="neutral" size="icon-sm" aria-label="Más opciones" />}
                >
                  <DotsThreeIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleRechazar}>Rechazar cambios</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            </div>
          }
        >
          Planilla de calificación
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="mb-4 flex items-center gap-2">
          <Button
            variant="ghost"
            color="neutral"
            size="icon-xs"
            aria-label="Volver a Informes"
            render={<Link to={paths.app.gestionAcademicaInformes.getHref()} />}
          >
            <ArrowLeftIcon />
          </Button>
          {docente && (
            <span className="text-sm text-muted-foreground">
              {docente.nombreDocente} · {docente.asignatura} · {docente.gradoGrupo}
            </span>
          )}
        </div>

        <Tabs defaultValue="actividades">
          <TabsList variant="folder">
            <TabsTrigger value="actividades">
              <CalendarBlankIcon data-icon="inline-start" />
              Actividades
            </TabsTrigger>
            <TabsTrigger value="unidad">
              <FolderOpenIcon data-icon="inline-start" />
              Unidad temática
            </TabsTrigger>
          </TabsList>
          <TabsContent value="actividades" className="rounded-b-lg rounded-tr-lg border border-border bg-background p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <SearchInput
                value={busqueda}
                onValueChange={setBusqueda}
                placeholder="Buscar por nombre, apellido o actividad"
                label="Buscar por nombre, apellido o actividad"
                className="sm:w-96"
              />
              <TableScreenActions>
                <Tooltip>
                  <TooltipTrigger render={<Button variant="outline" color="neutral" size="icon-sm" aria-label="Filtrar" />}>
                    <FunnelIcon />
                  </TooltipTrigger>
                  <TooltipContent>Filtrar</TooltipContent>
                </Tooltip>
              </TableScreenActions>
            </div>
            <PlanillaTable estudiantes={estudiantesFiltrados} />
          </TabsContent>
          <TabsContent value="unidad" className="rounded-b-lg rounded-tr-lg border border-border bg-background p-4">
            <p className="py-8 text-center text-sm text-muted-foreground">
              Agrupación por unidad temática próximamente.
            </p>
          </TabsContent>
        </Tabs>
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
