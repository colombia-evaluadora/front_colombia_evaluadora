"use no memo"

import { useState, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenToolbar } from "@/components/layout/table-screen"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChartLineUpIcon, DotsThreeVerticalIcon, SpinnerIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaPromocionRoute } from "@/router"

import { formatoNota } from "@/features/coverage/promocion-nivelacion/api/formato"
import {
  MENU_PROMOCION,
  useAreasDelAnioQuery,
  useOpcionesPromocionQuery,
  useReprobadosQuery,
} from "@/features/coverage/promocion-nivelacion/api/promocion"
import type { Reprobado } from "@/features/coverage/promocion-nivelacion/api/types"
import { DialogPromover } from "@/features/coverage/promocion-nivelacion/components/dialogs-promocion"
import { BotonExpandir, FiltrosFila } from "@/features/coverage/promocion-nivelacion/components/filtros"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

const num = "block text-right tabular-nums"

function Acciones({ r }: { r: Reprobado }) {
  const { puedeEditar } = useMenuPermission(MENU_PROMOCION)
  const [abierto, setAbierto] = useState(false)
  if (!puedeEditar) return null
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones de ${r.estudiante}`} />}
        >
          <DotsThreeVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuItem onClick={() => setAbierto(true)}>
            <ChartLineUpIcon /> Promover con áreas pendientes
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {abierto ? <DialogPromover reprobados={[r]} onClose={() => setAbierto(false)} /> : null}
    </>
  )
}

/** Al abrir un estudiante: una fila por [Área] con I.H., nota final, resultado e inasistencia. */
function AreasDelAnio({ r }: { r: Reprobado }) {
  const { data, isPending, error } = useAreasDelAnioQuery(r.matriculaId)
  if (isPending)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <SpinnerIcon className="animate-spin" aria-hidden />
        Cargando…
      </div>
    )
  if (!data) return <p className="text-sm text-red">{getErrorMessage(error)}</p>
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-muted-foreground">
        <tr>
          <th className="px-3 py-1.5 font-medium">Asignatura</th>
          <th className="px-3 py-1.5 text-right font-medium">I.H.</th>
          <th className="px-3 py-1.5 text-right font-medium">Nota final</th>
          <th className="px-3 py-1.5 font-medium">Resultado</th>
          <th className="px-3 py-1.5 text-right font-medium">Inasistencia</th>
        </tr>
      </thead>
      <tbody>
        {data.map((a) => (
          <tr key={a.area} className="border-t border-border">
            <td className="px-3 py-1.5">{a.area}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{a.ih}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{formatoNota(a.notaFinal)}</td>
            <td className="px-3 py-1.5">
              <Badge variant="soft" color={a.aprobo ? "success" : "destructive"} className="text-xs font-medium tracking-normal">
                {a.aprobo ? "Aprobó" : "Reprobó"}
              </Badge>
            </td>
            <td className="px-3 py-1.5 text-right tabular-nums">{a.inasistencia} %</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** «2 · MATE, FISI»: cuántas y sus abreviaturas; más de tres se cortan con «…». */
function textoAreas(r: Reprobado) {
  const abrev = r.areasReprobadas.map((a) => a.abreviatura)
  return `${abrev.length} · ${abrev.slice(0, 3).join(", ")}${abrev.length > 3 ? ", …" : ""}`
}

function columnas({
  seleccionable,
  expandidoId,
  onToggle,
}: {
  seleccionable: boolean
  expandidoId: number | null
  onToggle: (id: number) => void
}): ColumnDef<Reprobado>[] {
  const cols: ColumnDef<Reprobado>[] = [
    {
      id: "expand",
      header: () => <span className="sr-only">Ver detalle</span>,
      cell: ({ row }) => (
        <BotonExpandir
          abierto={expandidoId === row.original.matriculaId}
          nombre={row.original.estudiante}
          onClick={() => onToggle(row.original.matriculaId)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    },
  ]
  if (seleccionable)
    cols.push({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Seleccionar página"
          className="translate-y-0.5"
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Seleccionar ${row.original.estudiante}`}
          className="translate-y-0.5"
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    })
  cols.push(
    {
      id: "documento",
      accessorFn: (r) => r.documento,
      meta: { label: "Documento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.documento}</span>,
      enableSorting: false,
    },
    {
      id: "estudiante",
      accessorFn: (r) => r.estudiante,
      meta: { label: "Estudiante" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
      cell: ({ row }) => (
        <button type="button" className="text-left font-medium text-primary hover:underline" onClick={() => onToggle(row.original.matriculaId)}>
          {row.original.estudiante}
        </button>
      ),
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: "grupo",
      accessorFn: (r) => r.grupo,
      meta: { label: "Grupo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grupo" />,
      cell: ({ row }) => row.original.grupo,
      enableSorting: false,
    },
    {
      id: "areas",
      accessorFn: (r) => r.areasReprobadas.length,
      meta: { label: "Áreas reprobadas" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Áreas reprobadas" />,
      cell: ({ row }) => <span title={row.original.areasReprobadas.map((a) => a.nombre).join(", ")}>{textoAreas(row.original)}</span>,
      enableSorting: false,
    },
    {
      id: "rendimiento",
      accessorFn: (r) => r.rendimiento,
      meta: { label: "Rendimiento académico" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rendimiento académico" className="justify-end" />,
      cell: ({ row }) => <span className={`${num} font-semibold`}>{formatoNota(row.original.rendimiento)}</span>,
      enableSorting: false,
    },
    {
      id: "inasistencia",
      accessorFn: (r) => r.mayorInasistencia,
      meta: { label: "Mayor inasistencia" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Mayor inasistencia" className="justify-end" />,
      cell: ({ row }) => <span className={num}>{row.original.mayorInasistencia} %</span>,
      enableSorting: false,
    },
    {
      id: "actions",
      size: 48,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => <Acciones r={row.original} />,
      enableHiding: false,
      enableSorting: false,
    },
  )
  return cols
}

/**
 * Pestaña Reprobados (C.5.REP.1–3; Sección 4.7): matrículas principales Reprobado
 * de grados con grado siguiente, ordenadas por posibilidad de promoción (el orden
 * lo da el back).
 */
export function ReprobadosTab({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaPromocionRoute.useSearch()
  const navigate = coberturaPromocionRoute.useNavigate()
  const { puedeEditar } = useMenuPermission(MENU_PROMOCION)
  const { data: op } = useOpcionesPromocionQuery()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = useReprobadosQuery(search, { pageIndex, pageSize })
  const [expandidoId, setExpandidoId] = useState<number | null>(null)
  const { table, selectedRows, hasSelection, resetSelection } = useDataTable({
    columns: columnas({
      seleccionable: puedeEditar,
      expandidoId,
      onToggle: (id) => setExpandidoId((actual) => (actual === id ? null : id)),
    }),
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (r) => String(r.matriculaId),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-promocion-reprobados",
  })
  const [lote, setLote] = useState(false)

  const setFiltro = (key: string, value: string) =>
    navigate({
      search: (prev) => ({
        ...prev,
        [key]: key === "anio" ? (value ? Number(value) : undefined) : value || undefined,
        // El período depende del año.
        ...(key === "anio" ? { periodo: undefined } : {}),
        page: 0,
      }),
      replace: true,
    })
  const filtros = [
    { key: "sede", label: "Sede", options: op?.sedes ?? [], value: search.sede ?? "", todos: "Todas" },
    { key: "anio", label: "Año", options: (op?.anios ?? []).map((a) => ({ value: String(a), label: String(a) })), value: search.anio ? String(search.anio) : "" },
    { key: "jornada", label: "Jornada", options: op?.jornadas ?? [], value: search.jornada ?? "", todos: "Todas" },
    { key: "periodo", label: "Período", options: (op?.periodos ?? []).filter((p) => !search.anio || p.anio === search.anio), value: search.periodo ?? "" },
    { key: "grado", label: "Grado", options: op?.grados ?? [], value: search.grado ?? "" },
  ]
  const total = data?.totalCount ?? 0

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado}
        <TableScreenToolbar>
          <FiltrosFila id="reprobados" filtros={filtros} onChange={setFiltro} />
          {hasSelection ? (
            <div className="flex w-full flex-wrap items-center gap-3 text-sm">
              <span className="font-medium">
                {selectedRows.length} {selectedRows.length === 1 ? "seleccionado" : "seleccionados"}
              </span>
              <Button type="button" variant="link" color="neutral" size="sm" onClick={resetSelection}>
                Quitar selección
              </Button>
              <Button type="button" variant="outline" color="primary" size="sm" onClick={() => setLote(true)}>
                <ChartLineUpIcon data-icon="inline-start" />
                Promover con áreas pendientes
              </Button>
            </div>
          ) : data ? (
            <p className="w-full text-sm text-muted-foreground">
              {total} {total === 1 ? "reprobado" : "reprobados"}
            </p>
          ) : null}
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage="No hay matrículas Reprobado en grados con grado siguiente para estos filtros."
          renderSubRow={(row) => (expandidoId === row.original.matriculaId ? <AreasDelAnio r={row.original} /> : null)}
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
      {lote ? <DialogPromover reprobados={selectedRows} onClose={() => setLote(false)} onHecho={resetSelection} /> : null}
    </TableScreen>
  )
}
