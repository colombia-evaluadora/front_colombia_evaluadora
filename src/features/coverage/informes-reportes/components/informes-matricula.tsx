"use no memo"

import { Fragment, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { SpinnerIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaInformesReportesRoute } from "@/router"

import { useInformeMatriculaQuery, useNivelacionesQuery, type FilaInformeMatricula, type Nivelacion } from "@/features/coverage/informes-reportes/api/resumenes"

const num = "px-3 py-2 text-center tabular-nums"
const CONTEOS = ["principales", "complementarias", "adscritos", "total", "extraedad"] as const

/**
 * Informe de matrícula (C.4.MAT.1; Sección 3.9): matriculados por grupo, grado,
 * jornada y sede, separados por tipo, con subtotal por grado. Solo consulta.
 */
export function InformeMatricula({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaInformesReportesRoute.useSearch()
  const { data, isPending, isError, error } = useInformeMatriculaQuery(search)

  const porGrado = new Map<string, FilaInformeMatricula[]>()
  for (const f of data ?? []) porGrado.set(f.grado, [...(porGrado.get(f.grado) ?? []), f])
  const suma = (filas: FilaInformeMatricula[], k: (typeof CONTEOS)[number]) => filas.reduce((t, f) => t + f[k], 0)

  return (
    <TableScreen>
      <TableScreenHeader>{encabezado}</TableScreenHeader>
      <TableScreenBody>
        {isPending ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <SpinnerIcon className="animate-spin" /> Cargando…
          </div>
        ) : isError ? (
          <p className="p-10 text-center text-sm text-red">{getErrorMessage(error)}</p>
        ) : !data?.length ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No hay matrículas para estos filtros.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Grado</th>
                  <th className="px-3 py-2 font-medium">Grupo</th>
                  <th className="px-3 py-2 font-medium">Sede</th>
                  <th className="px-3 py-2 font-medium">Jornada</th>
                  <th className={`${num} font-medium`}>Principales</th>
                  <th className={`${num} font-medium`}>Complementarias propias</th>
                  <th className={`${num} font-medium`}>Adscritos</th>
                  <th className={`${num} font-medium`}>Total</th>
                  <th className={`${num} font-medium`}>Extraedad</th>
                </tr>
              </thead>
              <tbody>
                {[...porGrado.entries()].map(([grado, filas]) => (
                  <Fragment key={grado}>
                    {filas.map((f) => (
                      <tr key={`${f.grupo}-${f.sede}-${f.jornada}`} className="border-t border-border">
                        <td className="px-3 py-2">{f.grado}</td>
                        <td className="px-3 py-2">{f.grupo}</td>
                        <td className="px-3 py-2">{f.sede}</td>
                        <td className="px-3 py-2">{f.jornada}</td>
                        {CONTEOS.map((k) => (
                          <td key={k} className={num}>{f[k]}</td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-t border-border bg-muted/30 font-semibold">
                      <td className="px-3 py-2" colSpan={4}>Total {grado}</td>
                      {CONTEOS.map((k) => (
                        <td key={k} className={num}>{suma(filas, k)}</td>
                      ))}
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}

const columnasNivelaciones: ColumnDef<Nivelacion>[] = [
  {
    id: "estudiante",
    accessorFn: (n) => n.estudiante,
    meta: { label: "Estudiante" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
    cell: ({ row }) => <span className="font-medium">{row.original.estudiante}</span>,
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: "grupo",
    accessorFn: (n) => n.grupo,
    meta: { label: "Grupo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Grupo" />,
    enableSorting: false,
  },
  {
    id: "asignatura",
    accessorFn: (n) => n.asignatura,
    meta: { label: "Asignatura" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Asignatura" />,
    enableSorting: false,
  },
  {
    id: "responsable",
    accessorFn: (n) => n.responsable ?? "",
    meta: { label: "Responsable de enseñanza" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Responsable de enseñanza" />,
    cell: ({ row }) => row.original.responsable || "Sin asignar",
    enableSorting: false,
  },
  {
    id: "periodos",
    accessorFn: (n) => n.periodos,
    meta: { label: "Períodos pendientes" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Períodos pendientes" />,
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.periodos.split(",").map((p) => (
          <Badge key={p} variant="soft" color="warning" className="text-xs">
            {p}
          </Badge>
        ))}
      </div>
    ),
    enableSorting: false,
  },
  {
    id: "motivo",
    accessorFn: (n) => n.motivo,
    meta: { label: "Motivo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Motivo" />,
    enableSorting: false,
  },
]

/**
 * Nivelaciones pendientes (C.4.MAT.2; Secciones 4.1 a 4.5): una fila por
 * estudiante y asignatura con períodos Pendientes por nivelación.
 */
export function InformeNivelaciones({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaInformesReportesRoute.useSearch()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = useNivelacionesQuery(search, { pageIndex, pageSize })
  const { table } = useDataTable({
    columns: columnasNivelaciones,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (n) => `${n.matriculaId}-${n.asignatura}`,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-informes-nivelaciones",
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
          emptyMessage="No hay estudiantes con nivelaciones pendientes para estos filtros."
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
