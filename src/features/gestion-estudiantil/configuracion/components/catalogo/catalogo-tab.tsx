"use no memo"

import { useMemo, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
import { TableScreenBody, TableScreenToolbar } from "@/components/layout/table-screen"
import { useNotify } from "@/components/notice/notice-context"
import { selectCategoryQueryOptions } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"

import { useCambiarEstadoCodigo } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/mutations/codigos"
import { useCodigosQuery } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/query/use-codigos-query"
import { FILTROS_VACIOS, type CatalogoFiltros, type CodigoRow } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"
import { DialogCodigo } from "@/features/gestion-estudiantil/catalogo-anotaciones/components/dialogs/dialog-codigo"
import { DialogEliminarCodigo } from "@/features/gestion-estudiantil/catalogo-anotaciones/components/dialogs/dialog-eliminar-codigo"
import { SearchCodigos } from "@/features/gestion-estudiantil/catalogo-anotaciones/components/search/search-codigos"
import { buildColumnsCodigos } from "@/features/gestion-estudiantil/catalogo-anotaciones/components/table/columns-codigos"
import type { AccesoConfiguracion } from "@/features/gestion-estudiantil/configuracion/api/types"
import { EncabezadoConfiguracion } from "@/features/gestion-estudiantil/configuracion/components/encabezado-configuracion"

type Modal = { tipo: "nuevo" } | { tipo: "modificar"; codigo: CodigoRow } | { tipo: "eliminar"; codigo: CodigoRow } | null

interface Props {
  tabs: ReactNode
  establecimiento: number | null
  cargandoEstablecimiento: boolean
  acceso: AccesoConfiguracion
}

/** Catálogo de anotaciones (G.10.CAT.1–4, Gestión Estudiantil 2.1): los códigos del Manual de Convivencia del establecimiento. */
export function CatalogoTab({ tabs, establecimiento, cargandoEstablecimiento, acceso }: Props) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { notify } = useNotify()

  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<CatalogoFiltros>(FILTROS_VACIOS)
  const [modal, setModal] = useState<Modal>(null)

  const tiposQ = useQuery(selectCategoryQueryOptions("TIPO_COMPORTAMIENTO"))
  const situacionesQ = useQuery(selectCategoryQueryOptions("TIPO_SITUACION"))
  const tipoRows = useMemo(() => tiposQ.data ?? [], [tiposQ.data])
  const tipos = useMemo(() => tipoRows.map((r) => ({ value: String(r.pk_lista_valor), label: r.nombre })), [tipoRows])
  const situaciones = useMemo(
    () => (situacionesQ.data ?? []).map((r) => ({ value: String(r.pk_lista_valor), label: r.nombre })),
    [situacionesQ.data],
  )
  // Por NOMBRE, como fn_observador_tipo_es_negativo: el VALOR no es estable entre entornos ("3", "Negativo") ni el pk.
  const esNegativo = (tipo: string) =>
    tipoRows.find((r) => String(r.pk_lista_valor) === tipo)?.nombre?.trim().toLowerCase() === "negativo"

  const { data, isPending, isError, error, refetch } = useCodigosQuery({
    establecimiento,
    search,
    filtros,
    pageIndex,
    pageSize,
  })

  const cambiarEstado = useCambiarEstadoCodigo()
  const columns = buildColumnsCodigos({
    puedeEditar: acceso.puede_editar,
    puedeEliminar: acceso.puede_eliminar,
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
      <EncabezadoConfiguracion
        tabs={tabs}
        action={
          <Button size="sm" disabled={establecimiento == null || !acceso.puede_crear} onClick={() => setModal({ tipo: "nuevo" })}>
            <ControlPointIcon data-icon="inline-start" />
            Nuevo código
          </Button>
        }
      >
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
        </TableScreenToolbar>
      </EncabezadoConfiguracion>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={cargandoEstablecimiento || (establecimiento != null && isPending)}
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
          establecimiento={establecimiento}
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
