import * as React from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { MdHourglassTop } from "react-icons/md"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input, inputTriggerVariants, inputVariants } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CaretDownIcon,
  CaretUpIcon,
  CheckCircleFillIcon,
  DotsThreeIcon,
  MagnifyingGlassIcon,
  ProhibitIcon,
  WarningCircleIcon,
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
import { NOTA_MINIMA_APROBATORIA } from "@/features/planeador/api/types/calificacion"

function formatNota(valor: number | null): string {
  return valor != null ? valor.toLocaleString("es-CO", { minimumFractionDigits: 1 }) : "—"
}

/** Columnas sacadas de cualquier fila: el backend garantiza que todas traen
 *  las mismas actividades y en el mismo orden, incluidas las `NO_ASIGNADA`. */
function columnasDe(filas: FilaPlanilla[]): CeldaPlanilla[] {
  return [...(filas[0]?.actividades ?? [])].sort((a, b) => a.orden - b.orden)
}

function cambioDefinitiva(fila: FilaPlanilla): boolean {
  const { definitivaGuardada, definitivaProyectada } = fila
  return definitivaGuardada != null && definitivaProyectada != null && definitivaGuardada !== definitivaProyectada
}

/** Fila con algo que aprobar: definitiva distinta o una corrección pendiente. */
function filaConCambios(fila: FilaPlanilla): boolean {
  return cambioDefinitiva(fila) || fila.actividades.some((c) => c.solicitudPendiente)
}

/** Igual que la columna de la planilla del Planeador; con cambio, el popover
 *  muestra la consolidada contra la que resulta de las actividades. */
function DefinitivaCelda({ fila }: { fila: FilaPlanilla }) {
  const nota = fila.definitivaProyectada ?? fila.definitivaGuardada
  if (nota == null) return null

  const valor = (
    // El color solo en la flecha; el número va en el color del texto.
    <span className="inline-flex items-center gap-0.5 font-semibold">
      {nota >= NOTA_MINIMA_APROBATORIA ? (
        <CaretUpIcon className="text-green" />
      ) : (
        <CaretDownIcon className="text-red" />
      )}
      {formatNota(nota)}
    </span>
  )
  if (!cambioDefinitiva(fila)) return valor

  return (
    <Popover>
      <PopoverTrigger render={<button type="button" className="outline-none" />}>{valor}</PopoverTrigger>
      <PopoverContent className="w-64 gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Nota anterior</span>
          <span className="text-sm">{formatNota(fila.definitivaGuardada)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Nota actual</span>
          <span className="text-sm font-semibold">{formatNota(fila.definitivaProyectada)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          La anterior es la consolidada; la actual incluye los cambios por aprobar.
        </p>
      </PopoverContent>
    </Popover>
  )
}

/** Nota con ▲ verde / ▼ rojo según el mínimo aprobatorio. */
function NotaConFlecha({ nota }: { nota: number | null }) {
  if (nota == null) return <span className="text-right">—</span>
  const aprueba = nota >= NOTA_MINIMA_APROBATORIA
  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-0.5 font-semibold",
        aprueba ? "text-green" : "text-red",
      )}
    >
      {aprueba ? <CaretUpIcon /> : <CaretDownIcon />}
      {formatNota(nota)}
    </span>
  )
}

