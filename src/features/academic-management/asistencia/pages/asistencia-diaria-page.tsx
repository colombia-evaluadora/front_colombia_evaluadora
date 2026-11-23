"use no memo"

import * as React from "react"
import { createPortal } from "react-dom"
import { Link, Navigate, useBlocker } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, queueNotice, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, CheckCircleFillIcon, FloppyDiskIcon, InfoIcon, SpinnerIcon } from "@/components/ui/icons"
import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { getErrorMessage } from "@/lib/api-client"

import { paths } from "@/config/paths"
import { asistenciaDiariaRoute } from "@/router"
import type { AsistenciaSearch } from "@/features/academic-management/asistencia/api/schema"
import type {
  JustificacionLocal,
  RosterEstudiante,
  TipoAsistencia,
} from "@/features/academic-management/asistencia/api/types/asistencia"
import type {
  DiariaPlanillaRow,
  TipoAsistenciaDiaria,
} from "@/features/academic-management/asistencia/api/types/asistencia-diaria"
import {
  useAsistenciaDiariaBloquesQuery,
  useAsistenciaDiariaCalendarioQuery,
  useAsistenciaDiariaGruposQuery,
  useAsistenciaDiariaPlanillaQuery,
} from "@/features/academic-management/asistencia/api/query/use-asistencia-diaria-query"
import {
  useAsistenciaDiariaJustificarMutation,
  useAsistenciaDiariaRegistrarMutation,
  type DiariaRegistroEntrada,
} from "@/features/academic-management/asistencia/api/mutations/use-asistencia-diaria-mutation"
import { esFechaFutura } from "@/features/academic-management/asistencia/api/ui-mappings"
import { buildColumnsAsistenciaManual } from "@/features/academic-management/asistencia/components/table/columns-asistencia-manual"
import {
  DialogSolicitarAprobacion,
  type SolicitudAprobacion,
} from "@/features/academic-management/asistencia/components/dialogs/dialog-solicitar-aprobacion"
import { DialogJustificarAusencia } from "@/features/academic-management/asistencia/components/dialogs/dialog-justificar-ausencia"
import { DialogGuardarCambioSesion } from "@/features/academic-management/asistencia/components/dialogs/dialog-guardar-cambio-sesion"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { ASISTIO, LLEGO_TARDE, NO_ASISTIO } from "@/features/academic-management/asistencia/utils/asistencia-manual"
import { etiquetaGrupo, opcionesBloqueLlegada } from "@/features/academic-management/asistencia/utils/asistencia-diaria"

const NOMBRE_TIPO: Record<number, string> = { 1: "Asistió", 2: "No asistió", 5: "Llegó tarde" }
const fechaCorta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

