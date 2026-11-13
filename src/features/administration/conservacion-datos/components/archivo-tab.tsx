"use no memo"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { FileDownloadOutlinedIcon, FilePdfIcon, MagnifyingGlassIcon, FunnelXIcon } from "@/components/ui/icons"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SelectCampo } from "@/features/administration/conservacion-datos/components/select-campo"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { toPageCount } from "@/lib/pagination"
import { conservacionDatosRoute } from "@/router"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"

import { useDescargarArchivo } from "@/features/administration/conservacion-datos/api/mutations/conservacion-mutations"
import {
  useArchivoQuery,
  usePoliticasQuery,
} from "@/features/administration/conservacion-datos/api/query/use-conservacion-queries"
import type { ConservacionSearch } from "@/features/administration/conservacion-datos/api/schema"
import { fechaCorta, type Archivado } from "@/features/administration/conservacion-datos/api/types"
import { RowActions } from "@/features/administration/conservacion-datos/components/row-actions"
import { anchoAcciones } from "@/features/administration/conservacion-datos/lib/ancho-acciones"

const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS = Array.from({ length: 15 }, (_, i) => ANIO_ACTUAL - i)

/**
 * S.12.ARC.1: el índice de lo archivado. Solo lectura: no se restaura.
 * Administrador y Gestor ven solo su establecimiento (lo filtra el back).
 */