/** Diferencia propuesta − actual: verde si sube, roja si baja. */
function CambioNota({ anterior, nueva }: { anterior: number | null; nueva: number | null }) {
  if (anterior == null || nueva == null) return <span className="text-right">—</span>
  const diff = Math.round((nueva - anterior) * 10) / 10
  return (
    <span className={cn("text-right font-semibold", diff < 0 ? "text-red" : diff > 0 && "text-green")}>
      {diff > 0 ? "+" : ""}
      {formatNota(diff)}
    </span>
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
  if (celda.solicitudPendiente) {
    return (
      <Tooltip>
        <TooltipTrigger className="inline-flex items-center gap-1 font-bold outline-none">
          {formatNota(celda.nota)}
          <MdHourglassTop className="text-orange size-4" />
        </TooltipTrigger>
        <TooltipContent className="bg-popover text-popover-foreground ring-foreground/10 grid w-48 shadow-md ring-1 [&>[data-side]]:bg-popover [&>[data-side]]:fill-popover grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 p-3 text-sm">
          <span>Nota actual</span>
          <NotaConFlecha nota={celda.notaAnterior} />
          <span>Nota propuesta</span>
          <NotaConFlecha nota={celda.nota} />
          <span>Cambio</span>
          <CambioNota anterior={celda.notaAnterior} nueva={celda.nota} />
        </TooltipContent>
      </Tooltip>
    )
  }
  return <span>{formatNota(celda.nota)}</span>
}

function PlanillaTable({ filas }: { filas: FilaPlanilla[] }) {
  const columnas = columnasDe(filas)

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
            <th className="w-80 px-4 py-3 text-left font-semibold uppercase">Nombres</th>
            <th className="w-28 bg-muted/40 px-4 py-3 text-left font-semibold uppercase">
              Definit. Proy.
            </th>
            {columnas.map((columna) => (
              <th key={columna.actividadId} className="w-40 px-4 py-3 text-left font-semibold uppercase">
                <span className="line-clamp-2" title={columna.titulo}>
                  {columna.titulo}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filas.map((fila) => (
            <tr key={fila.matriculaId}>
              <td
                className={cn(
                  "px-4 py-1.5 align-middle whitespace-nowrap uppercase",
                  filaConCambios(fila) ? "font-bold" : "font-medium",
                )}
              >
                {fila.nombreCompleto}
              </td>
              <td className="bg-muted/40 px-4 py-1.5 align-middle">
                <DefinitivaCelda fila={fila} />
              </td>
              {columnas.map((columna) => (
                <td key={columna.actividadId} className="px-4 py-1.5 align-middle">
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
  const { filtro, ...search } = planillaInformeRoute.useSearch()
  const [busqueda, setBusqueda] = React.useState("")

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
  const hayCambios = filas.some(filaConCambios)

  async function handleAprobar() {
    try {
      // Sin matrículas = todo el grupo (aprueba sus correcciones y consolida).
      const detalle = await guardar.mutateAsync({
        grupoId: Number(grupoId),
        asignaturaId: Number(asignaturaId),
        periodoId: Number(periodoId),
        matriculas: [],
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
        <TableScreenTitle
          action={
            <div className="flex gap-2">
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
                render={<Link to={paths.app.gestionAcademicaInformes.getHref()} search={search} />}
                nativeButton={false}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
            </div>
          }
        >
          Planilla de calificación
        </TableScreenTitle>

        {hayCambios && (
          <div
            role="status"
            className="border-orange-stroke bg-orange-22 text-orange mx-(--screen-spacing) mt-4 flex min-h-8 items-center gap-3 rounded-md border px-4 py-1 text-sm"
          >
            <WarningCircleIcon className="size-5 shrink-0" />
            <span>
              <span className="font-semibold">Periodo cerrado</span> – Cambios pendientes de aprobación
            </span>
          </div>
        )}

        <TableScreenToolbar>
          <div className="grid flex-1 gap-4 sm:grid-cols-3">
            {/* La planilla de Informes no trae las unidades: solo por actividad. */}
            <Field variant="outlined">
              <FieldLabel>Ver por</FieldLabel>
              <Select value="actividad" disabled>
                <SelectTrigger>
                  <SelectValue>{() => "Actividad"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actividad">Actividad</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field variant="outlined">
              <FieldLabel htmlFor="planilla-informe-search">Buscar</FieldLabel>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="planilla-informe-search"
                  placeholder="Buscar estudiante o actividad"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
            </Field>

            {/* Solo lectura: la planilla la fija la alerta desde la que se llegó. */}
            <Field variant="outlined">
              <FieldLabel>Filtro</FieldLabel>
              <div
                aria-disabled
                className={cn(
                  inputVariants({ variant: "outlined" }),
                  inputTriggerVariants({ variant: "outlined" }),
                  "flex items-center justify-between gap-2 opacity-80",
                )}
              >
                <span className="min-w-0 truncate">{filtro ?? "Grupo / Asignatura / Periodo"}</span>
                <CaretDownIcon className="size-4 shrink-0 text-muted-foreground" />
              </div>
            </Field>
          </div>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        {planilla.isPending && (
          <p className="py-8 text-center text-sm text-muted-foreground">Cargando planilla…</p>
        )}
        {planilla.isError && (
          <p className="py-8 text-center text-sm text-red">{getErrorMessage(planilla.error)}</p>
        )}
        {!planilla.isPending && !planilla.isError && <PlanillaTable filas={filas} />}
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
