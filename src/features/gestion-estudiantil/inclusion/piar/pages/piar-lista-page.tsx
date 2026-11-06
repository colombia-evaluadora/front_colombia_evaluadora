"use no memo"

import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle, TableScreenToolbar } from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "@/components/ui/icons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { paths } from "@/config/paths"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"

import { usePiarListaQuery, usePrefetchPiar, useSinPiarQuery } from "@/features/gestion-estudiantil/inclusion/piar/api/piar-api"
import { FILTROS_VACIOS, type PiarFiltros, type PiarRow } from "@/features/gestion-estudiantil/inclusion/piar/api/types"
import { usePiarAccess } from "@/features/gestion-estudiantil/inclusion/piar/api/use-piar-access"
import { BusquedaPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/busqueda-piar"
import { buildColumnasPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/columnas-piar"
import { AvisoPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"

function AvisoSinPiar() {
  const { data } = useSinPiarQuery()
  const filas = data ?? []
  if (!filas.length) return null
  return (
    <AvisoPiar>
      {filas.length} estudiante{filas.length === 1 ? " con condición especial aún no tiene" : "s con condición especial aún no tienen"} PIAR Vigente:{" "}
      {filas.map((f, i) => (
        <span key={f.fk_tmatricula}>
          {i > 0 && " · "}
          <Link className="text-primary hover:underline" to={paths.app.piarNuevo.getHref()} search={{ matricula: f.fk_tmatricula }}>
            {f.estudiante_nombre} ({f.grado_grupo})
          </Link>
        </span>
      ))}
      .
    </AvisoPiar>
  )
}

function PiarListaContent() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const navigate = useNavigate()
  const access = usePiarAccess()
  const prefetch = usePrefetchPiar()

  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<PiarFiltros>(FILTROS_VACIOS)


  const { data, isPending, isError, error, refetch } = usePiarListaQuery({ search, filtros, pageIndex, pageSize })

  const aplicar = (next: PiarFiltros) => {
    setFiltros(next)
    goToPage(0)
  }

  const irFicha = (row: PiarRow, accion?: "acta" | "cerrar") =>
    navigate({ to: paths.app.piarFicha.getHref(row.id), search: accion ? { accion } : {} })

  const columns = buildColumnasPiar({ access, prefetch, irFicha })

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
    columnVisibilityStorageKey: "piar-column-visibility",
  })

  const badgeCount = Object.values(filtros).filter(Boolean).length
  const hayFiltros = Boolean(search) || badgeCount > 0

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            access.puedeGestionar && (
              <Button size="sm" render={<Link to={paths.app.piarNuevo.getHref()} />} nativeButton={false}>
                <PlusIcon data-icon="inline-start" />
                Nuevo PIAR
              </Button>
            )
          }
        >
          Inclusión y orientación
        </TableScreenTitle>
        <Tabs value="piar">
          <TabsList>
            <TabsTrigger value="piar">PIAR</TabsTrigger>
            <TabsTrigger value="orientacion" disabled>Orientación</TabsTrigger>
            <TabsTrigger value="informe" disabled>Gestión de inclusión</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="px-(--screen-spacing) pt-4 empty:hidden">
          <AvisoSinPiar />
        </div>
        <TableScreenToolbar>
          <BusquedaPiar search={search} filtros={filtros} onSearch={setSearch} onFiltros={aplicar} />
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          growColumnId="estudiante"
          emptyMessage={hayFiltros ? "No hay PIAR para los filtros aplicados." : "Aún no hay PIAR registrados."}
          errorMessage={error ? mensajePiar(error) : undefined}
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
    </>
  )
}

/** G.4.PIA.LIS.1-3: listado de PIAR con el aviso de la Regla 28. El docente abre cada PIAR desde su enlace (V603). */
export function PiarListaPage() {
  const { puedeListar } = usePiarAccess()
  return (
    <NoticeProvider>
      <TableScreen>
        {puedeListar ? (
          <TablePaginationProvider>
            <PiarListaContent />
          </TablePaginationProvider>
        ) : (
          <>
            <TableScreenHeader>
              <TableScreenTitle>Inclusión y orientación</TableScreenTitle>
            </TableScreenHeader>
            <TableScreenBody>
              <AvisoPiar tipo="info">El listado de PIAR es para orientación, trabajo social, coordinación y rectoría. Los ajustes de sus asignaturas se abren desde el aviso que recibe de cada PIAR.</AvisoPiar>
            </TableScreenBody>
          </>
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
