import { useMemo, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
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
import {
  DotsThreeIcon,
  InboxIcon,
  WarningCircleIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  SpinnerIcon,
} from "@/components/ui/icons"
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
import {
  ROTULO_ACTIVIDAD_FALLBACK,
  rotuloEnMinuscula,
  useRotuloActividadQuery,
} from "@/features/planeador/api/query/use-rotulo-actividad-query"
import {
  CalificarActividadBulk,
  type EstadoGuardar,
} from "@/features/planeador/components/planilla/calificar-actividad-bulk"
import type { CambioPendiente } from "@/features/planeador/components/planilla/celda-nota-popover"
import {
  DialogEnviarSolicitud,
  DialogSolicitudEnviada,
} from "@/features/planeador/components/planilla/dialogs-solicitud-periodo-cerrado"
import { useCalificarCeldaMutation } from "@/features/planeador/api/mutations/use-calificar-celda"
import { PlanillaGrid } from "@/features/planeador/components/planilla/planilla-grid"
import type { PlanillaColumna } from "@/features/planeador/api/types/planilla"
import { usePlaneadorSoloLectura } from "@/features/planeador/hooks/use-planeador-solo-lectura"

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
  const { puedeCrear, puedeEditar } = usePlaneadorSoloLectura()
  const [verPor, setVerPor] = useState<VerPorOption>("actividad")
  const [buscar, setBuscar] = useState("")
  const [filtro, setFiltro] = useState<FiltroPlanillaValue | null>(null)
  const [columnaEnBulk, setColumnaEnBulk] = useState<PlanillaColumna | null>(null)
  // Estado del "Guardar" que reporta la vista de calificar masivo (null = sin cambios).
  const [estadoGuardarBulk, setEstadoGuardarBulk] = useState<EstadoGuardar | null>(null)
  const guardarBulkRef = useRef<(() => void) | null>(null)

  // Periodo cerrado (estado distinto de "1" Calificable): las notas se
  // acumulan y se envían juntas; el backend abre la solicitud (Regla 55).
  const periodoCerrado = filtro != null && filtro.periodoEvaluacion.estado !== "1"
  const [cambios, setCambios] = useState<Map<number, CambioPendiente>>(new Map())
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviada, setEnviada] = useState(false)
  const { notify } = useNotify()
  const calificar = useCalificarCeldaMutation()

  function cambiarFiltro(next: FiltroPlanillaValue | null) {
    setCambios(new Map())
    setFiltro(next)
  }

  function agregarCambio(cambio: CambioPendiente) {
    setCambios((prev) => new Map(prev).set(cambio.input.pkTactividadEstudiante, cambio))
  }

  async function enviarSolicitud() {
    setEnviando(true)
    const pendientes = new Map(cambios)
    let solicitudes = 0
    let error: unknown = null
    for (const [pk, cambio] of cambios) {
      try {
        const result = await calificar.mutateAsync(cambio.input)
        solicitudes += result?.solicitudes_pendientes?.length ?? 0
        pendientes.delete(pk)
      } catch (e) {
        error ??= e
      }
    }
    setCambios(pendientes)
    setEnviando(false)
    setConfirmando(false)
    if (error) notify(getErrorMessage(error), { variant: "error" })
    // Una primera nota (sin nota previa) se aplica directo, sin solicitud.
    if (solicitudes > 0) setEnviada(true)
    else if (pendientes.size < cambios.size) notify("Notas guardadas.")
  }

  const { data: verPorOptions } = useAgrupacionPlanillaOptionsQuery()
  // El catálogo `AGRUPACION_PLANILLA` etiqueta la opción como "Actividades" a
  // secas, pero acá SÍ se conoce el grado (una vez elegido el filtro), así
  // que se pisa con el rótulo real de ESE grado — nunca "Actividad" fijo.
  const { data: rotuloActividad } = useRotuloActividadQuery(filtro?.gradoId, filtro?.asignaturaId)
  const rotulo = rotuloActividad?.rotulo ?? ROTULO_ACTIVIDAD_FALLBACK
  const opcionesVerPor = (verPorOptions?.length ? verPorOptions : VER_POR_FALLBACK).map((option) =>
    option.key === "actividad" ? { ...option, label: rotulo } : option,
  )

  // Recién con Grado, Grupo Y Asignatura elegidos hay contra qué pedir
  // columnas/calificaciones reales — antes de eso no tiene sentido pegarle
  // al backend adivinando.
  const params = filtro
    ? {
        grupoId: filtro.grupoId,
        asignaturaId: filtro.asignaturaId,
        gradoId: filtro.gradoId,
        periodoId: filtro.periodoEvaluacion.id,
      }
    : null

  const { data: todasLasColumnas = [], isPending: isPendingColumnas } = usePlanillaColumnasQuery(params)
  const {
    data: calificacionesResult,
    isPending: isPendingCalificaciones,
    error: errorCalificaciones,
    refetch: refetchCalificaciones,
  } = usePlanillaCalificacionesQuery(params)
  const filas = calificacionesResult?.rows ?? []
  const cargandoPlanilla = filtro !== null && (isPendingColumnas || isPendingCalificaciones)

  const columnas = useMemo(() => {
    if (!filtro) return []
    const term = buscar.trim().toLowerCase()
    return todasLasColumnas.filter((columna) => {
      if (!term) return true
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

  // Solo los asignados a la actividad: un no asignado no se califica.
  const estudiantesEnBulk = filas
    .filter((fila) => {
      if (!columnaEnBulk) return true
      const celda = fila.celdas.find((c) => c.pkTactividad === columnaEnBulk.pkTactividad)
      return celda != null && celda.estado !== "NO_ASIGNADA"
    })
    .map((fila) => ({
    id: fila.pkTestudiante,
    matriculaId: fila.pkTmatricula,
    nombres: fila.nombreEstudiante,
    apellidos: "",
  }))

  return (
    <NoticeProvider>
      <TableScreen>
        <TableScreenHeader>
          <TableScreenTitle
            action={
              columnaEnBulk ? (
                puedeEditar &&
                estadoGuardarBulk && (
                  <Button
                    color="primary"
                    size="sm"
                    variant="fill"
                    disabled={estadoGuardarBulk.disabled || estadoGuardarBulk.guardando}
                    onClick={() => guardarBulkRef.current?.()}
                  >
                    {estadoGuardarBulk.guardando && (
                      <SpinnerIcon className="animate-spin" data-icon="inline-start" />
                    )}
                    Guardar
                  </Button>
                )
              ) : (
              <div className="flex gap-2">
                {puedeEditar && cambios.size > 0 && (
                  <Button color="primary" size="sm" variant="fill" onClick={() => setConfirmando(true)}>
                    Guardar
                  </Button>
                )}
              <div className="flex gap-0">
                {puedeCrear && (
                  <Button
                    color="primary"
                    size="sm"
                    variant="fill"
                    aria-label={`Nueva ${rotuloEnMinuscula(rotulo)}`}
                    nativeButton={false}
                    className="rounded-r-none border-r-0"
                    render={<Link to={paths.app.planeadorActividadCrear.getHref()} />}
                  >
                    <PlusCircleIcon data-icon="inline-start" />
                    Nueva {rotuloEnMinuscula(rotulo)}
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        color="primary"
                        size="sm"
                        variant="fill"
                        aria-label="Más opciones"
                        className={puedeCrear ? "rounded-l-none" : undefined}
                      />
                    }
                  >
                    <DotsThreeIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem render={<Link to={paths.app.planeadorActividades.getHref()} />}>
                      Planeador
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>Exportar todo</DropdownMenuItem>
                    <DropdownMenuItem disabled>Importar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              </div>
              )
            }
          >
            Planilla de calificación
          </TableScreenTitle>

          {periodoCerrado && (
            <div
              role="status"
              className="border-orange-stroke bg-orange-22 text-orange mx-(--screen-spacing) mt-4 flex min-h-8 items-center gap-3 rounded-md border px-4 py-1 text-sm font-semibold"
            >
              <WarningCircleIcon className="size-5 shrink-0" />
              Periodo cerrado
            </div>
          )}

          <TableScreenToolbar>
            <div className="grid flex-1 gap-4 sm:grid-cols-3">
              <Field variant="outlined">
                <FieldLabel>Ver por</FieldLabel>
                <Select value={verPor} onValueChange={(v) => v && setVerPor(v as VerPorOption)}>
                  <SelectTrigger>
                    <SelectValue>
                      {(v) => opcionesVerPor.find((o) => o.key === v)?.label ?? rotulo}
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
                    placeholder={verPor === "unidad" ? "Buscar unidad" : `Buscar ${rotuloEnMinuscula(rotulo)}`}
                    value={buscar}
                    onChange={(e) => setBuscar(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </Field>

              <Field variant="outlined">
                <FieldLabel>Filtro</FieldLabel>
                <FiltroPlanillaCascada value={filtro} onChange={cambiarFiltro} />
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

          {filtro && !columnaEnBulk && cargandoPlanilla && (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
              <Spinner /> Cargando planilla…
            </div>
          )}

          {/* Sin esto un error se veía como "sin estudiantes asignados". */}
          {filtro && !columnaEnBulk && !cargandoPlanilla && errorCalificaciones && (
            <div className="flex flex-col items-center gap-2 py-24 text-center">
              <p className="text-red text-sm">{getErrorMessage(errorCalificaciones)}</p>
              <Button variant="outline" color="neutral" size="sm" onClick={() => refetchCalificaciones()}>
                Reintentar
              </Button>
            </div>
          )}

          {filtro && !columnaEnBulk && !cargandoPlanilla && !errorCalificaciones && (
            <PlanillaGrid
              columnas={columnas}
              verPor={verPor}
              filas={filasFiltradas}
              onAbrirBulk={setColumnaEnBulk}
              gradoId={filtro.gradoId}
              cambios={periodoCerrado ? cambios : undefined}
              onCambio={periodoCerrado ? agregarCambio : undefined}
            />
          )}

          {filtro && columnaEnBulk && (
            <CalificarActividadBulk
              actividadId={columnaEnBulk.pkTactividad}
              titulo={columnaEnBulk.titulo}
              fecha={columnaEnBulk.fechaInicio}
              estudiantes={estudiantesEnBulk}
              onVolver={() => setColumnaEnBulk(null)}
              onEstadoGuardar={setEstadoGuardarBulk}
              guardarRef={guardarBulkRef}
            />
          )}
        </TableScreenBody>
      </TableScreen>

      <DialogEnviarSolicitud
        open={confirmando}
        enviando={enviando}
        onEnviar={enviarSolicitud}
        onCancelar={() => setConfirmando(false)}
      />
      <DialogSolicitudEnviada open={enviada} onCerrar={() => setEnviada(false)} />
    </NoticeProvider>
  )
}
