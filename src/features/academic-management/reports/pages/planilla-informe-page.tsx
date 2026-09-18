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
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CaretDownIcon,
  CaretUpIcon,
  CheckCircleFillIcon,
  DotsThreeIcon,
  FileDownloadOutlinedIcon,
  FunnelIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  ProhibitIcon,
  XIcon,
} from "@/components/ui/icons"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import { paths } from "@/config/paths"
import { planillaInformeRoute } from "@/router"
import { useGuardarPlanillaMutation } from "@/features/academic-management/reports/api/mutations/use-guardar-planilla"
import { usePlanillaInformeQuery } from "@/features/academic-management/reports/api/query/use-planilla-informe-query"
import type {
  CeldaPlanilla,
  FilaPlanilla,
} from "@/features/academic-management/reports/api/types"

function formatNota(valor: number | null): string {
  return valor != null ? valor.toLocaleString("es-CO", { minimumFractionDigits: 1 }) : "—"
}

/** Columnas sacadas de cualquier fila: el backend garantiza que todas traen
 *  las mismas actividades y en el mismo orden, incluidas las `NO_ASIGNADA`. */
function columnasDe(filas: FilaPlanilla[]): CeldaPlanilla[] {
  return [...(filas[0]?.actividades ?? [])].sort((a, b) => a.orden - b.orden)
}

function DefinitivaCelda({ fila }: { fila: FilaPlanilla }) {
  const { definitivaGuardada, definitivaProyectada } = fila
  const cambio =
    definitivaGuardada != null &&
    definitivaProyectada != null &&
    definitivaGuardada !== definitivaProyectada

  if (!cambio) {
    return <span className="font-semibold">{formatNota(definitivaProyectada ?? definitivaGuardada)}</span>
  }

  const subio = definitivaProyectada! > definitivaGuardada!
  return (
    <Popover>
      <PopoverTrigger
        render={<button type="button" className="inline-flex items-center gap-0.5 font-semibold" />}
      >
        {formatNota(definitivaProyectada)}
        {subio ? <CaretUpIcon className="text-green" /> : <CaretDownIcon className="text-red" />}
      </PopoverTrigger>
      <PopoverContent className="w-64 gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Nota anterior</span>
          <span className="text-sm">{formatNota(definitivaGuardada)}</span>
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
        <p className="text-xs text-muted-foreground">
          La anterior es la consolidada; la actual es la que resulta de las actividades de hoy.
        </p>
      </PopoverContent>
    </Popover>
  )
}

function CeldaActividad({ celda }: { celda: CeldaPlanilla | undefined }) {
  if (!celda || celda.estado === "NO_ASIGNADA") {
    return <span className="text-muted-foreground">·</span>
  }
  if (celda.estado === "NO_CALIFICABLE") {
    return celda.observacion ? (
      <Tooltip>
        <TooltipTrigger className="max-w-40 truncate text-left outline-none">
          {celda.observacion}
        </TooltipTrigger>
        <TooltipContent>{celda.observacion}</TooltipContent>
      </Tooltip>
    ) : (
      <Tooltip>
        <TooltipTrigger className="text-muted-foreground outline-none">
          <ProhibitIcon className="size-4" />
        </TooltipTrigger>
        <TooltipContent>Actividad no calificable</TooltipContent>
      </Tooltip>
    )
  }
  if (celda.estado === "PENDIENTE") {
    return <span className="text-muted-foreground">Sin calificar</span>
  }
  return <span>{formatNota(celda.nota)}</span>
}

