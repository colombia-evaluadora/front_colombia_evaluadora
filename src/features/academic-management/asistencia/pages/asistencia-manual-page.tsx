"use no memo"

import * as React from "react"
import { Link, Navigate } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeftIcon, CheckCircleFillIcon, CheckIcon, InfoIcon, SpinnerIcon, TrashIcon, WarningIcon } from "@/components/ui/icons"
import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { asistenciaManualRoute } from "@/router"
import { useAsistenciaCalendarioQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-calendario-query"
import { useAsistenciaAccess } from "@/features/academic-management/asistencia/api/use-es-docente"
import { useAsistenciaRosterPorBloquesQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-roster-query"
import { useAsistenciaEditarMutation } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-editar-mutation"
import { useAsistenciaRegistrarMutation } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-registrar-mutation"
import { useTipoAsistenciaCatalogQuery } from "@/features/academic-management/asistencia/api/query/use-tipo-asistencia-catalog-query"
import { buildColumnsAsistenciaManual } from "@/features/academic-management/asistencia/components/columns-asistencia-manual"
import type {
  AsistenciaRegistroManual,
  RosterEstudiante,
  TipoAsistencia,
} from "@/features/academic-management/asistencia/api/types/asistencia"
import { agruparPorBloquesContinuos, compararPorHora, esFechaFutura, formatHora } from "@/features/academic-management/asistencia/api/ui-mappings"

const TIPOS_ALTA_NUEVA: TipoAsistencia[] = [1, 2, 5]
const ASISTIO: TipoAsistencia = 1
const NO_ASISTIO: TipoAsistencia = 2
const LLEGO_TARDE: TipoAsistencia = 5

// 3 y 6 solo vienen en filas históricas: la excusa es el archivo, no un tipo.
const BASE_DE_JUSTIFICADO: Partial<Record<TipoAsistencia, TipoAsistencia>> = {
  3: 2,
  6: 5,
}

function tipoBase(tipo: TipoAsistencia): TipoAsistencia {
  return BASE_DE_JUSTIFICADO[tipo] ?? tipo
}


const PANEL_CLASS =
  "rounded-b-lg rounded-tr-lg border border-border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"

interface SesionTab {
  id: string
  fkGrupo: number
  grado: string
  grupo: string
  jornada: string
  fkAsignatura: number
  asignatura: string
  bloque: number | null
  bloques: (number | null)[]
  horasPorBloque: Record<number, { horaInicio: string | null; horaFin: string | null }>
  horaInicio: string | null
  horaFin: string | null
  /** Grupo de Preescolar: la sesión es `actividad`, no `asignatura` -- ver `registrar`/roster mas abajo. */
  esFormativa: boolean
  fkActividad: number | null
  actividad: string | null
}

/** Nombre a mostrar en pestaña/encabezado: la actividad si es formativa, la asignatura si no. */
function nombreSesion(sesion: Pick<SesionTab, "esFormativa" | "actividad" | "asignatura">): string {
  return sesion.esFormativa ? (sesion.actividad ?? "Actividad") : sesion.asignatura
}

function formatFechaLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", { day: "numeric", month: "long" })
}

function formatEncabezadoSesion(fecha: string, horaInicio: string | null, horaFin: string | null): string {
  const fechaLabel = formatFechaLarga(fecha)
  if (!horaInicio || !horaFin) return fechaLabel
  return `${fechaLabel} (${formatHora(horaInicio)} - ${formatHora(horaFin)})`
}

function resolverArchivo(
  bloque: number | null,
  fkMatricula: number,
  soporte: Record<number, File>,
  soporteEliminado: Record<number, boolean>,
  rosterPorBloque: Map<number | null, RosterEstudiante[]>,
): File | number | undefined {
  if (soporteEliminado[fkMatricula]) return undefined
  const nuevo = soporte[fkMatricula]
  if (nuevo) return nuevo
  const existente = rosterPorBloque.get(bloque)?.find((r) => r.fk_tmatricula === fkMatricula)?.fk_soporte_archivo
  return existente ?? undefined
}

function registrosPorBloque(
  bloques: (number | null)[],
  seleccion: Record<number, TipoAsistencia>,
  bloqueTarde: Record<number, number>,
  soporte: Record<number, File>,
  soporteEliminado: Record<number, boolean>,
  rosterPorBloque: Map<number | null, RosterEstudiante[]>,
): Map<number | null, AsistenciaRegistroManual[]> {
  const porBloque = new Map<number | null, AsistenciaRegistroManual[]>(bloques.map((b) => [b, []]))
  const bloquesNumericos = bloques.filter((b): b is number => b !== null)

  for (const [fkMatriculaStr, tipo] of Object.entries(seleccion)) {
    const fkMatricula = Number(fkMatriculaStr)

    if (tipo === LLEGO_TARDE && bloquesNumericos.length > 1) {
      const bloqueLlegada = bloqueTarde[fkMatricula] ?? bloquesNumericos[0]
      for (const bloque of bloquesNumericos) {
        const tipoBloque: TipoAsistencia =
          bloque < bloqueLlegada ? NO_ASISTIO : bloque === bloqueLlegada ? LLEGO_TARDE : ASISTIO
        // El soporte de la tardanza va SOLO en el bloque marcado "Llegó
        // tarde" -- los bloques "No asistió"/"Asistió" generados por la
        // cascada no llevan justificación propia.
        const archivo =
          tipoBloque === LLEGO_TARDE
            ? resolverArchivo(bloque, fkMatricula, soporte, soporteEliminado, rosterPorBloque)
            : undefined
        porBloque.get(bloque)!.push({
          fkMatricula,
          tipoAsistencia: tipoBloque,
          ...(archivo !== undefined && { fkArchivo: archivo }),
        })
      }
      continue
    }

    // El soporte solo aplica a No asistió / Llegó tarde (única combinación
    // que la UI deja elegir) -- si `tipo` cambió a Asistió sin pasar por
    // "Marcar todo" (que sí limpia el borrador), un archivo que haya quedado
    // en `soporte` de una selección anterior no se re-envía.
    const admiteSoporte = tipo === NO_ASISTIO || tipo === LLEGO_TARDE
    for (const bloque of bloques) {
      const archivo = admiteSoporte
        ? resolverArchivo(bloque, fkMatricula, soporte, soporteEliminado, rosterPorBloque)
        : undefined
      porBloque.get(bloque)!.push({
        fkMatricula,
        tipoAsistencia: tipo,
        ...(archivo !== undefined && { fkArchivo: archivo }),
      })
    }
  }

  return porBloque
}

function registroAutoritativo(
  bloques: (number | null)[],
  rosterPorBloque: Map<number | null, RosterEstudiante[]>,
  fkMatricula: number,
): { bloque: number | null; row: RosterEstudiante } | undefined {
  let candidato: { bloque: number | null; row: RosterEstudiante } | undefined
  for (const bloque of bloques) {
    const row = rosterPorBloque.get(bloque)?.find((r) => r.fk_tmatricula === fkMatricula)
    if (!row || row.tipo_asistencia_valor == null) continue
    if (tipoBase(row.tipo_asistencia_valor) === LLEGO_TARDE) return { bloque, row }
    candidato ??= { bloque, row }
  }
  return candidato
}

/** Regla 75: con una solicitud pendiente el docente ve lo que propuso, no lo oficial. */
function conCambioPendiente(row: RosterEstudiante): RosterEstudiante {
  if (row.pk_tsolicitud_aprobacion == null || row.cambio_tipo_asistencia_valor == null) return row
  return { ...row, tipo_asistencia_valor: row.cambio_tipo_asistencia_valor }
}

/** Hay algo que corregir respecto a lo que la pantalla ya muestra para ese registro. */
function cambiaRegistro(registro: AsistenciaRegistroManual, actual: RosterEstudiante, quitaSoporte: boolean): boolean {
  // 3/6 históricos equivalen a 2/5: la excusa es el archivo.
  const tipoActual = actual.tipo_asistencia_valor == null ? null : tipoBase(actual.tipo_asistencia_valor)
  return tipoBase(registro.tipoAsistencia) !== tipoActual || registro.fkArchivo instanceof File || quitaSoporte
}

/** Lo que la página necesita de una pestaña para preguntar antes de cambiar de sesión. */
interface SesionControl {
  hayCambios: () => boolean
  /** `true` si quedó guardado; con error la pestaña ya avisó y no se cambia. */
  guardar: () => Promise<boolean>
}

function SesionTabContent({
  sesion,
  fecha,
  controlRef,
}: {
  sesion: SesionTab
  fecha: string
  controlRef: React.RefObject<SesionControl | null>
}) {
  const { notify } = useNotify()
  const {
    porBloque: rosterOficial,
    isPending,
    isError,
    error,
    refetch,
  } = useAsistenciaRosterPorBloquesQuery(
    {
      GRUPO: sesion.fkGrupo,
      FECHA: fecha,
      // Sesión formativa (preescolar): el padrón/registro se identifican por
      // ACTIVIDAD, no por ASIGNATURA+BLOQUE.
      ...(sesion.esFormativa
        ? { ACTIVIDAD: sesion.fkActividad ?? undefined }
        : { ASIGNATURA: sesion.fkAsignatura }),
    },
    sesion.bloques,
  )
  const rosterPorBloque = React.useMemo(
    () => new Map([...rosterOficial].map(([bloque, rows]) => [bloque, rows.map(conCambioPendiente)])),
    [rosterOficial],
  )
  // `periodo_calificable` y la solicitud en el padrón todavía no los manda el backend.
  const periodoCerrado = [...rosterOficial.values()].some((rows) => rows.some((r) => r.periodo_calificable === false))
  // Lo que el PATCH devolvió pendiente en esta sesión: hoy es la única señal para el badge.
  const [pendientesLocales, setPendientesLocales] = React.useState<Set<number>>(new Set())
  // String estable para no rearmar las columnas en cada render.
  const clavePendientes = [
    ...pendientesLocales,
    ...[...rosterOficial.values()].flatMap((rows) =>
      rows.filter((r) => r.pk_tsolicitud_aprobacion != null).map((r) => r.fk_tmatricula),
    ),
  ].join(",")
  const conPendiente = React.useMemo(
    () => new Set(clavePendientes ? clavePendientes.split(",").map(Number) : []),
    [clavePendientes],
  )
  const editar = useAsistenciaEditarMutation()
  const [seleccion, setSeleccion] = React.useState<Record<number, TipoAsistencia>>({})
  const [soporte, setSoporte] = React.useState<Record<number, File>>({})
  const [soporteEliminado, setSoporteEliminado] = React.useState<Record<number, boolean>>({})
  const [bloqueTarde, setBloqueTarde] = React.useState<Record<number, number>>({})
  const registrar = useAsistenciaRegistrarMutation()
  const { data: tipoOptionsCompleto = [] } = useTipoAsistenciaCatalogQuery()
  const tipoOptions = React.useMemo(
    () => tipoOptionsCompleto.filter((opt) => TIPOS_ALTA_NUEVA.includes(opt.value)),
    [tipoOptionsCompleto],
  )

  // El padrón (nombre/documento) es el mismo en cualquier bloque; el primero
  // alcanza para eso. Lo que SÍ varía por bloque es el estado guardado, así
  // que cada fila se reemplaza por su registro autoritativo (abajo) antes de
  // pasarla a la tabla.
  const primerBloqueRoster = React.useMemo(
    () => rosterPorBloque.get(sesion.bloque) ?? [],
    [rosterPorBloque, sesion.bloque],
  )
  const autoritativos = React.useMemo(() => {
    const mapa = new Map<number, { bloque: number | null; row: RosterEstudiante }>()
    for (const base of primerBloqueRoster) {
      const encontrado = registroAutoritativo(sesion.bloques, rosterPorBloque, base.fk_tmatricula)
      if (encontrado) mapa.set(base.fk_tmatricula, encontrado)
    }
    return mapa
  }, [primerBloqueRoster, rosterPorBloque, sesion.bloques])

  const roster_ = React.useMemo(
    () => primerBloqueRoster.map((base) => autoritativos.get(base.fk_tmatricula)?.row ?? base),
    [primerBloqueRoster, autoritativos],
  )

  const baseline = React.useRef<Record<number, TipoAsistencia>>({})
  const bloqueTardeBaseline = React.useRef<Record<number, number>>({})
  const precargado = React.useRef(false)
  React.useEffect(() => {
    if (precargado.current || isPending) return
    const inicialSeleccion: Record<number, TipoAsistencia> = {}
    const inicialBloqueTarde: Record<number, number> = {}
    for (const [fkMatricula, { bloque, row }] of autoritativos) {
      if (row.tipo_asistencia_valor == null) continue
      const base = tipoBase(row.tipo_asistencia_valor)
      inicialSeleccion[fkMatricula] = base
      // Sin bloque real no hay "en cuál bloque llegó" que preseleccionar
      // (sesión suelta o de un solo bloque -- el selector ni se muestra).
      if (base === LLEGO_TARDE && bloque !== null) {
        inicialBloqueTarde[fkMatricula] = bloque
      }
    }
    baseline.current = inicialSeleccion
    bloqueTardeBaseline.current = inicialBloqueTarde
    if (Object.keys(inicialSeleccion).length > 0) setSeleccion(inicialSeleccion)
    if (Object.keys(inicialBloqueTarde).length > 0) setBloqueTarde(inicialBloqueTarde)
    precargado.current = true
  }, [isPending, autoritativos])
  const columns = React.useMemo(
    () =>
      buildColumnsAsistenciaManual({
        fechaLabel: formatEncabezadoSesion(fecha, sesion.horaInicio, sesion.horaFin),
        tipoOptions,
        seleccion,
        onChange: (fkMatricula, tipo) =>
          setSeleccion((prev) => ({ ...prev, [fkMatricula]: tipo })),
        soporte,
        onSoporteChange: (fkMatricula, archivo) => {
          setSoporte((prev) => {
            if (!archivo) {
              const { [fkMatricula]: _omitido, ...resto } = prev
              return resto
            }
            return { ...prev, [fkMatricula]: archivo }
          })
          if (archivo) {
            setSoporteEliminado((prev) => {
              if (!prev[fkMatricula]) return prev
              const { [fkMatricula]: _omitido, ...resto } = prev
              return resto
            })
          }
        },
        soporteEliminado,
        onSoporteEliminar: (fkMatricula) => {
          setSoporte((prev) => {
            const { [fkMatricula]: _omitido, ...resto } = prev
            return resto
          })
          setSoporteEliminado((prev) => ({ ...prev, [fkMatricula]: true }))
        },
        bloques: sesion.bloques.filter((b): b is number => b !== null),
        horasPorBloque: sesion.horasPorBloque,
        bloqueTarde,
        onBloqueTardeChange: (fkMatricula, bloque) =>
          setBloqueTarde((prev) => ({ ...prev, [fkMatricula]: bloque })),
        conPendiente,
      }),
    [
      conPendiente,
      fecha,
      sesion.horaInicio,
      sesion.horaFin,
      sesion.bloques,
      sesion.horasPorBloque,
      tipoOptions,
      seleccion,
      soporte,
      soporteEliminado,
      bloqueTarde,
    ],
  )

  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(10)
  const pageCount = Math.max(1, Math.ceil(roster_.length / pageSize))
  const rows = React.useMemo(
    () => roster_.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [roster_, pageIndex, pageSize],
  )

  function handleSetPageSize(size: number) {
    setPageSize(size)
    setPageIndex(0)
  }

  const { table } = useDataTable({
    columns,
    data: rows,
    pageCount,
    getRowId: (row) => String(row.fk_tmatricula),
    pageIndex,
    pageSize,
    goToPage: setPageIndex,
    setPageSize: handleSetPageSize,
    sorting: [],
    setSorting: () => {},
    columnVisibilityStorageKey: "asistencia-manual-column-visibility",
  })

  const seleccionLista = React.useMemo(() => {
    const listos = Object.entries(seleccion).filter(([fkMatriculaStr, tipo]) => {
      if (tipo !== LLEGO_TARDE || sesion.bloques.length <= 1) return true
      return bloqueTarde[Number(fkMatriculaStr)] != null
    })
    return Object.fromEntries(listos) as Record<number, TipoAsistencia>
  }, [seleccion, bloqueTarde, sesion.bloques.length])
  const pendientesPorBloqueTarde = Object.keys(seleccion).length - Object.keys(seleccionLista).length

  const hayAlgoQueGuardar =
    Object.entries(seleccionLista).some(([fk, tipo]) => tipo !== baseline.current[Number(fk)]) ||
    Object.keys(soporte).some((fk) => Number(fk) in seleccionLista) ||
    Object.keys(soporteEliminado).some((fk) => Number(fk) in seleccionLista)
  const mostrarGuardar = hayAlgoQueGuardar


  // Solo completa a quien no tiene marca: no pisa lo que el docente ya tomó.
  function handleMarcarTodoAsistio() {
    setSeleccion((prev) => {
      const next = { ...prev }
      for (const est of roster_) next[est.fk_tmatricula] ??= ASISTIO
      return next
    })
  }

  const [guardando, setGuardando] = React.useState(false)

  async function guardar(avisarSiNada: boolean): Promise<boolean> {
    if (!hayAlgoQueGuardar) {
      if (avisarSiNada) {
        notify("Marca la asistencia de al menos un estudiante antes de guardar.", { variant: "error" })
      }
      return !avisarSiNada
    }
    const porBloque = registrosPorBloque(
      sesion.bloques,
      seleccionLista,
      bloqueTarde,
      soporte,
      soporteEliminado,
      rosterPorBloque,
    )
    const seleccionGuardada = seleccionLista
    setGuardando(true)
    // Regla 75: `registrar` hace upsert sin pedir aprobación (V138), así que
    // un registro que ya existe se corrige por PATCH, que es el que la pide.
    // Lo que ya quedó propuesto en esta sesión no se vuelve a mandar.
    const yaPropuesto = (registro: AsistenciaRegistroManual) =>
      pendientesLocales.has(registro.fkMatricula) &&
      tipoBase(registro.tipoAsistencia) === baseline.current[registro.fkMatricula] &&
      !(registro.fkArchivo instanceof File)
    const nuevos = new Map<number | null, AsistenciaRegistroManual[]>()
    const correcciones: { fkMatricula: number; pk: number; registro: AsistenciaRegistroManual }[] = []
    for (const [bloque, registros] of porBloque) {
      for (const registro of registros) {
        const actual = rosterPorBloque.get(bloque)?.find((r) => r.fk_tmatricula === registro.fkMatricula)
        if (actual?.pk_tasistencia == null) {
          // Una captura tardía que ya espera aprobación no se reenvía igual.
          const yaPendiente = actual?.pk_tsolicitud_aprobacion != null && !cambiaRegistro(registro, actual, false)
          if (!yaPendiente && !yaPropuesto(registro)) nuevos.set(bloque, [...(nuevos.get(bloque) ?? []), registro])
        } else if (
          cambiaRegistro(registro, actual, soporteEliminado[registro.fkMatricula] ?? false) &&
          !yaPropuesto(registro)
        ) {
          correcciones.push({ fkMatricula: registro.fkMatricula, pk: actual.pk_tasistencia, registro })
        }
      }
    }
    try {
      const [altas, solicitudes] = await Promise.all([
        Promise.all(
          [...nuevos.entries()].map(async ([bloque, registros]) => {
            // Captura tardía en período cerrado: también queda pendiente (Regla 75).
            const { pendientes } = await registrar.mutateAsync({
              GRUPO: sesion.fkGrupo,
              FECHA: fecha,
              REGISTROS: registros,
              ...(sesion.esFormativa
                ? { ACTIVIDAD: sesion.fkActividad ?? undefined }
                : { ASIGNATURA: sesion.fkAsignatura, BLOQUE: bloque }),
            })
            return pendientes.length > 0 ? registros.map((r) => r.fkMatricula) : []
          }),
        ),
        Promise.all(
          correcciones.map(async ({ fkMatricula, pk, registro }) => {
            const pendientes = await editar.mutateAsync({
              pks: [pk],
              body: {
                TIPO_ASISTENCIA: registro.tipoAsistencia,
                ...(registro.fkArchivo instanceof File && { SOPORTE_ARCHIVO: registro.fkArchivo }),
                ...(soporteEliminado[fkMatricula] && { LIMPIAR_ARCHIVO: true }),
              },
            })
            return pendientes.length > 0 ? fkMatricula : null
          }),
        ),
      ])
      const quedaronPendientes = [...altas.flat(), ...solicitudes.filter((fk): fk is number => fk !== null)]
      if (quedaronPendientes.length > 0) {
        setPendientesLocales((prev) => new Set([...prev, ...quedaronPendientes]))
        notify("El período ya no es calificable: los cambios quedaron pendientes de aprobación del coordinador.", {
          variant: "info",
        })
      }
      baseline.current = { ...baseline.current, ...seleccionGuardada }
      bloqueTardeBaseline.current = {
        ...bloqueTardeBaseline.current,
        ...Object.fromEntries(
          Object.entries(bloqueTarde).filter(([fk]) => Number(fk) in seleccionGuardada),
        ),
      }
      setSoporte((prev) => {
        const next = { ...prev }
        for (const fk of Object.keys(seleccionGuardada)) delete next[Number(fk)]
        return next
      })
      setSoporteEliminado((prev) => {
        const next = { ...prev }
        for (const fk of Object.keys(seleccionGuardada)) delete next[Number(fk)]
        return next
      })
      return true
    } catch {
      notify("Ocurrió un error al guardar la asistencia.", { variant: "error" })
      return false
    } finally {
      setGuardando(false)
    }
  }

  async function handleGuardar() {
    await guardar(true)
  }

  // Sin autoguardado: la página pregunta antes de cambiar de pestaña.
  controlRef.current = { hayCambios: () => hayAlgoQueGuardar, guardar: () => guardar(false) }
  React.useEffect(() => {
    return () => {
      controlRef.current = null
    }
  }, [controlRef])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{sesion.grado}{sesion.grupo}</span>
          <span className="rounded-sm bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
            {sesion.jornada}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium">{nombreSesion(sesion)}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          color="primary"
          size="sm"
          disabled={roster_.length === 0}
          onClick={handleMarcarTodoAsistio}
        >
          <CheckCircleFillIcon data-icon="inline-start" />
          Marcar todo como Asistió
        </Button>
      </div>

      {periodoCerrado && (
        <div role="status" className="flex items-start gap-2 rounded-md border border-orange-stroke bg-orange-22 px-4 py-3 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-orange" />
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">El período ya no es calificable.</span> Lo que
            registres o corrijas queda pendiente hasta que el coordinador académico lo apruebe.
          </p>
        </div>
      )}

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Este grupo no tiene estudiantes."
        errorMessage={error ? getErrorMessage(error) : undefined}
        cellClassName="py-1"
      />

      {roster_.length > 0 && (
        <Pagination
          pageIndex={pageIndex}
          pageCount={pageCount}
          canPrev={pageIndex > 0}
          canNext={pageIndex < pageCount - 1}
          onPageChange={setPageIndex}
          totalCount={roster_.length}
          pageSize={pageSize}
          onPageSizeChange={handleSetPageSize}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {Object.keys(seleccion).length} de {roster_.length} estudiantes marcados
          </span>
          {guardando ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <SpinnerIcon className="size-3 animate-spin" /> Guardando…
            </span>
          ) : (
            !hayAlgoQueGuardar &&
            Object.keys(seleccionLista).length > 0 && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckIcon className="size-3" /> Guardado
              </span>
            )
          )}
          {pendientesPorBloqueTarde > 0 && (
            <span className="text-xs text-muted-foreground">
              {pendientesPorBloqueTarde === 1
                ? "1 estudiante espera el bloque de llegada"
                : `${pendientesPorBloqueTarde} estudiantes esperan el bloque de llegada`}
            </span>
          )}
        </div>
        {mostrarGuardar && (
          <Button
            type="button"
            color="primary"
            size="sm"
            disabled={registrar.isPending || editar.isPending}
            aria-busy={registrar.isPending || editar.isPending}
            onClick={handleGuardar}
          >
            {registrar.isPending || editar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        )}
      </div>
    </div>
  )
}

export function AsistenciaManualPage() {
  const { fecha, sede } = asistenciaManualRoute.useSearch()
  // A esta pantalla solo se llega desde el calendario (`asistencia-month-grid`),
  // que siempre manda `fecha` y `sede`. Si faltan o son inválidas (URL editada a
  // mano, enlace viejo) el schema las deja en `undefined` en vez de tirar, y
  // volvemos al calendario conservando lo que sí haya llegado.
  if (!fecha || sede == null) {
    return <Navigate to={paths.app.asistencia.getHref()} search={{ sede, fecha }} replace />
  }
  return <AsistenciaManualContent fecha={fecha} sede={sede} />
}

function AsistenciaManualContent({ fecha, sede }: { fecha: string; sede: number }) {
  const [anio, mes] = fecha.split("-").map(Number)

  const { isDocente } = useAsistenciaAccess()
  // Esta pantalla es SOLO de escritura: a diferencia del calendario/Seguimiento
  // (de solo lectura para Director de Grupo/Coordinador), aquí SIEMPRE se
  // filtra a lo que el usuario dicta, aunque además sea director de grupo —
  // su alcance amplio de lectura no le da permiso de escritura ajena (Regla 74).
  const { data: sesiones, isPending } = useAsistenciaCalendarioQuery(
    {
      SEDE: sede,
      ANIO: anio,
      MES: mes,
      MIAS: true,
    },
    isDocente,
  )

  const sesionesDelDia: SesionTab[] = React.useMemo(() => {
    const delDia = (sesiones ?? []).filter((s) => s.fecha === fecha)
    return agruparPorBloquesContinuos(delDia)
      .sort(compararPorHora)
      .map((b) => ({
        // Una actividad no tiene bloque -- se identifica sola, distinta de
        // cualquier otra sesión del mismo grupo/asignatura ese día.
        id: b.esFormativa ? `${b.fkGrupo}-actividad-${b.fkActividad}` : `${b.fkGrupo}-${b.fkAsignatura}-${b.bloque}`,
        fkGrupo: b.fkGrupo,
        grado: b.grado,
        grupo: b.grupo,
        jornada: b.jornada,
        fkAsignatura: b.fkAsignatura,
        asignatura: b.asignatura,
        bloque: b.bloque,
        bloques: b.bloques,
        esFormativa: b.esFormativa,
        fkActividad: b.fkActividad,
        actividad: b.actividad,
        horasPorBloque: b.horasPorBloque,
        horaInicio: b.horaInicio,
        horaFin: b.horaFin,
      }))
  }, [sesiones, fecha])

  const [activeTab, setActiveTab] = React.useState<string | undefined>(undefined)
  const currentTab = activeTab ?? sesionesDelDia[0]?.id
  // Solo hay una pestaña montada a la vez (el panel oculto se desmonta y pierde lo marcado).
  const controlRef = React.useRef<SesionControl | null>(null)
  const [tabPendiente, setTabPendiente] = React.useState<string | null>(null)
  const [guardandoCambio, setGuardandoCambio] = React.useState(false)

  function handleTabChange(next: string) {
    if (next === currentTab) return
    if (controlRef.current?.hayCambios()) {
      setTabPendiente(next)
      return
    }
    setActiveTab(next)
  }

  function irATabPendiente() {
    if (tabPendiente) setActiveTab(tabPendiente)
    setTabPendiente(null)
  }

  async function handleGuardarYCambiar() {
    setGuardandoCambio(true)
    const ok = (await controlRef.current?.guardar()) ?? true
    setGuardandoCambio(false)
    if (ok) irATabPendiente()
    else setTabPendiente(null)
  }

  return (
    <NoticeProvider>
      <TableScreen>
        <TableScreenHeader>
          <TableScreenTitle>Asistencia</TableScreenTitle>
          <NoticeOutlet className="mx-(--screen-spacing) my-4" />
        </TableScreenHeader>

        <TableScreenBody>
        <div className="mb-4 flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-xs"
                  aria-label="Volver a Asistencia"
                  render={<Link to={paths.app.asistencia.getHref()} search={{ sede, fecha }} />}
                  nativeButton={false}
                />
              }
            >
              <ArrowLeftIcon />
            </TooltipTrigger>
            <TooltipContent>Volver a Asistencia</TooltipContent>
          </Tooltip>
          <h2 className="text-base font-semibold">Asistencia manual</h2>
        </div>

        {!isDocente && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Solo un docente puede registrar o editar asistencia. Tu rol tiene acceso de solo consulta.
          </p>
        )}

        {isDocente && isPending && <Skeleton className="h-64 w-full" />}

        {isDocente && esFechaFutura(fecha) && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Todavía no se puede tomar asistencia: {formatFechaLarga(fecha)} es una fecha futura.
          </p>
        )}

        {isDocente && !isPending && !esFechaFutura(fecha) && sesionesDelDia.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay sesiones programadas para este día.
          </p>
        )}

        {isDocente && !isPending && !esFechaFutura(fecha) && sesionesDelDia.length > 0 && (
          <Tabs value={currentTab} onValueChange={(value) => handleTabChange(String(value))}>
            <TabsList variant="folder">
              {sesionesDelDia.map((sesion) => (
                <TabsTrigger key={sesion.id} value={sesion.id}>
                  {sesion.grado}{sesion.grupo} · {nombreSesion(sesion)}
                </TabsTrigger>
              ))}
            </TabsList>
            {sesionesDelDia.map((sesion) => (
              <TabsContent key={sesion.id} value={sesion.id} className={PANEL_CLASS}>
                <SesionTabContent sesion={sesion} fecha={fecha} controlRef={controlRef} />
              </TabsContent>
            ))}
          </Tabs>
        )}

        <AlertDialog
          open={tabPendiente !== null}
          onOpenChange={(open) => {
            if (!open && !guardandoCambio) setTabPendiente(null)
          }}
        >
          <AlertDialogContent className="data-[size=default]:sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogMedia className="size-12 rounded-full bg-yellow-22 text-yellow *:[svg:not([class*='size-'])]:size-6">
                <WarningIcon />
              </AlertDialogMedia>
              <AlertDialogTitle>¿Guardar la asistencia antes de salir?</AlertDialogTitle>
              <AlertDialogDescription>
                Marcaste asistencia en esta sesión y todavía no la guardas. Si cambias de sesión sin guardar, se pierde.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:items-center">
              <AlertDialogCancel variant="ghost" color="neutral" disabled={guardandoCambio} className="sm:mr-auto">
                Seguir editando
              </AlertDialogCancel>
              <Button variant="outline" color="destructive" disabled={guardandoCambio} onClick={irATabPendiente}>
                <TrashIcon data-icon="inline-start" />
                Descartar
              </Button>
              <Button color="primary" disabled={guardandoCambio} aria-busy={guardandoCambio} onClick={handleGuardarYCambiar}>
                {guardandoCambio ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <CheckIcon data-icon="inline-start" />
                )}
                {guardandoCambio ? "Guardando…" : "Guardar"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </TableScreenBody>
      </TableScreen>
    </NoticeProvider>
  )
}
