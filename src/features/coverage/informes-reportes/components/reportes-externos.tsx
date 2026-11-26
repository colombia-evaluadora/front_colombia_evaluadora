"use no memo"

import { useState, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { FileDownloadOutlinedIcon, InfoIcon, SpinnerIcon, WarningCircleIcon, XIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaInformesReportesRoute } from "@/router"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { usePeriodosInformeQuery, type PeriodoInforme } from "@/features/coverage/informes-reportes/api/informes"
import {
  descargarGenerado,
  useFaltantesQuery,
  useGeneradosQuery,
  useGenerarExterno,
  usePuedeGenerarExterno,
  useVersionesExternasQuery,
  type AvisoFaltantes,
  type Generado,
  type GenerarExternoInput,
  type VersionExterna,
} from "@/features/coverage/informes-reportes/api/reportes-externos"

const fecha = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—")
const FORMATO = { EXCEL: "Excel", CSV: "CSV", TEXTO: "Texto plano" } as const
const unicos = (xs: string[]) => [...new Set(xs.filter(Boolean))]

/** Versiones Activas del SIMAT (el C600 va aparte, sin versión). */
function useVersionesSimat() {
  const { data = [], ...q } = useVersionesExternasQuery()
  return { ...q, data: data.filter((v) => v.codigo === "SIMAT") }
}

/** Versión elegida en el filtro de la lista; sin elegir, la Activa más reciente. */
function useVersionElegida(): VersionExterna | undefined {
  const { versionExterna } = coberturaInformesReportesRoute.useSearch()
  const { data } = useVersionesSimat()
  return data.find((v) => v.reporteId === versionExterna) ?? data[0]
}

function columnas(descargando: number | null, onDescargar: (g: Generado) => void): ColumnDef<Generado>[] {
  const c = (key: keyof Generado, label: string, cell?: (g: Generado) => ReactNode, centro = false): ColumnDef<Generado> => ({
    id: key,
    accessorFn: (g) => g[key],
    meta: { label, className: centro ? "text-center" : undefined },
    header: ({ column }) => <DataTableColumnHeader column={column} title={label} className={centro ? "justify-center" : undefined} />,
    cell: ({ row }) => (cell ? cell(row.original) : ((row.original[key] as ReactNode) ?? "—")),
    enableSorting: false,
  })
  return [
    c("fecha", "Fecha", (g) => <span className="tabular-nums">{fecha(g.fecha)}</span>),
    c("usuario", "Usuario"),
    c("version", "Versión"),
    c("sede", "Alcance", (g) => g.sede ?? "Todo el establecimiento"),
    c("periodo", "Período académico", (g) => (g.corte ? `${g.periodo} · corte ${fecha(g.corte)}` : g.periodo)),
    c("filas", "Filas", (g) => <span className="tabular-nums">{g.filas.toLocaleString("es-CO")}</span>, true),
    c("estado", "Estado", (g) =>
      g.estado === "COMPLETO" ? (
        <Badge variant="soft" color="success" className="text-xs">
          Completo
        </Badge>
      ) : (
        <Badge variant="soft" color="warning" className="text-xs">
          Con datos faltantes
        </Badge>
      ),
    ),
    {
      id: "actions",
      size: 48,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const g = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    aria-label="Descargar"
                    disabled={descargando !== null}
                    onClick={() => onDescargar(g)}
                  />
                }
              >
                {descargando === g.generadoId ? <SpinnerIcon className="animate-spin" /> : <FileDownloadOutlinedIcon />}
              </TooltipTrigger>
              <TooltipContent>Descargar ({FORMATO[g.formato] ?? g.formato})</TooltipContent>
            </Tooltip>
          </div>
        )
      },
    },
  ]
}

/** Filtro Versión de la lista del SIMAT (C.4.EXT.1). */
export function FiltrosSimat() {
  const navigate = coberturaInformesReportesRoute.useNavigate()
  const { data } = useVersionesSimat()
  const elegida = useVersionElegida()
  return (
    <ComboOpciones
      id="rex-version"
      label="Versión"
      size="sm"
      todos=""
      value={elegida ? String(elegida.reporteId) : ""}
      options={data.map((v) => ({ value: String(v.reporteId), label: `${v.version} (Activa)` }))}
      onChange={(v) => navigate({ search: (prev) => ({ ...prev, versionExterna: v ? Number(v) : undefined, page: 0 }), replace: true })}
    />
  )
}

/**
 * SIMAT (Sección 3.9, Regla 70): archivos generados de la versión elegida, con Descargar del archivo
 * guardado tal cual. Genera el Administrador o el Gestor administrativo del establecimiento; el
 * Supervisor territorial consulta y descarga los de sus establecimientos.
 */
