"use no memo"

import { useState, type ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { Pagination } from "@/components/pagination"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { toSelectItemsMap } from "@/lib/catalog-options"
import { establishmentsRoute } from "@/router"

import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"
import { useOrientacionesRecibidasQuery } from "@/features/establishment/institution/api/query/use-orientaciones-recibidas"
import type { OrientacionRecibida } from "@/features/establishment/institution/api/types/orientacion"
import { createOrientacionesColumns } from "@/features/establishment/institution/components/orientaciones/columns-orientaciones"
import { DialogDetalleOrientacion } from "@/features/establishment/institution/components/orientaciones/dialog-detalle-orientacion"
import { DialogResponderOrientacion } from "@/features/establishment/institution/components/orientaciones/dialog-responder-orientacion"
import { SearchOrientaciones } from "@/features/establishment/institution/components/orientaciones/search-orientaciones"
import type { AccesoOrientaciones } from "@/features/establishment/institution/hooks/use-acceso-orientaciones"
import { useOrientacionesFilters } from "@/features/establishment/institution/hooks/use-orientaciones-filters"

interface OrientacionesTabProps {
  /** Título y pestañas de la vista: los pone la página. */
  encabezado: ReactNode
  acceso: AccesoOrientaciones
}

/**
 * Pestaña Orientaciones de la vista Establecimientos (E.1.ORI.1; informe, 2.3): lo que la entidad
 * territorial le envió al establecimiento. Solo se recibe y responde: no hay botón para crear.
 */
export function OrientacionesTab({ encabezado, acceso }: OrientacionesTabProps) {
  const search = establishmentsRoute.useSearch()
  const navigate = establishmentsRoute.useNavigate()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { filters, applyFilters, clearAllFilters, activeFilterCount } = useOrientacionesFilters()
  const [porResponder, setPorResponder] = useState<OrientacionRecibida | null>(null)

  // El Superadministrador consulta eligiendo el establecimiento; los demás ven los suyos.
  const { data: establecimientos = [] } = useEstablishmentsOptionsQuery(acceso.esSuperAdmin)
  const establecimientoId = acceso.esSuperAdmin ? search.oEstablecimiento : undefined
  const falteElegir = acceso.esSuperAdmin && establecimientoId == null

  const { data, isPending, isError, error, refetch } = useOrientacionesRecibidasQuery(
    {
      establecimientoId,
      search: filters.search || undefined,
      estado: filters.estados[0],
      temaId: filters.temas[0] ? Number(filters.temas[0]) : undefined,
      sortBy: sorting[0]?.id,
      sortDesc: sorting[0]?.desc,
      pageIndex,
      pageSize,
    },
    !falteElegir,
  )

  const verDetalle = (id: number | undefined) =>
    navigate({ search: (prev) => ({ ...prev, orientacion: id }), replace: true })

  const columns = createOrientacionesColumns({
    onVer: (o) => verDetalle(o.id),
    onResponder: setPorResponder,
    puedeResponder: acceso.puedeResponder,
  })

  const { table } = useDataTable({
    columns,
    data: falteElegir ? [] : (data?.rows ?? []),
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-orientaciones-recibidas-column-visibility",
  })

  const establecimientoItems = establecimientos.map((e) => ({ value: String(e.id), label: e.name }))

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado}
        <TableScreenToolbar>
          {acceso.esSuperAdmin ? (
            <Field orientation="vertical" variant="outlined" className="w-full max-w-xs gap-2">
              <FieldLabel htmlFor="orientaciones-establecimiento">Establecimiento</FieldLabel>
              <ComboboxField
                items={toSelectItemsMap(establecimientoItems)}
                value={establecimientoId != null ? String(establecimientoId) : ""}
                onValueChange={(value) =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      oEstablecimiento: value ? Number(value) : undefined,
                      page: 0,
                    }),
                    replace: true,
                  })
                }
              >
                <ComboboxFieldTrigger
                  id="orientaciones-establecimiento"
                  size="sm"
                  className="w-full"
                >
                  <ComboboxFieldValue placeholder="Seleccione" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  {establecimientoItems.map((item) => (
                    <ComboboxFieldItem key={item.value} value={item.value} title={item.label}>
                      {item.label}
                    </ComboboxFieldItem>
                  ))}
                </ComboboxFieldContent>
              </ComboboxField>
            </Field>
          ) : null}
          <SearchOrientaciones
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
          />
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={!falteElegir && isPending}
          isError={!falteElegir && isError}
          onRetry={refetch}
          emptyMessage={
            falteElegir
              ? "Elija un establecimiento para consultar sus orientaciones."
              : activeFilterCount > 0
                ? "Ninguna orientación coincide con la búsqueda y los filtros aplicados."
                : "Aún no ha recibido orientaciones."
          }
          errorMessage={error ? getErrorMessage(error) : undefined}
        />

        {data && !falteElegir ? (
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

      <DialogDetalleOrientacion
        id={search.orientacion}
        onClose={() => verDetalle(undefined)}
        puedeResponder={acceso.puedeResponder}
        onResponder={(o) => {
          verDetalle(undefined)
          setPorResponder(o)
        }}
      />
      <DialogResponderOrientacion
        orientacion={porResponder}
        onClose={() => setPorResponder(null)}
      />
    </TableScreen>
  )
}
