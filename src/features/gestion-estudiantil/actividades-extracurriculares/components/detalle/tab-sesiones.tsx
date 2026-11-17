"use no memo"

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/api-client"
import { fetchArchivoViewUrl } from "@/lib/files"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useSesionesQuery } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-actividades-query"
import type { SesionRow } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { formatHoras } from "@/features/gestion-estudiantil/actividades-extracurriculares/utils/formatos-actividad"

const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

interface Opciones {
  conSoporte: boolean
  onSoporte: (archivo: number) => void
  onVer: (sesion: number) => void
}

/** Columnas de Sesiones (G.5.ACT.SES): Fecha · Duración (horas) · Asistentes · Soporte (solo con entidad externa) · Observación. */
function columnas({ conSoporte, onSoporte, onVer }: Opciones): ColumnDef<SesionRow>[] {
  const cols: ColumnDef<SesionRow>[] = [
    {
      ...columna("fecha", "Fecha"),
      accessorFn: (f) => formatFecha(f.fecha),
      cell: ({ row }) => (
        <Button variant="link" size="sm" onClick={() => onVer(row.original.id)}>
          {formatFecha(row.original.fecha)}
        </Button>
      ),
    },
    { ...columna("duracion", "Duración (horas)"), accessorFn: (f) => formatHoras(f.duracion_horas) },
    { ...columna("asistentes", "Asistentes"), accessorFn: (f) => `${f.asistentes} de ${f.inscritos}` },
  ]
  if (conSoporte)
    cols.push({
      ...columna("soporte", "Soporte"),
      accessorFn: (f) => f.soporte_nombre ?? "",
      cell: ({ row }) =>
        row.original.fk_tarchivo_soporte != null ? (
          <Button variant="link" size="sm" onClick={() => onSoporte(row.original.fk_tarchivo_soporte!)}>
            {row.original.soporte_nombre ?? "Soporte"}
          </Button>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    })
  cols.push({
    ...columna("observacion", "Observación"),
    accessorFn: (f) => f.observacion ?? "",
    cell: ({ row }) => <span className="whitespace-normal">{row.original.observacion || "—"}</span>,
  })
  return cols
}

/** Pestaña Sesiones (G.5.ACT.SES.1). Solo existe si la actividad registra asistencia. */
export function TabSesiones({
  actividadId,
  conSoporte,
  onVer,
}: {
  actividadId: number
  conSoporte: boolean
  onVer: (sesion: number) => void
}) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const [errorSoporte, setErrorSoporte] = useState<string | null>(null)
  const query = useSesionesQuery(actividadId, { pageIndex, pageSize })

  const cols = useMemo(
    () =>
      columnas({
        conSoporte,
        onVer,
        // El soporte se abre con un token de vista corto de file-service.
        onSoporte: (archivo) => {
          setErrorSoporte(null)
          fetchArchivoViewUrl(archivo)
            .then((t) => window.open(t.url, "_blank", "noopener"))
            .catch((e) => setErrorSoporte(getErrorMessage(e)))
        },
      }),
    [conSoporte, onVer],
  )
  const { table } = useDataTable({
    columns: cols,
    data: query.data?.rows ?? [],
    pageCount: query.data?.pageCount ?? 1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "actividad-sesiones-column-visibility",
  })
  const total = query.data?.totalCount ?? 0

  return (
    <div className="flex flex-col gap-3">
      {errorSoporte && <p className="text-sm text-red">{errorSoporte}</p>}
      <DataTable
        table={table}
        isPending={query.isPending}
        isError={query.isError}
        onRetry={query.refetch}
        emptyMessage="La actividad aún no tiene sesiones."
        errorMessage={query.error ? getErrorMessage(query.error) : undefined}
      />
      <Pagination
        pageIndex={pageIndex}
        pageCount={query.data?.pageCount ?? 1}
        canPrev={pageIndex > 0}
        canNext={pageIndex < (query.data?.pageCount ?? 1) - 1}
        onPageChange={goToPage}
        totalCount={total}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        viewOptions={<DataTableViewOptions table={table} />}
      />
    </div>
  )
}