export function ReportesExternosInforme({ encabezado }: { encabezado: ReactNode }) {
  const { notify } = useNotify()
  const version = useVersionElegida()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = useGeneradosQuery(version?.reporteId ?? null, { pageIndex, pageSize })
  const [descargando, setDescargando] = useState<number | null>(null)

  async function descargar(g: Generado) {
    setDescargando(g.generadoId)
    const r = await descargarGenerado(g)
    setDescargando(null)
    notify(r.message, { variant: r.status === "error" ? "error" : "success" })
  }

  const { table } = useDataTable({
    columns: columnas(descargando, (g) => void descargar(g)),
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (g) => String(g.generadoId),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-informes-reportes-externos",
  })

  return (
    <TableScreen>
      <TableScreenHeader>{encabezado}</TableScreenHeader>
      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending && Boolean(version)}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage="No hay archivos generados de esta versión. Use Generar reporte para crear el primero."
        />
        {data ? (
          <Pagination
            viewOptions={<DataTableViewOptions table={table} />}
            pageIndex={pageIndex}
            pageCount={data.pageCount}
            canPrev={pageIndex > 0}
            canNext={pageIndex < data.pageCount - 1}
            onPageChange={goToPage}
            totalCount={data.totalCount}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        ) : null}
      </TableScreenBody>
    </TableScreen>
  )
}

/** Botón Generar reporte: Administrador o Gestor administrativo del establecimiento, o el Superadministrador. */
export function GenerarReporteExterno() {
  const puede = usePuedeGenerarExterno()
  const [abierto, setAbierto] = useState(false)
  if (!puede) return null
  return (
    <>
      <Button type="button" variant="fill" color="primary" size="sm" onClick={() => setAbierto(true)}>
        <FileDownloadOutlinedIcon data-icon="inline-start" />
        Generar reporte
      </Button>
      {abierto ? <DialogGenerarExterno onClose={() => setAbierto(false)} /> : null}
    </>
  )
}

/** Un período por nombre (cada sede tiene el suyo): el SSO toma el año en todas las sedes del alcance. */
function periodosUnicos(periodos: PeriodoInforme[], sede: string | null) {
  const vistos = new Map<string, PeriodoInforme>()
  for (const p of periodos) if ((!sede || p.sede === sede) && !vistos.has(p.nombre)) vistos.set(p.nombre, p)
  return [...vistos.values()]
}