function PlanillaTable({
  filas,
  seleccionados,
  onToggle,
  onToggleTodos,
}: {
  filas: FilaPlanilla[]
  seleccionados: Set<number>
  onToggle: (matriculaId: number) => void
  onToggleTodos: () => void
}) {
  const columnas = columnasDe(filas)
  const todosSeleccionados = filas.length > 0 && filas.every((f) => seleccionados.has(f.matriculaId))

  if (filas.length === 0) {
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
              <Checkbox
                aria-label="Seleccionar todos"
                checked={todosSeleccionados}
                onCheckedChange={onToggleTodos}
              />
            </th>
            <th className="px-4 py-3 text-left font-semibold uppercase">Apellidos y nombres</th>
            <th className="px-3 py-3 text-left font-semibold uppercase">
              <Tooltip>
                <TooltipTrigger className="inline-flex items-center gap-1 outline-none">
                  Definit Proy.
                  <InfoIcon className="size-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Definitiva del período según las actividades de hoy</TooltipContent>
              </Tooltip>
            </th>
            {columnas.map((columna) => (
              <th key={columna.actividadId} className="px-3 py-3 text-left font-semibold uppercase">
                <Tooltip>
                  <TooltipTrigger className="inline-flex max-w-40 items-center gap-1 outline-none">
                    <span className="truncate normal-case">{columna.titulo}</span>
                    <InfoIcon className="size-3 shrink-0 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {columna.titulo}
                    {columna.ponderacion != null && ` · ${columna.ponderacion}%`}
                  </TooltipContent>
                </Tooltip>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filas.map((fila) => (
            <tr
              key={fila.matriculaId}
              className={cn(seleccionados.has(fila.matriculaId) && "bg-primary/5")}
            >
              <td className="px-4 py-3 align-top">
                <Checkbox
                  aria-label={`Seleccionar ${fila.nombreCompleto}`}
                  checked={seleccionados.has(fila.matriculaId)}
                  onCheckedChange={() => onToggle(fila.matriculaId)}
                />
              </td>
              <td className="px-4 py-3 align-top font-medium whitespace-nowrap">
                {fila.nombreCompleto}
              </td>
              <td className="px-3 py-3 align-top">
                <DefinitivaCelda fila={fila} />
              </td>
              {columnas.map((columna) => (
                <td key={columna.actividadId} className="px-3 py-3 align-top">
                  <CeldaActividad
                    celda={fila.actividades.find((c) => c.actividadId === columna.actividadId)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PlanillaInformeContent() {
  const { notify } = useNotify()
  const navigate = useNavigate()
  const { grupoId, asignaturaId, periodoId } = planillaInformeRoute.useParams()
  // El estado de Informes viajó hasta acá para poder devolverlo intacto.
  const search = planillaInformeRoute.useSearch()
  const [busqueda, setBusqueda] = React.useState("")
  const [seleccionados, setSeleccionados] = React.useState<Set<number>>(new Set())

  // `useDeferredValue` en vez de un debounce con timers: el buscador filtra
  // filas o columnas del lado del servidor, así que cada tecla es una llamada.
  const busquedaDiferida = React.useDeferredValue(busqueda)

  const planilla = usePlanillaInformeQuery({
    grupoId: Number(grupoId),
    asignaturaId: Number(asignaturaId),
    periodoId: Number(periodoId),
    search: busquedaDiferida,
  })
  const guardar = useGuardarPlanillaMutation()

  const filas = planilla.data ?? []

  function toggle(matriculaId: number) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(matriculaId)) next.delete(matriculaId)
      else next.add(matriculaId)
      return next
    })
  }

  function toggleTodos() {
    const todos = filas.length > 0 && filas.every((f) => seleccionados.has(f.matriculaId))
    setSeleccionados(todos ? new Set() : new Set(filas.map((f) => f.matriculaId)))
  }

  async function handleAprobar() {
    try {
      const detalle = await guardar.mutateAsync({
        grupoId: Number(grupoId),
        asignaturaId: Number(asignaturaId),
        periodoId: Number(periodoId),
        matriculas: Array.from(seleccionados),
      })
      const consolidados = detalle.filter(
        (d) => d.resultado === "guardada" || d.resultado === "actualizada",
      ).length
      if (consolidados === 0) {
        notify("No había cambios para consolidar en esta planilla.", { variant: "info" })
        return
      }
      navigate({ to: paths.app.gestionAcademicaInformes.getHref(), search })
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    }
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>Planilla de calificación</TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Field orientation="vertical" variant="outlined" className="w-full max-w-xl sm:w-96">
              <FieldLabel htmlFor="planilla-informe-search">
                Buscar por nombre, apellido o actividad
              </FieldLabel>
              <InputGroup className="h-10 w-full rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
                <InputGroupAddon align="inline-start" className="ml-2">
                  <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="planilla-informe-search"
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
                  disabled={guardar.isPending}
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
                    <DropdownMenuItem
                      onClick={() =>
                        notify(
                          "Rechazar un cambio todavía no existe en el backend: la única forma de apagar la alerta es aprobarlo.",
                          { variant: "info" },
                        )
                      }
                    >
                      Rechazar cambios
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Button
                variant="outline"
                color="neutral"
                size="sm"
                render={
                  <Link to={paths.app.gestionAcademicaInformes.getHref()} search={search} />
                }
                nativeButton={false}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
              <Button
                variant="outline"
                color="neutral"
                size="icon-sm"
                aria-label="Descargar planilla"
                onClick={() =>
                  notify("La descarga de la planilla todavía no está disponible.", { variant: "info" })
                }
              >
                <FileDownloadOutlinedIcon />
              </Button>
            </TableScreenActions>
          </div>

          {planilla.isPending && (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando planilla…</p>
          )}
          {planilla.isError && (
            <p className="py-8 text-center text-sm text-red">No se pudo cargar la planilla.</p>
          )}
          {!planilla.isPending && !planilla.isError && (
            <PlanillaTable
              filas={filas}
              seleccionados={seleccionados}
              onToggle={toggle}
              onToggleTodos={toggleTodos}
            />
          )}
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}

export function PlanillaInformePage() {
  return (
    <NoticeProvider>
      <PlanillaInformeContent />
    </NoticeProvider>
  )
}
