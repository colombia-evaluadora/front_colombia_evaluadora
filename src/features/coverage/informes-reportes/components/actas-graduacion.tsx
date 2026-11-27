"use no memo"

import { useState, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BookOpenIcon, FilePdfIcon, SpinnerIcon, UsersIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaInformesReportesRoute } from "@/router"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import {
  anioActas,
  useActasGraduacionQuery,
  useGenerarActas,
  useGenerarLibroActas,
  useGraduadosActaQuery,
  type ActaGraduacion,
} from "@/features/coverage/informes-reportes/api/actas-graduacion"

const fecha = (v: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—")
const MODALIDAD = { CEREMONIA: "Ceremonia", VENTANILLA: "Ventanilla" } as const

function Icono({ label, disabled, motivo, onClick, children }: { label: string; disabled?: boolean; motivo?: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span>
            <Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={label} disabled={disabled} onClick={onClick}>
              {children}
            </Button>
          </span>
        }
      />
      <TooltipContent>{disabled && motivo ? `${label}: ${motivo}` : label}</TooltipContent>
    </Tooltip>
  )
}

function columnas(generando: string | null, onGenerar: (a: ActaGraduacion) => void, onVer: (a: ActaGraduacion) => void): ColumnDef<ActaGraduacion>[] {
  const c = (key: keyof ActaGraduacion, label: string, cell?: (a: ActaGraduacion) => ReactNode, centro = false): ColumnDef<ActaGraduacion> => ({
    id: key,
    accessorFn: (a) => a[key],
    meta: { label, className: centro ? "text-center" : undefined },
    header: ({ column }) => <DataTableColumnHeader column={column} title={label} className={centro ? "justify-center" : undefined} />,
    cell: ({ row }) => (cell ? cell(row.original) : ((row.original[key] as ReactNode) ?? "—")),
    enableSorting: false,
  })
  return [
    c("numero", "Acta N.º", (a) => <span className="font-medium tabular-nums">{a.numero}</span>),
    c("fecha", "Fecha", (a) => fecha(a.fecha), true),
    c("modalidad", "Modalidad", (a) => MODALIDAD[a.modalidad] ?? a.modalidad),
    c("libro", "Libro y folio", (a) => <span className="tabular-nums">Libro {a.libro}, folio {a.folio}</span>, true),
    c("graduados", "Graduados", (a) => <span className="tabular-nums">{a.graduados}</span>, true),
    c("emitida", "Copia", (a) =>
      a.emitida ? (
        <Badge variant="soft" color="success" className="text-xs">Generada</Badge>
      ) : (
        <Badge variant="soft" color="warning" className="text-xs">Sin generar</Badge>
      ), true),
    {
      id: "actions",
      size: 48 * 2,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const a = row.original
        const sinGraduados = a.graduados === 0
        return (
          <div className="flex items-center justify-end gap-1">
            <Icono label="Generar acta" disabled={sinGraduados || generando !== null} motivo={sinGraduados ? "el acta no tiene graduados vigentes" : undefined} onClick={() => onGenerar(a)}>
              {generando === a.actaId ? <SpinnerIcon className="animate-spin" /> : <FilePdfIcon />}
            </Icono>
            <Icono label="Ver graduados" onClick={() => onVer(a)}>
              <UsersIcon />
            </Icono>
          </div>
        )
      },
    },
  ]
}

/** Actas de graduación del año (C.4.ACT.1): una por número de acta, con su libro y folio. */
export function ActasGraduacionInforme({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaInformesReportesRoute.useSearch()
  const { notify } = useNotify()
  const anio = anioActas(search.anio)
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = useActasGraduacionQuery(anio, { pageIndex, pageSize })
  const generar = useGenerarActas()
  const [generando, setGenerando] = useState<string | null>(null)
  const [ver, setVer] = useState<ActaGraduacion | null>(null)

  function generarActa(a: ActaGraduacion) {
    setGenerando(a.actaId)
    generar.mutate(
      { ids: [a.actaId] },
      {
        onSuccess: () => notify(`Se generó el acta N.º ${a.numero}.`),
        onError: (err) => notify(getErrorMessage(err), { variant: "error" }),
        onSettled: () => setGenerando(null),
      },
    )
  }

  const { table } = useDataTable({
    columns: columnas(generando, generarActa, setVer),
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (a) => a.actaId,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-informes-actas-graduacion",
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
          emptyMessage={`No hay actas de graduación en ${anio}. Las actas se crean al registrar el grado en Graduación.`}
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
      {ver ? <DialogGraduados acta={ver} onClose={() => setVer(null)} /> : null}
    </TableScreen>
  )
}

/** Año de las actas (C.4.ACT.1); por defecto, el actual. */
export function FiltrosActasGraduacion() {
  const search = coberturaInformesReportesRoute.useSearch()
  const navigate = coberturaInformesReportesRoute.useNavigate()
  const actual = new Date().getFullYear()
  return (
    <ComboOpciones
      id="act-anio"
      label="Año"
      size="sm"
      value={String(anioActas(search.anio))}
      options={[0, 1, 2, 3, 4].map((i) => ({ value: String(actual - i), label: String(actual - i) }))}
      onChange={(v) => navigate({ search: (prev) => ({ ...prev, anio: v ? Number(v) : undefined, page: 0 }), replace: true })}
    />
  )
}

/** Botón del encabezado: libro de actas del año, con índice (C.4.ACT.4). */
export function GenerarLibroActas() {
  const search = coberturaInformesReportesRoute.useSearch()
  const { notify } = useNotify()
  const libro = useGenerarLibroActas()
  const anio = anioActas(search.anio)
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      color="neutral"
      disabled={libro.isPending}
      onClick={() =>
        libro.mutate(
          { anio },
          {
            onSuccess: () => notify(`Se generó el libro de actas de ${anio}.`),
            onError: (err) => notify(getErrorMessage(err), { variant: "error" }),
          },
        )
      }
    >
      {libro.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <BookOpenIcon data-icon="inline-start" />}
      Generar libro de actas
    </Button>
  )
}

function DialogGraduados({ acta, onClose }: { acta: ActaGraduacion; onClose: () => void }) {
  const { data = [], isPending, isError, error } = useGraduadosActaQuery(acta.actaId)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Graduados del acta N.º {acta.numero}</DialogTitle>
          <DialogDescription>
            {fecha(acta.fecha)} · {MODALIDAD[acta.modalidad] ?? acta.modalidad} · Libro {acta.libro}, folio {acta.folio}
          </DialogDescription>
        </DialogHeader>
        {isPending ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Cargando…</p>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">El acta no tiene graduados vigentes.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-center">N.º</th>
                  <th className="px-3 py-2">Graduado</th>
                  <th className="px-3 py-2">Documento</th>
                  <th className="px-3 py-2">Título otorgado</th>
                  <th className="px-3 py-2 text-center">Diploma N.º</th>
                  <th className="px-3 py-2 text-center">Entrega</th>
                </tr>
              </thead>
              <tbody>
                {data.map((g) => (
                  <tr key={g.matriculaId} className="border-t">
                    <td className="px-3 py-2 text-center tabular-nums">{g.n}</td>
                    <td className="px-3 py-2 font-medium">{g.estudiante}</td>
                    <td className="px-3 py-2 tabular-nums">{g.documento}</td>
                    <td className="px-3 py-2">{g.titulo}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{g.diploma ?? "—"}</td>
                    <td className="px-3 py-2 text-center">{fecha(g.entrega)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