/** Generar reporte externo (C.4.EXT.3): versión Activa, alcance y período; el aviso de faltantes sale solo. */
function DialogGenerarExterno({ onClose }: { onClose: () => void }) {
  const { notify } = useNotify()
  const { data: versiones } = useVersionesSimat()
  const elegida = useVersionElegida()
  const { data: periodos = [] } = usePeriodosInformeQuery()
  const generar = useGenerarExterno()
  const [reporte, setReporte] = useState("")
  const [porSede, setPorSede] = useState(false)
  const [sede, setSede] = useState("")
  const [periodo, setPeriodo] = useState("")
  const [detalle, setDetalle] = useState(false)
  const [errorMsg, setErrorMsg] = useState<{ id: number; message: string } | null>(null)

  const reporteId = reporte || (elegida ? String(elegida.reporteId) : "")
  const version = versiones.find((v) => String(v.reporteId) === reporteId)
  const establecimiento = periodos[0]?.establecimiento
  const opcionesPeriodo = periodosUnicos(periodos, porSede ? sede || null : null)
  const input: GenerarExternoInput | null =
    reporteId && periodo && (!porSede || sede)
      ? { reporte: Number(reporteId), periodo: Number(periodo), sede: porSede ? sede : null, corte: null }
      : null
  const { data: aviso, isFetching: revisando } = useFaltantesQuery(input)

  function confirmar() {
    if (!input) return
    setErrorMsg(null)
    generar.mutate(input, {
      onSuccess: () => {
        notify(
          aviso?.faltantes
            ? "Se generó el reporte con datos faltantes. Corrija los datos y vuelva a generarlo; el archivo anterior queda en el historial."
            : "Se generó el reporte externo.",
          { variant: "success" },
        )
        onClose()
      },
      onError: (e) => setErrorMsg({ id: Date.now(), message: getErrorMessage(e) }),
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !generar.isPending && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Generar reporte externo{establecimiento ? ` — ${establecimiento}` : ""}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={errorMsg} onClose={() => setErrorMsg(null)} variant="error" />
        <ComboOpciones
          id="rex-reporte"
          label="Reporte"
          required
          todos=""
          value={reporteId}
          options={versiones.map((v) => ({ value: String(v.reporteId), label: `${v.codigo} · versión ${v.version}` }))}
          onChange={setReporte}
          description={version ? `Formato del archivo: ${FORMATO[version.formato] ?? version.formato}.` : undefined}
        />
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
          <Field variant="outlined" className="gap-1.5">
            <FieldLabel>
              Alcance<span data-required-mark="">*</span>
            </FieldLabel>
            <RadioGroup value={porSede ? "SEDE" : "EE"} onValueChange={(v) => setPorSede(v === "SEDE")} className="flex h-9 items-center gap-x-5">
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="EE" />
                Todo el establecimiento
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="SEDE" />
                Sede
              </label>
            </RadioGroup>
          </Field>
          <ComboOpciones
            id="rex-sede"
            label="Sede"
            todos=""
            disabled={!porSede}
            value={porSede ? sede : ""}
            options={unicos(periodos.map((p) => p.sede)).map((s) => ({ value: s, label: s }))}
            onChange={(v) => {
              setSede(v)
              setPeriodo("")
            }}
          />
        </div>
        <ComboOpciones
          id="rex-periodo"
          label="Período Académico o fecha de corte"
          required
          todos=""
          value={periodo}
          options={opcionesPeriodo.map((p) => ({ value: String(p.id), label: p.nombre }))}
          onChange={setPeriodo}
        />
        {revisando ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <SpinnerIcon className="animate-spin" /> Revisando los datos obligatorios…
          </p>
        ) : aviso ? (
          <AvisoFaltantesCaja aviso={aviso} onDetalle={() => setDetalle(true)} />
        ) : null}
        {aviso?.sensiblesVacias ? (
          <div className="flex items-center gap-2 rounded-md border border-blue-stroke bg-blue-22 px-3 py-2 text-sm">
            <InfoIcon className="size-4 shrink-0 text-blue" />
            Las columnas con información sensible que usted no puede ver saldrán vacías.
          </div>
        ) : null}
        <DialogFooter className="items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            Los campos marcados con <span className="text-red">*</span> son obligatorios
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" color="neutral" onClick={onClose} disabled={generar.isPending}>
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
            <Button type="button" variant="fill" color="primary" disabled={!input || !aviso || revisando || generar.isPending} onClick={confirmar}>
              {generar.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FileDownloadOutlinedIcon data-icon="inline-start" />}
              Generar
            </Button>
          </div>
        </DialogFooter>
        {detalle && aviso && version ? (
          <DialogDetalleFaltantes aviso={aviso} titulo={`${version.codigo} · ${version.version}`} onClose={() => setDetalle(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/** «Faltan N datos obligatorios en M filas.» con Ver detalle (C.4.EXT.3). */
function AvisoFaltantesCaja({ aviso, onDetalle }: { aviso: AvisoFaltantes; onDetalle: () => void }) {
  if (!aviso.faltantes) {
    return (
      <div className="rounded-md border border-green-stroke bg-green-22 px-3 py-2 text-sm">
        Todos los datos obligatorios están completos ({aviso.totalFilas.toLocaleString("es-CO")} filas).
      </div>
    )
  }
  return (
    <div className="flex gap-3 rounded-md border border-yellow-stroke bg-yellow-22 p-4 text-sm">
      <WarningCircleIcon className="mt-0.5 size-5 shrink-0 text-yellow" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium">
            Faltan {aviso.faltantes.toLocaleString("es-CO")} datos obligatorios en {aviso.filasConFaltantes.toLocaleString("es-CO")} filas.
          </span>
          <Button type="button" variant="outline" color="neutral" size="sm" onClick={onDetalle}>
            Ver detalle
          </Button>
        </div>
        <span>Puede generar igual: el archivo quedará marcado Con datos faltantes.</span>
      </div>
    </div>
  )
}

/** Ver detalle (C.4.EXT.4): fila del archivo, sede, dato que falta y dónde se corrige. */
function DialogDetalleFaltantes({ aviso, titulo, onClose }: { aviso: AvisoFaltantes; titulo: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Datos obligatorios faltantes — {titulo}</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-left">
              <tr>
                <th className="px-3 py-2 text-right font-medium">Fila</th>
                <th className="px-3 py-2 font-medium">Sede</th>
                <th className="px-3 py-2 font-medium">Dato que falta</th>
                <th className="px-3 py-2 font-medium">Dónde se corrige</th>
              </tr>
            </thead>
            <tbody>
              {aviso.detalle.map((f, i) => (
                <tr key={`${f.fila}-${f.columna}-${i}`} className="border-t">
                  <td className="px-3 py-2 text-right tabular-nums">{f.fila}</td>
                  <td className="px-3 py-2">{f.sede ?? "—"}</td>
                  <td className="px-3 py-2">{f.columna}</td>
                  <td className="px-3 py-2">{f.donde ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {aviso.detalle.length < aviso.faltantes ? (
          <p className="text-xs text-muted-foreground">
            Se muestran los primeros {aviso.detalle.length} de {aviso.faltantes.toLocaleString("es-CO")} datos faltantes.
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="fill" color="primary" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
