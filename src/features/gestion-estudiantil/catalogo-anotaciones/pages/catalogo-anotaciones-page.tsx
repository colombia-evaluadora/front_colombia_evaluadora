"use no memo"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { selectCategoryQueryOptions } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { useCambiarEstadoCodigo } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/mutations/codigos"
import { useCodigosQuery } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/query/use-codigos-query"
import { FILTROS_VACIOS, type CatalogoFiltros, type CodigoRow } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"
import { DialogCodigo } from "@/features/gestion-estudiantil/catalogo-anotaciones/components/dialogs/dialog-codigo"
import { DialogEliminarCodigo } from "@/features/gestion-estudiantil/catalogo-anotaciones/components/dialogs/dialog-eliminar-codigo"
import { SearchCodigos } from "@/features/gestion-estudiantil/catalogo-anotaciones/components/search/search-codigos"
import { buildColumnsCodigos } from "@/features/gestion-estudiantil/catalogo-anotaciones/components/table/columns-codigos"
import { useEstablecimientoCatalogo } from "@/features/gestion-estudiantil/catalogo-anotaciones/hooks/use-establecimiento-catalogo"

type Modal = { tipo: "nuevo" } | { tipo: "modificar"; codigo: CodigoRow } | { tipo: "eliminar"; codigo: CodigoRow } | null

function CatalogoContent() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { notify } = useNotify()
  const permiso = useMenuPermission("CATALOGO_ANOTACIONES")
  const ee = useEstablecimientoCatalogo()

  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<CatalogoFiltros>(FILTROS_VACIOS)
  const [modal, setModal] = useState<Modal>(null)

  const tiposQ = useQuery(selectCategoryQueryOptions("TIPO_COMPORTAMIENTO"))
  const situacionesQ = useQuery(selectCategoryQueryOptions("TIPO_SITUACION"))
  const tipoRows = tiposQ.data ?? []
  const tipos = tipoRows.map((r) => ({ value: String(r.pk_lista_valor), label: r.nombre }))
  const situaciones = (situacionesQ.data ?? []).map((r) => ({ value: String(r.pk_lista_valor), label: r.nombre }))
  // Por NOMBRE, como fn_observador_tipo_es_negativo: el VALOR no es estable entre entornos ("3", "Negativo") ni el pk.
  const esNegativo = (tipo: string) =>
    tipoRows.find((r) => String(r.pk_lista_valor) === tipo)?.nombre?.trim().toLowerCase() === "negativo"

  const { data, isPending, isError, error, refetch } = useCodigosQuery({
    establecimiento: ee.id,
    search,
    filtros,
    pageIndex,
    pageSize,
  })

  const cambiarEstado = useCambiarEstadoCodigo()
  const columns = buildColumnsCodigos({
    puedeEditar: permiso.puedeEditar,
    puedeEliminar: permiso.puedeEliminar,
    onModificar: (codigo) => setModal({ tipo: "modificar", codigo }),
    onEliminar: (codigo) => setModal({ tipo: "eliminar", codigo }),
    onCambiarEstado: (c) =>
      cambiarEstado.mutate(
        { id: c.id, habilitado: !c.habilitado },
        {
          onSuccess: () => notify(c.habilitado ? "Código inactivado." : "Código activado.", { variant: "success" }),
          onError: (e) => notify(getErrorMessage(e), { variant: "error" }),
        },
      ),
  })

  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? 1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "catalogo-anotaciones-column-visibility",
  })

  const hayFiltros = Boolean(search) || Object.values(filtros).some(Boolean)

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            permiso.puedeCrear && (
              <Button size="sm" disabled={ee.id == null} onClick={() => setModal({ tipo: "nuevo" })}>
                <ControlPointIcon data-icon="inline-start" />
                Nuevo código
              </Button>
            )
          }
        >
          Catálogo de anotaciones
        </TableScreenTitle>
        <TableScreenToolbar>
          <SearchCodigos
            search={search}
            onSearchChange={(v) => {
              setSearch(v)
              goToPage(0)
            }}
            filters={filtros}
            applyFilters={(next) => {
              setFiltros(next)
              goToPage(0)
            }}
            onClearAll={() => {
              setSearch("")
              setFiltros(FILTROS_VACIOS)
              goToPage(0)
            }}
            tipos={tipos}
            situaciones={situaciones}
          />
          {ee.opciones.length > 1 && (
            <div className="w-full sm:w-80">
              <ComboOpciones
                id="catalogo-establecimiento"
                label="Establecimiento"
                todos={false}
                value={ee.valor}
                options={ee.opciones}
                onChange={(v) => {
                  ee.elegir(v)
                  goToPage(0)
                }}
              />
            </div>
          )}
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={ee.cargando || (ee.id != null && isPending)}
          isError={isError}
          onRetry={refetch}
          isRowMuted={(row) => !row.original.habilitado}
          growColumnId="descripcion"
          emptyMessage={hayFiltros ? "No hay códigos para los filtros aplicados." : "Aún no hay códigos. Cargue los del Manual de Convivencia."}
          errorMessage={error ? getErrorMessage(error) : undefined}
        />
        <Pagination
          pageIndex={pageIndex}
          pageCount={data?.pageCount ?? 1}
          canPrev={pageIndex > 0}
          canNext={pageIndex < (data?.pageCount ?? 1) - 1}
          onPageChange={goToPage}
          totalCount={data?.totalCount ?? 0}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          viewOptions={<DataTableViewOptions table={table} />}
        />
      </TableScreenBody>

      {(modal?.tipo === "nuevo" || modal?.tipo === "modificar") && (
        <DialogCodigo
          establecimiento={ee.id}
          codigo={modal.tipo === "modificar" ? modal.codigo : null}
          tipos={tipos}
          situaciones={situaciones}
          esNegativo={esNegativo}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.tipo === "eliminar" && <DialogEliminarCodigo codigo={modal.codigo} onClose={() => setModal(null)} />}
    </>
  )
}

/** Catálogo de anotaciones (Gestión Estudiantil 2.1): los códigos del Manual de Convivencia del establecimiento. */
export function CatalogoAnotacionesPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <TablePaginationProvider>
          <CatalogoContent />
        </TablePaginationProvider>
      </TableScreen>
    </NoticeProvider>
  )
}
