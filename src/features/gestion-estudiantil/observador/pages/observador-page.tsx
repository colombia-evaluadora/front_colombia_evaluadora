"use no memo"

import { lazy, Suspense, useEffect, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

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
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { paths } from "@/config/paths"

import { toObservadorFilters, useAnotacionesQuery } from "@/features/gestion-estudiantil/observador/api/query/use-anotaciones-query"
import { useCodigosAnotacionQuery } from "@/features/gestion-estudiantil/observador/api/query/use-codigos-anotacion-query"
import { useOpcionesObservador, type Opcion } from "@/features/gestion-estudiantil/observador/api/use-opciones-observador"
import { useCitacionesAccess } from "@/features/gestion-estudiantil/citaciones/hooks/use-citaciones-access"
import { useObservadorAccess } from "@/features/gestion-estudiantil/observador/api/use-observador-access"
import { FILTROS_VACIOS, type AnotacionRow, type ObservadorFiltros } from "@/features/gestion-estudiantil/observador/api/types"
import { buildColumnsAnotaciones } from "@/features/gestion-estudiantil/observador/components/table/columns-anotaciones"
import { SearchAnotaciones } from "@/features/gestion-estudiantil/observador/components/search/search-anotaciones"
import { DialogAnularAnotacion } from "@/features/gestion-estudiantil/observador/components/dialogs/dialog-anular-anotacion"
import { DialogDetalleAnotacion } from "@/features/gestion-estudiantil/observador/components/dialogs/dialog-detalle-anotacion"
import { DialogImprimirObservador } from "@/features/gestion-estudiantil/observador/components/dialogs/dialog-imprimir-observador"
import { DialogExportarAnotaciones } from "@/features/gestion-estudiantil/observador/components/dialogs/dialog-exportar-anotaciones"

const DialogRemitir = lazy(() =>
  import("@/features/gestion-estudiantil/inclusion/orientacion/components/dialogs/dialog-remitir").then((m) => ({ default: m.DialogRemitir })),
)
const TabMisRemisiones = lazy(() =>
  import("@/features/gestion-estudiantil/inclusion/orientacion/components/tab-mis-remisiones").then((m) => ({ default: m.TabMisRemisiones })),
)

/** Opciones únicas por valor, en el orden en que aparecen. */
function unicas(pares: Array<[number | null, string | null]>): Opcion[] {
  const m = new Map<string, string>()
  for (const [v, l] of pares) if (v != null && l) m.set(String(v), l)
  return [...m].map(([value, label]) => ({ value, label }))
}

function ObservadorContent() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const navigate = useNavigate()
  const access = useObservadorAccess()
  const { puedeCrear: puedeCitar } = useCitacionesAccess()

  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<ObservadorFiltros>(FILTROS_VACIOS)
  // El panel abierto pide las opciones de lo que se está eligiendo, no de lo aplicado.
  const [borrador, setBorrador] = useState<ObservadorFiltros>(FILTROS_VACIOS)
  const [verDetalle, setVerDetalle] = useState<AnotacionRow | null>(null)
  const [anular, setAnular] = useState<AnotacionRow | null>(null)
  const [remitir, setRemitir] = useState<AnotacionRow | "nuevo" | null>(null)
  const [pestana, setPestana] = useState("anotaciones")
  const { notify } = useNotify()

  const opciones = useOpcionesObservador(borrador.sede, borrador.jornada)
  const codigos = useCodigosAnotacionQuery(opciones.establecimientoId)

  const queryFilters = toObservadorFilters(search, filtros)
  const { data, isPending, isError, error, refetch } = useAnotacionesQuery({
    filters: queryFilters,
    pageIndex,
    pageSize,
  })
  const rows = data?.rows ?? []

  // Responsables: los que van apareciendo en el listado; no hay un catálogo propio.
  const [responsables, setResponsables] = useState<Opcion[]>([])
  useEffect(() => {
    const nuevas = data?.rows ?? []
    if (!nuevas.length) return
    setResponsables((prev) =>
      unicas([
        ...prev.map((o) => [Number(o.value), o.label] as [number, string]),
        ...nuevas.map((r) => [r.fk_tfuncionario, r.responsable_nombre] as [number, string | null]),
      ]),
    )
  }, [data])

  const lista = codigos.data ?? []
  const opcionesFiltros = {
    sedes: opciones.sedeOpciones,
    jornadas: opciones.jornadaOpciones,
    grupos: opciones.grupoOpciones,
    periodos: opciones.periodoOpciones,
    tipos: unicas(lista.map((c) => [c.fk_tlv_tipo, c.tipo_nombre])),
    situaciones: unicas(lista.map((c) => [c.fk_tlv_situacion, c.situacion_nombre])),
    responsables,
  }

  const columns = buildColumnsAnotaciones({
    onVer: setVerDetalle,
    onAnular: setAnular,
    onModificar: (a) => navigate({ to: paths.app.observadorEditar.getHref(a.id) }),
    puedeEditar: access.puedeEditar,
    puedeAnular: access.puedeAnular,
    puedeRemitir: access.puedeRemitir,
    onRemitir: setRemitir,
    puedeCitar,
    onCitar: (a) =>
      navigate({
        to: paths.app.citacionNueva.getHref(),
        search: { origen_tipo: "ANOTACION", origen_id: a.id, matricula: a.fk_tmatricula, estudiante: a.estudiante_nombre },
      } as never),
    onCompromiso: (a) =>
      navigate({
        to: paths.app.compromisoNuevo.getHref(),
        search: { origen_tipo: "ANOTACION", origen_id: a.id, matricula: a.fk_tmatricula, estudiante: a.estudiante_nombre },
      } as never),
  })

  const { table } = useDataTable({
    columns,
    data: rows,
    pageCount: data?.pageCount ?? 1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "observador-column-visibility",
  })

  const hayFiltros = Boolean(search) || Object.values(filtros).some(Boolean)

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            pestana === "anotaciones" && <div className="flex flex-wrap items-center gap-2">
              {access.puedeImprimir && <DialogImprimirObservador filtros={filtros} />}
              <DialogExportarAnotaciones filters={queryFilters} />
              {access.puedeRemitir && (
                <Button size="sm" variant="outline" color="muted" onClick={() => setRemitir("nuevo")}>Remitir a orientación</Button>
              )}
              {access.puedeCrear && (
                <Button size="sm" render={<Link to={paths.app.observadorNueva.getHref()} />} nativeButton={false}>
                  <ControlPointIcon data-icon="inline-start" />
                  Nueva anotación
                </Button>
              )}
            </div>
          }
        >
          Observador
        </TableScreenTitle>
        <NoticeOutlet className="px-(--screen-spacing) pt-3" />
        {access.veMisRemisiones && (
          <Tabs value={pestana} onValueChange={(v) => setPestana(v as string)}>
            <TabsList>
              <TabsTrigger value="anotaciones">Anotaciones</TabsTrigger>
              <TabsTrigger value="mis">Mis reportes y remisiones</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        {pestana === "anotaciones" && <TableScreenToolbar>
          <SearchAnotaciones
            search={search}
            onSearchChange={(v) => {
              setSearch(v)
              goToPage(0)
            }}
            filters={filtros}
            applyFilters={(next) => {
              setFiltros(next)
              setBorrador(next)
              goToPage(0)
            }}
            onClearAll={() => {
              setSearch("")
              setFiltros(FILTROS_VACIOS)
              setBorrador(FILTROS_VACIOS)
              goToPage(0)
            }}
            onDraftChange={setBorrador}
            opciones={opcionesFiltros}
          />
        </TableScreenToolbar>}
      </TableScreenHeader>

      {pestana === "mis" ? (
        <TableScreenBody>
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <TabMisRemisiones />
          </Suspense>
        </TableScreenBody>
      ) : (
      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          isRowMuted={(row) => row.original.anulada}
          growColumnId="codigo"
          emptyMessage={
            hayFiltros
              ? "No hay anotaciones para los filtros aplicados."
              : "Aún no hay anotaciones. Use Nueva anotación para registrar la primera."
          }
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
      )}

      {remitir && (
        <Suspense fallback={null}>
          <DialogRemitir
            matricula={remitir === "nuevo" ? undefined : remitir.fk_tmatricula}
            estudiante={remitir === "nuevo" ? undefined : remitir.estudiante_nombre}
            onClose={() => setRemitir(null)}
            onRemitida={() => {
              setRemitir(null)
              notify("Remisión registrada. Se avisó a orientación.", { variant: "success" })
            }}
          />
        </Suspense>
      )}
      <DialogDetalleAnotacion anotacion={verDetalle} onClose={() => setVerDetalle(null)} />
      <DialogAnularAnotacion anotacion={anular} onClose={() => setAnular(null)} />
    </>
  )
}

/** Vista Observador (Gestión Estudiantil 2.2): listado de anotaciones del alcance del usuario. */
export function ObservadorPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <TablePaginationProvider>
          <ObservadorContent />
        </TablePaginationProvider>
      </TableScreen>
    </NoticeProvider>
  )
}
