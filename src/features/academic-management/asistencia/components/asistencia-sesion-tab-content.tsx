"use no memo"

import * as React from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { pendingStatusOf, useOfflineWritable, useOutboxOps } from "@/lib/offline/outbox/hooks"
import { PendingStatusBadge } from "@/features/offline/components/pending-badge"
import { isOutboxEnabled, OutboxRejectedError, QUEUED_MESSAGE } from "@/lib/offline/outbox/engine"
import { CheckCircleFillIcon, CheckIcon, InfoIcon, SpinnerIcon } from "@/components/ui/icons"
import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { getErrorMessage } from "@/lib/api-client"
import { useAsistenciaRosterPorBloquesQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-roster-query"
import { useAsistenciaEditarMutation } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-editar-mutation"
import { useAsistenciaRegistrarMutation } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-registrar-mutation"
import { useTipoAsistenciaCatalogQuery } from "@/features/academic-management/asistencia/api/query/use-tipo-asistencia-catalog-query"
import { buildColumnsAsistenciaManual } from "@/features/academic-management/asistencia/components/table/columns-asistencia-manual"
import type {
  AsistenciaRegistroManual,
  RosterEstudiante,
  TipoAsistencia,
} from "@/features/academic-management/asistencia/api/types/asistencia"
import {
  ASISTIO,
  cambiaRegistro,
  conCambioPendiente,
  formatEncabezadoSesion,
  LLEGO_TARDE,
  nombreSesion,
  registroAutoritativo,
  registrosPorBloque,
  TIPOS_ALTA_NUEVA,
  tipoBase,
  type SesionControl,
  type SesionTab,
} from "@/features/academic-management/asistencia/utils/asistencia-manual"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

export function AsistenciaSesionTabContent({
  sesion,
  fecha,
  controlRef,
}: {
  sesion: SesionTab
  fecha: string
  controlRef: React.RefObject<SesionControl | null>
}) {
  const { notify } = useNotify()
  const { puedeEditar } = useMenuPermission("ASISTENCIAS")
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
      // Sesión formativa: se identifica por actividad, no por asignatura+bloque.
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
  // Fase 2: registrar/corregir se encola sin red (piloto + equipo personal);
  // fuera del piloto sigue siendo solo en línea.
  const soloEnLinea = useOfflineWritable()
  // Estado en la outbox de esta sesión (registrar por bloque) y de sus correcciones (por pk).
  const outboxOps = useOutboxOps()
  const pksSesion = new Set(
    [...rosterOficial.values()].flatMap((rows) => rows.map((r) => r.pk_tasistencia).filter((pk) => pk != null)),
  )
  const pendienteSesion = pendingStatusOf(
    outboxOps,
    (k) =>
      (k.startsWith(`asistencia:sesion:${sesion.fkGrupo}:`) && k.includes(`:${fecha}:`)) ||
      (k.startsWith("asistencia:registro:") && pksSesion.has(Number(k.split(":")[2]))),
  )
  const { data: tipoOptionsCompleto = [] } = useTipoAsistenciaCatalogQuery()
  const tipoOptions = React.useMemo(
    () => tipoOptionsCompleto.filter((opt) => TIPOS_ALTA_NUEVA.includes(opt.value)),
    [tipoOptionsCompleto],
  )

  // El padrón es igual en todo bloque; el estado guardado sí varía y se reemplaza por fila.
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
  // Sin ediciones locales: si el padrón cambia (caché vieja que se refresca,
  // aprobación, sync) se vuelve a precargar con lo del servidor.
  const sinEdicionesLocales =
    Object.keys(soporte).length === 0 &&
    Object.keys(soporteEliminado).length === 0 &&
    Object.keys(seleccion).length === Object.keys(baseline.current).length &&
    Object.entries(seleccion).every(([fk, tipo]) => baseline.current[Number(fk)] === tipo) &&
    Object.entries(bloqueTarde).every(([fk, b]) => bloqueTardeBaseline.current[Number(fk)] === b)
  // Firma por contenido: `autoritativos` cambia de referencia en cada render.
  const firmaServidor = [...autoritativos]
    .map(([fk, { bloque, row }]) => `${fk}:${row.tipo_asistencia_valor}:${bloque}`)
    .join(",")
  const ultimaFirma = React.useRef(firmaServidor)
  React.useEffect(() => {
    if (isPending) return
    const cambioServidor = ultimaFirma.current !== firmaServidor
    ultimaFirma.current = firmaServidor
    if (precargado.current && !(cambioServidor && sinEdicionesLocales)) return
    const inicialSeleccion: Record<number, TipoAsistencia> = {}
    const inicialBloqueTarde: Record<number, number> = {}
    for (const [fkMatricula, { bloque, row }] of autoritativos) {
      if (row.tipo_asistencia_valor == null) continue
      const base = tipoBase(row.tipo_asistencia_valor)
      inicialSeleccion[fkMatricula] = base
      // Sin bloque real no hay bloque de llegada que preseleccionar.
      if (base === LLEGO_TARDE && bloque !== null) {
        inicialBloqueTarde[fkMatricula] = bloque
      }
    }
    baseline.current = inicialSeleccion
    bloqueTardeBaseline.current = inicialBloqueTarde
    setSeleccion(inicialSeleccion)
    setBloqueTarde(inicialBloqueTarde)
    precargado.current = true
  }, [isPending, autoritativos, firmaServidor, sinEdicionesLocales])
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
        soloLectura: !puedeEditar,
      }),
    [
      puedeEditar,
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
    // Cambiar solo el bloque de llegada también cuenta.
    Object.keys(seleccionLista).some((fk) => bloqueTarde[Number(fk)] !== bloqueTardeBaseline.current[Number(fk)]) ||
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
    // Regla 75: `registrar` hace upsert sin aprobación, así que lo existente se corrige por PATCH.
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
    const encolados: number[] = []
    // CAS por estudiante (BE-5): solo con la outbox habilitada (piloto), para
    // que el conflicto de un cambio hecho sin red no pise en silencio.
    const conVersiones = isOutboxEnabled()
    const versionDePk = (pk: number) =>
      [...rosterPorBloque.values()].flat().find((x) => x.pk_tasistencia === pk)?.version_registro ?? null
    try {
      const [altas, solicitudes] = await Promise.all([
        Promise.all(
          [...nuevos.entries()].map(async ([bloque, registros]) => {
            // Captura tardía en período cerrado: también queda pendiente (Regla 75).
            const { pendientes, queued } = await registrar.mutateAsync({
              GRUPO: sesion.fkGrupo,
              FECHA: fecha,
              REGISTROS: registros,
              ...(conVersiones && {
                versiones: Object.fromEntries(
                  registros.map((r) => [
                    r.fkMatricula,
                    // "NONE" = el docente vio la sesión sin registro de este estudiante.
                    rosterPorBloque.get(bloque)?.find((x) => x.fk_tmatricula === r.fkMatricula)?.version_registro ??
                      "NONE",
                  ]),
                ),
              }),
              ...(sesion.esFormativa
                ? { ACTIVIDAD: sesion.fkActividad ?? undefined }
                : { ASIGNATURA: sesion.fkAsignatura, BLOQUE: bloque }),
            })
            if (queued) encolados.push(...registros.map((r) => r.fkMatricula))
            return pendientes.length > 0 ? registros.map((r) => r.fkMatricula) : []
          }),
        ),
        Promise.all(
          correcciones.map(async ({ fkMatricula, pk, registro }) => {
            const { pendientes, queued } = await editar.mutateAsync({
              pks: [pk],
              ...(conVersiones && { versiones: { [pk]: versionDePk(pk) } }),
              body: {
                TIPO_ASISTENCIA: registro.tipoAsistencia,
                ...(registro.fkArchivo instanceof File && { SOPORTE_ARCHIVO: registro.fkArchivo }),
                ...(soporteEliminado[fkMatricula] && { LIMPIAR_ARCHIVO: true }),
              },
            })
            if (queued) encolados.push(fkMatricula)
            return pendientes.length > 0 ? fkMatricula : null
          }),
        ),
      ])
      const quedaronPendientes = [...altas.flat(), ...solicitudes.filter((fk): fk is number => fk !== null)]
      if (encolados.length > 0) notify(QUEUED_MESSAGE, { variant: "info" })
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
    } catch (error) {
      // Sin espacio o fuera de la ventana de 14 días: el mensaje es del encolado.
      notify(error instanceof OutboxRejectedError ? error.message : "Ocurrió un error al guardar la asistencia.", {
        variant: "error",
      })
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
          <PendingStatusBadge status={pendienteSesion} />
        </div>
        <Button
          type="button"
          variant="outline"
          color="primary"
          size="sm"
          disabled={roster_.length === 0 || !puedeEditar || soloEnLinea.disabled}
          title={soloEnLinea.tooltip ?? undefined}
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
        {mostrarGuardar && puedeEditar && (
          <Button
            type="button"
            color="primary"
            size="sm"
            disabled={registrar.isPending || editar.isPending || soloEnLinea.disabled}
            title={soloEnLinea.tooltip ?? undefined}
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
