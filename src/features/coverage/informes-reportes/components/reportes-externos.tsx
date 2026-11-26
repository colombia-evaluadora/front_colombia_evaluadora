"use no memo"

import { useState, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { MarcoOpciones } from "@/components/marco-opciones"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { FileDownloadOutlinedIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaInformesReportesRoute } from "@/router"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { usePeriodosInformeQuery } from "@/features/coverage/informes-reportes/api/informes"
import {
  CODIGO_EXTERNO,
  descargarGenerado,
  useFaltantesExterno,
  useGeneradosQuery,
  useGenerarExterno,
  useVersionesExternasQuery,
  type AvisoFaltantes,
  type Generado,
  type GenerarExternoInput,
} from "@/features/coverage/informes-reportes/api/reportes-externos"

const fecha = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—")
const FORMATO = { EXCEL: "Excel", CSV: "CSV", TEXTO: "Texto plano" } as const

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
    c("fecha", "Fecha", (g) => <span className="tabular-nums">{fecha(g.fecha)}</span>, true),
    c("usuario", "Usuario"),
    c("reporte", "Reporte", (g) => <span className="font-medium">{g.reporte}</span>),
    c("version", "Versión", (g) => (
      <span className="flex flex-wrap items-center gap-1">
        {g.version}
        {g.provisional ? (
          <Badge variant="soft" color="warning" className="text-xs">
            Provisional
          </Badge>
        ) : null}
      </span>
    )),
    c("sede", "Alcance", (g) => g.sede ?? `Todo ${g.establecimiento}`),
    c("periodo", "Período académico", (g) => (g.corte ? `${g.periodo} · corte ${fecha(g.corte)}` : g.periodo)),
    c("filas", "Filas", (g) => <span className="tabular-nums">{g.filas}</span>, true),
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

/**
 * Reportes externos (Sección 3.9, Regla 70): archivos generados del DANE C600 y del SIMAT, con
 * Descargar del archivo guardado tal cual. Genera el Administrador o el Gestor administrativo del
 * establecimiento; el Supervisor territorial consulta y descarga los de sus establecimientos.
 */
export function ReportesExternosInforme({ encabezado }: { encabezado: ReactNode }) {
  const { notify } = useNotify()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = useGeneradosQuery({ pageIndex, pageSize })
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
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage="No hay reportes externos generados. Use Generar reporte para crear el primero."
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

/** Roles que generan (Regla 70); el gate del SSO decide igual. Los demás consultan y descargan. */
const GENERAN = ["CEVAL-RECTOR", "CEVAL-AUXILIAR_ADMINISTRATIVO"]

/** Botón Generar reporte: Administrador o Gestor administrativo del establecimiento, o el Superadministrador. */
export function GenerarReporteExterno() {
  const user = useAuth().user
  const [abierto, setAbierto] = useState(false)
  if (!user?.isSuperAdmin && !user?.roles?.some((r) => GENERAN.includes(r))) return null
  return (
    <>
      <Button type="button" variant="fill" color="primary" size="sm" onClick={() => setAbierto(true)}>
        Generar reporte
      </Button>
      {abierto ? <DialogGenerarExterno onClose={() => setAbierto(false)} /> : null}
    </>
  )
}

/** Modal Generar reporte externo: versión Activa, período, alcance y corte; aviso de faltantes antes de generar. */
function DialogGenerarExterno({ onClose }: { onClose: () => void }) {
  const { informe } = coberturaInformesReportesRoute.useSearch()
  const { notify } = useNotify()
  const { data: versiones = [] } = useVersionesExternasQuery()
  const { data: periodos = [] } = usePeriodosInformeQuery()
  const faltantes = useFaltantesExterno()
  const generar = useGenerarExterno()
  const codigo = informe === "simat" || informe === "c600" ? CODIGO_EXTERNO[informe] : null
  const sugerida = versiones.find((v) => v.codigo === codigo) ?? versiones[0]
  const [reporte, setReporte] = useState("")
  const [periodo, setPeriodo] = useState("")
  const [soloSede, setSoloSede] = useState(false)
  const [corte, setCorte] = useState("")
  const [aviso, setAviso] = useState<AvisoFaltantes | null>(null)
  const [detalle, setDetalle] = useState(false)
  const [errorMsg, setErrorMsg] = useState<{ id: number; message: string } | null>(null)

  const reporteId = reporte || (sugerida ? String(sugerida.reporteId) : "")
  const version = versiones.find((v) => String(v.reporteId) === reporteId)
  const input: GenerarExternoInput | null =
    reporteId && periodo ? { reporte: Number(reporteId), periodo: Number(periodo), soloSede, corte: corte || null } : null
  const ocupado = faltantes.isPending || generar.isPending

  // Cambiar un dato invalida el aviso: hay que revisarlo de nuevo antes de generar.
  const cambiar = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setAviso(null)
    setDetalle(false)
  }

  function revisar() {
    if (!input) return
    setErrorMsg(null)
    faltantes.mutate(input, { onSuccess: setAviso, onError: (e) => setErrorMsg({ id: Date.now(), message: getErrorMessage(e) }) })
  }

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
    <Dialog open onOpenChange={(o) => !o && !ocupado && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generar reporte externo</DialogTitle>
          <DialogDescription>El archivo sale en el formato de la versión elegida y se carga en el sistema externo.</DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={errorMsg} onClose={() => setErrorMsg(null)} variant="error" />
        <ComboOpciones
          id="rex-reporte"
          label="Reporte"
          required
          value={reporteId}
          options={versiones.map((v) => ({ value: String(v.reporteId), label: `${v.nombre} · versión ${v.version}` }))}
          onChange={cambiar(setReporte)}
          description={version ? `Formato del archivo: ${FORMATO[version.formato] ?? version.formato}.` : undefined}
        />
        {version?.provisional ? (
          <p className="text-xs text-muted-foreground">
            Versión provisional: la estructura vigente del Ministerio está pendiente y se configurará en Configuración de Reportes.
          </p>
        ) : null}
        <ComboOpciones
          id="rex-periodo"
          label="Período académico"
          required
          value={periodo}
          options={periodos.map((p) => ({ value: String(p.id), label: `${p.nombre} · ${p.sede} · ${p.jornada}` }))}
          onChange={cambiar(setPeriodo)}
        />
        <MarcoOpciones id="rex-alcance" label="Alcance" required>
          <RadioGroup value={soloSede ? "SEDE" : "EE"} onValueChange={(v) => cambiar(setSoloSede)(v === "SEDE")} className="flex flex-wrap gap-x-5">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="EE" />
              Todo el establecimiento
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="SEDE" />
              Solo la sede del período
            </label>
          </RadioGroup>
        </MarcoOpciones>
        <Field variant="outlined" className="gap-1.5">
          <FieldLabel htmlFor="rex-corte">Fecha de corte</FieldLabel>
          <Input id="rex-corte" type="date" variant="outlined" value={corte} onChange={(e) => cambiar(setCorte)(e.target.value)} />
          <FieldDescription>Opcional: solo las matrículas registradas hasta ese día.</FieldDescription>
        </Field>
        {aviso ? <Aviso aviso={aviso} detalle={detalle} onDetalle={() => setDetalle((d) => !d)} /> : null}
        <DialogFooter>
          <Button type="button" variant="outline" color="neutral" onClick={onClose} disabled={ocupado}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          {aviso ? (
            <Button type="button" variant="fill" color="primary" disabled={ocupado} onClick={confirmar}>
              {generar.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : null}
              {aviso.faltantes ? "Generar igual" : "Generar"}
            </Button>
          ) : (
            <Button type="button" variant="fill" color="primary" disabled={!input || ocupado} onClick={revisar}>
              {faltantes.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : null}
              Revisar datos
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** «Faltan N datos obligatorios en M filas.» con Ver detalle: cada fila, el dato y dónde se corrige. */
function Aviso({ aviso, detalle, onDetalle }: { aviso: AvisoFaltantes; detalle: boolean; onDetalle: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
      {aviso.faltantes ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-red">
            Faltan {aviso.faltantes} datos obligatorios en {aviso.filasConFaltantes} filas.
          </span>
          <Button type="button" variant="link" color="primary" size="sm" onClick={onDetalle}>
            {detalle ? "Ocultar detalle" : "Ver detalle"}
          </Button>
        </div>
      ) : (
        <span>
          Todos los datos obligatorios están completos ({aviso.totalFilas} filas).
        </span>
      )}
      {aviso.faltantes ? (
        <span className="text-xs text-muted-foreground">Puede generar igual: el archivo quedará marcado Con datos faltantes.</span>
      ) : null}
      {aviso.sensiblesVacias ? (
        <span className="text-xs text-muted-foreground">Las columnas con información sensible que usted no puede ver saldrán vacías.</span>
      ) : null}
      {detalle && aviso.detalle.length < aviso.faltantes ? (
        <span className="text-xs text-muted-foreground">Se muestran los primeros {aviso.detalle.length} datos faltantes.</span>
      ) : null}
      {detalle && aviso.detalle.length ? (
        <div className="max-h-60 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-background text-left text-muted-foreground">
              <tr>
                <th className="py-1 pr-2 font-medium">Estudiante</th>
                <th className="py-1 pr-2 font-medium">Dato que falta</th>
                <th className="py-1 font-medium">Dónde se corrige</th>
              </tr>
            </thead>
            <tbody>
              {aviso.detalle.map((f, i) => (
                <tr key={`${f.fila}-${f.columna}-${i}`} className="border-t">
                  <td className="py-1 pr-2">{f.estudiante ?? `Fila ${f.fila}`}</td>
                  <td className="py-1 pr-2">{f.columna}</td>
                  <td className="py-1">{f.donde ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
