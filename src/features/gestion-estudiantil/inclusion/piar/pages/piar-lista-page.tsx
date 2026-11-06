"use no memo"

import { lazy, Suspense, useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle, TableScreenToolbar } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "@/components/ui/icons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { paths } from "@/config/paths"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"

import { usePiarListaQuery, usePrefetchPiar, useSinPiarQuery } from "@/features/gestion-estudiantil/inclusion/piar/api/query/use-piar-query"
import { FILTROS_VACIOS, type PiarFiltros, type PiarRow } from "@/features/gestion-estudiantil/inclusion/piar/api/types"
import { usePiarAccess } from "@/features/gestion-estudiantil/inclusion/piar/api/use-piar-access"
import { BusquedaPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/busqueda-piar"
import { buildColumnasPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/columnas-piar"
import { AvisoPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"

type Pestana = "piar" | "orientacion" | "informe"

const TabOrientacion = lazy(() =>
  import("@/features/gestion-estudiantil/inclusion/orientacion/components/tab-orientacion").then((m) => ({ default: m.TabOrientacion })),
)
const TabInforme = lazy(() =>
  import("@/features/gestion-estudiantil/inclusion/informe/components/tab-informe").then((m) => ({ default: m.TabInforme })),
)

function AvisoSinPiar({ enabled }: { enabled: boolean }) {
  const { data } = useSinPiarQuery("", "", enabled)
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

  const { tab } = useSearch({ strict: false }) as { tab?: Pestana }
  const [pestana, setPestana] = useState<Pestana>(tab ?? (access.veListado ? "piar" : "informe"))
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<PiarFiltros>(FILTROS_VACIOS)


  const { data, isPending, isError, error, refetch } = usePiarListaQuery({ search, filtros, pageIndex, pageSize }, access.veListado)

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
            pestana === "piar" ? (
              access.puedeGestionar && (
                <Button size="sm" render={<Link to={paths.app.piarNuevo.getHref()} />} nativeButton={false}>
                  <PlusIcon data-icon="inline-start" />
                  Nuevo PIAR
                </Button>
              )
            ) : pestana === "orientacion" && access.registraAtencion ? (
              <Button size="sm" render={<Link to={paths.app.atencionNueva.getHref()} />} nativeButton={false}>
                <PlusIcon data-icon="inline-start" />
                Nueva atención
              </Button>
            ) : null
          }
        >
          Inclusión y orientación
        </TableScreenTitle>
        <NoticeOutlet className="px-(--screen-spacing) pt-3" />
        <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)}>
          <TabsList>
            {access.veListado && <TabsTrigger value="piar">PIAR</TabsTrigger>}
            {access.veOrientacion && <TabsTrigger value="orientacion">Orientación</TabsTrigger>}
            {access.veInforme && <TabsTrigger value="informe">Gestión de inclusión</TabsTrigger>}
          </TabsList>
        </Tabs>
        {pestana === "piar" && (
          <div className="px-(--screen-spacing) pt-4 empty:hidden">
            <AvisoSinPiar enabled={access.veAvisoSinPiar} />
          </div>
        )}
        {pestana === "piar" && <TableScreenToolbar>
          <BusquedaPiar search={search} filtros={filtros} onSearch={setSearch} onFiltros={aplicar} />
        </TableScreenToolbar>}
      </TableScreenHeader>
      {pestana !== "piar" ? (
        <TableScreenBody>
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            {pestana === "orientacion" ? <TabOrientacion puedeRegistrar={access.registraAtencion} puedeAnular={access.puedeAnular} /> : <TabInforme />}
          </Suspense>
        </TableScreenBody>
      ) : (
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
      )}
    </>
  )
}

/** G.4.PIA.LIS.1-3 y pestañas de G.4.ORI: orientación e informe cargan solo al abrirlas. */
export function PiarListaPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <TablePaginationProvider>
          <PiarListaContent />
        </TablePaginationProvider>
      </TableScreen>
    </NoticeProvider>
  )
}