/** «Martes 02/03/2027». */
function fechaTitulo(fecha: string): string {
  const dia = new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", { weekday: "long" })
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${fechaCorta(fecha)}`
}

/** La fila diaria con la forma que esperan las columnas de la planilla por clase. */
function aRoster(r: DiariaPlanillaRow): RosterEstudiante {
  return {
    ...r,
    fk_testudiante: 0,
    pk_tasistencia: r.pk_tasistencia_diaria,
    // Con una corrección pendiente se ve lo propuesto, como en la planilla por clase.
    tipo_asistencia_valor: (r.pk_tsolicitud_aprobacion != null && r.cambio_tipo_asistencia_valor != null
      ? r.cambio_tipo_asistencia_valor
      : r.tipo_asistencia_valor) as TipoAsistencia | null,
    cambio_tipo_asistencia_valor: r.cambio_tipo_asistencia_valor as TipoAsistencia | null,
    hora_inicio: null,
    hora_fin: null,
  }
}

export function AsistenciaDiariaPage() {
  const { fecha, sede, grupo, desde, periodo } = asistenciaDiariaRoute.useSearch()
  if (!fecha || sede == null || grupo == null) {
    return <Navigate to={paths.app.asistencia.getHref()} search={{ sede, fecha }} replace />
  }
  const volver: AsistenciaSearch =
    desde === "grupo" ? { sede, vista: "grupo", grupo, asignatura: "todas", periodo } : { sede, fecha }
  return (
    <NoticeProvider>
      <PlanillaDiaria fecha={fecha} sede={sede} grupo={grupo} volver={volver} />
    </NoticeProvider>
  )
}

function PlanillaDiaria({
  fecha,
  sede,
  grupo,
  volver,
}: {
  fecha: string
  sede: number
  grupo: number
  volver: AsistenciaSearch
}) {
  const { notify } = useNotify()
  const [anio, mes] = fecha.split("-").map(Number)
  const { data: calendario } = useAsistenciaDiariaCalendarioQuery({ SEDE: sede, ANIO: anio, MES: mes })
  const { data: gruposDiarios } = useAsistenciaDiariaGruposQuery(sede)
  const grupoDiario = gruposDiarios?.find((g) => g.fk_tgrupo === grupo)
  const etiqueta = grupoDiario ? etiquetaGrupo(grupoDiario) : (calendario?.find((d) => d.fkGrupo === grupo)?.etiqueta ?? "")
  const futura = esFechaFutura(fecha)
  const params = futura ? null : { GRUPO: grupo, FECHA: fecha }
  const planilla = useAsistenciaDiariaPlanillaQuery(params)
  const { data: bloques = [] } = useAsistenciaDiariaBloquesQuery(params)
  const opcionesBloque = React.useMemo(() => opcionesBloqueLlegada(bloques), [bloques])
  const filas = React.useMemo(() => planilla.data ?? [], [planilla.data])
  const roster = React.useMemo(() => filas.map(aRoster), [filas])
  const periodoCerrado = filas.some((r) => !r.periodo_calificable)
  const diaRegistrado = filas.some((r) => r.pk_tasistencia_diaria != null)
  const conPendiente = React.useMemo(
    () => new Set(filas.filter((r) => r.pk_tsolicitud_aprobacion != null).map((r) => r.fk_tmatricula)),
    [filas],
  )

  const [seleccion, setSeleccion] = React.useState<Record<number, TipoAsistencia>>({})
  const [bloqueTarde, setBloqueTarde] = React.useState<Record<number, number>>({})
  const [soporte, setSoporte] = React.useState<Record<number, File>>({})
  const [soporteEliminado, setSoporteEliminado] = React.useState<Record<number, boolean>>({})
  const [justificacionLocal, setJustificacionLocal] = React.useState<Record<number, JustificacionLocal>>({})
  const baseline = React.useRef<{ seleccion: Record<number, TipoAsistencia>; bloque: Record<number, number> }>({
    seleccion: {},
    bloque: {},
  })

  // Precarga lo guardado cada vez que llega la planilla del servidor (al abrir y tras guardar).
  React.useEffect(() => {
    if (!planilla.data) return
    const sel: Record<number, TipoAsistencia> = {}
    const blq: Record<number, number> = {}
    for (const r of roster) {
      if (r.tipo_asistencia_valor != null) sel[r.fk_tmatricula] = r.tipo_asistencia_valor
      const fila = planilla.data.find((x) => x.fk_tmatricula === r.fk_tmatricula)
      if (fila?.bloque_llegada != null) blq[r.fk_tmatricula] = fila.bloque_llegada
    }
    baseline.current = { seleccion: sel, bloque: blq }
    // Regla 36: el suspendido abre con No asistió.
    const conSancion = { ...sel }
    for (const r of roster) if (r.sancion) conSancion[r.fk_tmatricula] ??= NO_ASISTIO
    setSeleccion(conSancion)
    setBloqueTarde(blq)
    setSoporte({})
    setSoporteEliminado({})
    setJustificacionLocal({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planilla.data])

  function tieneExcusa(row: RosterEstudiante): boolean {
    const fk = row.fk_tmatricula
    if (soporte[fk]) return true
    if (justificacionLocal[fk]) return Boolean(justificacionLocal[fk].justificacion)
    if (soporteEliminado[fk]) return Boolean(row.justificacion)
    return Boolean(row.soporte_nombre || row.justificacion)
  }

  const hayCambios =
    Object.entries(seleccion).some(([fk, t]) => baseline.current.seleccion[Number(fk)] !== t) ||
    Object.entries(bloqueTarde).some(([fk, b]) => baseline.current.bloque[Number(fk)] !== b) ||
    Object.keys(soporte).length > 0 ||
    Object.keys(soporteEliminado).length > 0 ||
    Object.keys(justificacionLocal).length > 0

  const [justificando, setJustificando] = React.useState<RosterEstudiante | null>(null)
  const justificar = useAsistenciaDiariaJustificarMutation()

  const columns = React.useMemo(
    () =>
      buildColumnsAsistenciaManual({
        seleccion,
        onChange: (fk, tipo) => setSeleccion((prev) => ({ ...prev, [fk]: tipo })),
        soporte,
        onSoporteChange: (fk, archivo) => {
          setSoporte((prev) => {
            const { [fk]: _o, ...resto } = prev
            return archivo ? { ...resto, [fk]: archivo } : resto
          })
          if (archivo) {
            setSoporteEliminado(({ [fk]: _o, ...resto }) => resto)
            setJustificacionLocal(({ [fk]: _o, ...resto }) => resto)
          }
        },
        soporteEliminado,
        onSoporteEliminar: (fk) => {
          setSoporte(({ [fk]: _o, ...resto }) => resto)
          setSoporteEliminado((prev) => ({ ...prev, [fk]: true }))
        },
        bloques: [],
        horasPorBloque: {},
        bloqueTarde,
        onBloqueTardeChange: (fk, b) => setBloqueTarde((prev) => ({ ...prev, [fk]: b })),
        tieneExcusa,
        conPendiente,
        soloLectura: false,
        puedeJustificar: true,
        onJustificar: setJustificando,
        justificacionLocal,
        onSoporteRechazado: (m) => notify(m, { variant: "error" }),
        opcionesBloque,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seleccion, soporte, soporteEliminado, bloqueTarde, conPendiente, justificacionLocal, opcionesBloque],
  )

  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(10)
  const pageCount = Math.max(1, Math.ceil(roster.length / pageSize))
  const rows = roster.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  const { table } = useDataTable({
    columns,
    data: rows,
    pageCount,
    getRowId: (row) => String(row.fk_tmatricula),
    pageIndex,
    pageSize,
    goToPage: setPageIndex,
    setPageSize: (s) => {
      setPageSize(s)
      setPageIndex(0)
    },
    sorting: [],
    setSorting: () => {},
    columnVisibilityStorageKey: "asistencia-diaria-column-visibility",
  })

  const sinMarcar = roster.filter((r) => seleccion[r.fk_tmatricula] == null).length
  const asistieron = roster.filter((r) => [ASISTIO, LLEGO_TARDE].includes(seleccion[r.fk_tmatricula])).length

  function marcarTodos() {
    setSeleccion((prev) => {
      const next = { ...prev }
      for (const r of roster) next[r.fk_tmatricula] ??= r.sancion ? NO_ASISTIO : ASISTIO
      return next
    })
  }

  function descartar() {
    setSeleccion(baseline.current.seleccion)
    setBloqueTarde(baseline.current.bloque)
    setSoporte({})
    setSoporteEliminado({})
    setJustificacionLocal({})
  }

  /** La planilla completa: el back reemplaza cada fila y solo abre solicitud por la que cambia. */
  function armarRegistros(): DiariaRegistroEntrada[] {
    return filas.map((r) => {
      const fk = r.fk_tmatricula
      const tipo = seleccion[fk] as TipoAsistenciaDiaria
      const conExcusa = tipo === NO_ASISTIO || tipo === LLEGO_TARDE
      const local = justificacionLocal[fk]
      const justificado = local ? Boolean(local.justificacion) : Boolean(r.justificacion) && !soporte[fk]
      const fkArchivo =
        !conExcusa || (local?.justificacion ?? null)
          ? null
          : (soporte[fk] ?? (soporteEliminado[fk] ? null : r.fk_soporte_archivo))
      return {
        fkMatricula: fk,
        tipoAsistencia: tipo,
        bloqueLlegada:
          tipo === LLEGO_TARDE && fkArchivo == null && !justificado ? (bloqueTarde[fk] ?? null) : null,
        observacion: r.observacion,
        fkArchivo,
        ...(local && conExcusa && { justificacion: local.justificacion, fkFuenteJustificacion: local.fuente }),
      }
    })
  }

  const registrar = useAsistenciaDiariaRegistrarMutation()
  const [solicitud, setSolicitud] = React.useState<SolicitudAprobacion | null>(null)

  async function guardar(motivo?: string, alSalir = false): Promise<boolean> {
    if (!hayCambios) return true
    if (sinMarcar > 0) {
      notify(
        sinMarcar === 1
          ? "Falta marcar la asistencia de 1 estudiante. La planilla se guarda completa."
          : `Falta marcar la asistencia de ${sinMarcar} estudiantes. La planilla se guarda completa.`,
        { variant: "error" },
      )
      return false
    }
    // Regla 77: con el período No calificable se pide el motivo antes de enviar a aprobación.
    if (periodoCerrado && motivo === undefined) {
      setSolicitud(
        diaRegistrado
          ? {
              tipo: "correccion",
              fecha: fechaCorta(fecha),
              cambios: filas
                .filter((r) => baseline.current.seleccion[r.fk_tmatricula] !== seleccion[r.fk_tmatricula])
                .map((r) => ({
                  estudiante: r.estudiante,
                  antes: NOMBRE_TIPO[baseline.current.seleccion[r.fk_tmatricula]] ?? "Sin marca",
                  despues: NOMBRE_TIPO[seleccion[r.fk_tmatricula]] ?? "",
                })),
            }
          : { tipo: "pendiente", fecha: fechaCorta(fecha), sesion: `${etiqueta} · Asistencia diaria` },
      )
      return false
    }
    try {
      const r = await registrar.mutateAsync({
        GRUPO: grupo,
        FECHA: fecha,
        REGISTROS: armarRegistros(),
        ...(motivo && { MOTIVO: motivo }),
      })
      // Al salir la pantalla se desmonta: el aviso se encola para el calendario.
      const avisar = alSalir ? queueNotice : notify
      avisar(
        r.solicitud
          ? "La planilla quedó pendiente de aprobación del Supervisor de sede. Mientras tanto, sigue vigente lo registrado."
          : `Asistencia diaria guardada. Se marcó No asistido en ${r.actividades_no_asistido} actividades del ${fechaCorta(fecha)}.`,
        { variant: r.solicitud ? "info" : "success" },
      )
      return true
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
      return false
    }
  }

  const salida = useBlocker({
    shouldBlockFn: () => hayCambios,
    enableBeforeUnload: () => hayCambios,
    withResolver: true,
  })
  const soloEnLinea = useOnlineOnly()
  const [accionesSlot, setAccionesSlot] = React.useState<HTMLDivElement | null>(null)
  const guardando = registrar.isPending

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                color="neutral"
                size="sm"
                render={<Link to={paths.app.asistencia.getHref()} search={volver} />}
                nativeButton={false}
              >
                <ArrowLeftIcon data-icon="inline-start" />
                Volver
              </Button>
              <div ref={setAccionesSlot} className="contents" />
            </div>
          }
        >
          {`Asistencias › ${etiqueta ? `${etiqueta} · ` : ""}Asistencia diaria · ${fechaTitulo(fecha)}`}
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        {futura ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Todavía no se puede tomar asistencia: es una fecha futura.
          </p>
        ) : (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                color="primary"
                size="sm"
                disabled={roster.length === 0 || guardando}
                onClick={marcarTodos}
              >
                <CheckCircleFillIcon data-icon="inline-start" />
                Todos asistieron
              </Button>
            </div>

            {periodoCerrado && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-md border border-orange-stroke bg-orange-22 px-4 py-3 text-sm"
              >
                <InfoIcon className="mt-0.5 size-4 shrink-0 text-orange" />
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">El período ya no es calificable.</span> Lo que
                  registre o corrija queda pendiente hasta que el Supervisor de sede lo apruebe.
                </p>
              </div>
            )}

            <DataTable
              table={table}
              isPending={planilla.isPending && params != null}
              isError={planilla.isError}
              onRetry={planilla.refetch}
              emptyMessage="Este grupo no tiene estudiantes."
              errorMessage={planilla.error ? getErrorMessage(planilla.error) : undefined}
              cellClassName="py-2"
            />

            {roster.length > 0 && (
              <Pagination
                pageIndex={pageIndex}
                pageCount={pageCount}
                canPrev={pageIndex > 0}
                canNext={pageIndex < pageCount - 1}
                onPageChange={setPageIndex}
                totalCount={roster.length}
                pageSize={pageSize}
                onPageSizeChange={(s) => {
                  setPageSize(s)
                  setPageIndex(0)
                }}
              />
            )}

            <span className="text-xs text-muted-foreground">
              Asistieron {asistieron} de {roster.length}
              {sinMarcar > 0 && ` · ${sinMarcar} sin marcar`}
            </span>
          </div>
        )}

        <DialogSolicitarAprobacion
          solicitud={solicitud}
          enviando={guardando}
          onCancelar={() => setSolicitud(null)}
          onEnviar={async (m) => {
            if (await guardar(m)) setSolicitud(null)
          }}
        />

        {justificando &&
          (() => {
            const fk = justificando.fk_tmatricula
            const pk = justificando.pk_tasistencia
            // Sobre lo guardado va al servidor; si cambió en pantalla, viaja con la planilla.
            const local =
              pk == null || seleccion[fk] !== baseline.current.seleccion[fk] || Boolean(soporteEliminado[fk])
            const enPantalla = justificacionLocal[fk]
            return (
              <DialogJustificarAusencia
                open
                onOpenChange={(open) => !open && setJustificando(null)}
                estudiante={justificando.estudiante}
                pks={pk != null ? [pk] : []}
                justificacion={enPantalla ? enPantalla.justificacion : (justificando.justificacion ?? null)}
                fuente={enPantalla ? enPantalla.fuente : (justificando.fk_tlv_fuente_justificacion ?? null)}
                onJustificada={(m) => notify(m, { variant: "success" })}
                guardar={
                  local ? undefined : (v) => justificar.mutateAsync({ pk: pk!, justificacion: v.justificacion, fuente: v.fuente })
                }
                onLocal={
                  local
                    ? (valor) => {
                        setJustificacionLocal((prev) => ({ ...prev, [fk]: valor }))
                        if (valor.justificacion) {
                          setSoporte(({ [fk]: _o, ...resto }) => resto)
                          if (justificando.soporte_nombre) setSoporteEliminado((prev) => ({ ...prev, [fk]: true }))
                        }
                      }
                    : undefined
                }
              />
            )
          })()}

        <DialogGuardarCambioSesion
          open={salida.status === "blocked"}
          guardandoCambio={guardando}
          soloEnLineaCambio={soloEnLinea}
          onCancelar={() => salida.reset?.()}
          onDescartar={() => salida.proceed?.()}
          onGuardar={async () => {
            if (await guardar(undefined, true)) salida.proceed?.()
            else salida.reset?.()
          }}
        />

        {accionesSlot &&
          !futura &&
          createPortal(
            <>
              <Button
                type="button"
                variant="outline"
                color="neutral"
                size="sm"
                disabled={guardando || !hayCambios}
                onClick={descartar}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                color="primary"
                size="sm"
                disabled={guardando || !hayCambios || soloEnLinea.disabled}
                aria-busy={guardando}
                onClick={() => void guardar()}
              >
                {guardando ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <FloppyDiskIcon data-icon="inline-start" />
                )}
                Guardar
              </Button>
            </>,
            accionesSlot,
          )}
      </TableScreenBody>
    </TableScreen>
  )
}