export function ArchivoTab({ esSuperAdmin }: { esSuperAdmin: boolean }) {
  const { notify } = useNotify()
  const search = conservacionDatosRoute.useSearch()
  const navigate = conservacionDatosRoute.useNavigate()
  const paginacion = useTablePagination()
  const [texto, setTexto] = useState(search.q ?? "")

  const establecimientos = useEstablishmentsOptionsQuery(esSuperAdmin)
  const politicas = usePoliticasQuery()
  const tipos = [...new Set((politicas.data ?? []).map((p) => p.tipoRegistro))].sort((a, b) => a.localeCompare(b, "es"))

  const { data, isPending, isFetching, isError, error, refetch } = useArchivoQuery({
    q: search.q,
    pkEstablecimiento: search.establecimiento,
    tipoRegistro: search.tipo,
    anio: search.anio,
    page: paginacion.pageIndex,
    pageSize: paginacion.pageSize,
  })
  const total = data?.total ?? 0
  const pageCount = toPageCount(total, paginacion.pageSize)

  const filtrar = (cambios: Partial<ConservacionSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...cambios, page: 0 }), replace: true })
  const hayFiltros = Boolean(search.q || search.establecimiento || search.tipo || search.anio)

  const descargar = useDescargarArchivo()
  const bajar = (pkArchivo: number, tipo: "archivo" | "acta") =>
    descargar.mutate({ pkArchivo, tipo }, { onError: (err) => notify(getErrorMessage(err), { variant: "error" }) })

  const columns: ColumnDef<Archivado>[] = [
    {
      id: "estudiante",
      accessorKey: "estudiante",
      meta: { label: "Estudiante" },
      header: "Estudiante",
      cell: ({ row }) => (
        <span className="flex flex-col">
          <span className="font-medium">{row.original.estudiante}</span>
          <span className="text-xs text-muted-foreground">{row.original.documento}</span>
        </span>
      ),
      enableSorting: false,
    },
    { id: "tipoRegistro", accessorKey: "tipoRegistro", meta: { label: "Tipo" }, header: "Tipo", enableSorting: false },
    {
      id: "anio",
      accessorKey: "anio",
      meta: { label: "Año" },
      header: "Año",
      cell: ({ row }) => <span className="tabular-nums">{row.original.anio}</span>,
      enableSorting: false,
      size: 80,
    },
    {
      id: "establecimiento",
      accessorKey: "establecimiento",
      meta: { label: "Establecimiento" },
      header: "Establecimiento",
      enableSorting: false,
    },
    {
      id: "fechaDisposicion",
      accessorKey: "fechaDisposicion",
      meta: { label: "Dispuesto" },
      header: "Dispuesto",
      cell: ({ row }) => <span className="tabular-nums">{fechaCorta(row.original.fechaDisposicion)}</span>,
      enableSorting: false,
      size: 120,
    },
    {
      id: "acta",
      meta: { label: "Acta" },
      header: "Acta",
      cell: ({ row }) => (
        <Button
          variant="link"
          color="primary"
          size="sm"
          className="px-0"
          disabled={descargar.isPending}
          onClick={() => bajar(row.original.pkArchivo, "acta")}
        >
          <FilePdfIcon data-icon="inline-start" />
          PDF
        </Button>
      ),
      enableSorting: false,
      size: 90,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <RowActions
          items={[
            {
              label: "Descargar archivo",
              icon: <FileDownloadOutlinedIcon />,
              disabled: descargar.isPending,
              onClick: () => bajar(row.original.pkArchivo, "archivo"),
            },
            {
              label: "Ver acta",
              icon: <FilePdfIcon />,
              disabled: descargar.isPending,
              onClick: () => bajar(row.original.pkArchivo, "acta"),
            },
          ]}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: anchoAcciones(2),
    },
  ]

  const { table } = useDataTable({
    columns,
    data: data?.filas ?? [],
    pageCount,
    getRowId: (row) => String(row.pkArchivo),
    ...paginacion,
    columnVisibilityStorageKey: "conservacion-archivo-column-visibility",
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <form
          className="w-full max-w-sm"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            filtrar({ q: texto.trim() || undefined })
          }}
        >
          <Field variant="outlined">
            <FieldLabel htmlFor="archivo-buscar">Estudiante</FieldLabel>
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="archivo-buscar"
                className="pl-9"
                placeholder="Nombre o documento"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onBlur={() => texto.trim() !== (search.q ?? "") && filtrar({ q: texto.trim() || undefined })}
              />
            </div>
          </Field>
        </form>
        {esSuperAdmin ? (
          <Filtro
            label="Establecimiento"
            buscable
            className="w-full sm:w-80"
            value={search.establecimiento}
            opciones={(establecimientos.data ?? []).map((e) => ({ value: String(e.id), label: e.name }))}
            onChange={(v) => filtrar({ establecimiento: v ? Number(v) : undefined })}
          />
        ) : null}
        <Filtro
          label="Tipo de registro"
          value={search.tipo}
          opciones={tipos.map((t) => ({ value: t, label: t }))}
          onChange={(v) => filtrar({ tipo: v || undefined })}
        />
        <Filtro
          label="Año"
          value={search.anio}
          opciones={ANIOS.map((a) => ({ value: String(a), label: String(a) }))}
          onChange={(v) => filtrar({ anio: v ? Number(v) : undefined })}
        />
        {hayFiltros ? (
          <Button
            variant="ghost"
            color="primary"
            size="sm"
            onClick={() => {
              setTexto("")
              filtrar({ q: undefined, establecimiento: undefined, tipo: undefined, anio: undefined })
            }}
          >
            <FunnelXIcon data-icon="inline-start" />
            Limpiar filtros
          </Button>
        ) : null}
      </div>

      <DataTable
        table={table}
        isPending={isPending || (isFetching && !data)}
        isError={isError}
        onRetry={refetch}
        errorMessage={error ? getErrorMessage(error) : undefined}
        emptyMessage={
          hayFiltros
            ? "No hay archivos que coincidan con la búsqueda y los filtros aplicados."
            : "Aún no hay registros archivados."
        }
      />
      <Pagination
        viewOptions={<DataTableViewOptions table={table} />}
        pageIndex={paginacion.pageIndex}
        pageCount={pageCount}
        canPrev={paginacion.pageIndex > 0}
        canNext={paginacion.pageIndex < pageCount - 1}
        onPageChange={paginacion.goToPage}
        totalCount={total}
        pageSize={paginacion.pageSize}
        onPageSizeChange={paginacion.setPageSize}
      />
    </div>
  )
}

function Filtro({
  label,
  value,
  opciones,
  onChange,
  buscable,
  className = "w-full sm:w-60",
}: {
  label: string
  value: string | number | undefined
  opciones: { value: string; label: string }[]
  onChange: (value: string) => void
  buscable?: boolean
  className?: string
}) {
  return (
    <SelectCampo
      id={`archivo-${label.toLowerCase().replace(/\s+/g, "-")}`}
      label={label}
      className={className}
      buscable={buscable}
      todos="Todos"
      value={value != null ? String(value) : ""}
      options={opciones}
      onChange={onChange}
    />
  )
}
