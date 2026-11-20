"use no memo"

import { useState, type ReactNode } from "react"

import { paths } from "@/config/paths"
import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { PersonCheckIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { coberturaInscritosRoute } from "@/router"

import { useReservasCupoQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import type {
  ReservaCupo,
  ReservasCupoContadores,
  ReservasCupoFilters,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"
import { CONTADORES_UI } from "@/features/coverage/inscripcion-reservas/api/ui-mappings"
import { CambiarJornadaSedeDialog } from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-cambiar-jornada-sede"
import {
  LiberarReservaDialog,
  RegistrarRetiroDialog,
} from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-motivo-reserva"
import { ReservarCuposDialog } from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-reservar-cupos"
import { SolicitarTrasladoDialog } from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-solicitar-traslado"
import { SearchReservasCupo } from "@/features/coverage/inscripcion-reservas/components/search/search-reservas-cupo"
import {
  ACCIONES,
  createColumns,
  type AccionReserva,
} from "@/features/coverage/inscripcion-reservas/components/table/columns-reservas-cupo"

/** Los filtros que vacía "Limpiar" (todos menos la página y el orden). */
const SIN_FILTROS: Record<keyof ReservasCupoFilters, undefined> = {
  q: undefined,
  ciclo: undefined,
  sede: undefined,
  jornada: undefined,
  grado: undefined,
  estado: undefined,
  estadoTraslado: undefined,
  porConfirmar: undefined,
  entrantes: undefined,
}

/**
 * Pestaña "Reservas de cupo" (Cobertura Educativa, Sección 3.2). Con su propio
 * `NoticeProvider`: los errores de las acciones los muestra cada modal y el
 * éxito, el aviso de la pestaña (el toast global de axios queda suprimido).
 */
export function ReservasCupoTable({ encabezado }: { encabezado: ReactNode }) {
  return (
    <NoticeProvider>
      <ReservasCupoContent encabezado={encabezado} />
    </NoticeProvider>
  )
}

function Contadores({
  contadores,
  filters,
  onToggle,
}: {
  contadores: ReservasCupoContadores | undefined
  filters: ReservasCupoFilters
  onToggle: (filtro: Partial<ReservasCupoFilters>, activo: boolean) => void
}) {
  return (
    <div
      className="grid grid-cols-2 gap-3 px-(--screen-spacing) pt-4 lg:grid-cols-4"
      role="group"
      aria-label="Contadores y filtros rápidos"
    >
      {CONTADORES_UI.map((c) => {
        const activo = Object.entries(c.filtro).every(
          ([k, v]) => filters[k as keyof ReservasCupoFilters] === v,
        )
        return (
          <button
            key={c.count}
            type="button"
            aria-pressed={activo}
            onClick={() => onToggle(c.filtro, activo)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border bg-background px-4 py-3 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40",
              activo ? "border-primary ring-1 ring-primary" : "border-border",
            )}
          >
            <span className={cn("text-2xl font-semibold tabular-nums", c.numero)}>
              {contadores ? contadores[c.count] : "…"}
            </span>
            <span className="text-sm text-muted-foreground">{c.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function ReservasCupoContent({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaInscritosRoute.useSearch()
  const navigate = coberturaInscritosRoute.useNavigate()
  const pagination = useTablePagination()
  const { notify } = useNotify()

  const filters: ReservasCupoFilters = {
    q: search.q,
    ciclo: search.ciclo,
    sede: search.sede,
    jornada: search.jornada,
    grado: search.grado,
    estado: search.estado,
    estadoTraslado: search.estadoTraslado,
    porConfirmar: search.porConfirmar,
    entrantes: search.entrantes,
  }

  const { data, isPending, isError, error, refetch } = useReservasCupoQuery({
    filters,
    sorting: pagination.sorting,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
  })

  const setFilters = (patch: Partial<ReservasCupoFilters>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 0 }), replace: true })

  // Una tarjeta activa se apaga con otro clic; las de estado se excluyen entre sí.
  const toggleContador = (filtro: Partial<ReservasCupoFilters>, activo: boolean) =>
    setFilters(
      activo
        ? Object.fromEntries(Object.keys(filtro).map((k) => [k, undefined]))
        : { estado: undefined, porConfirmar: undefined, entrantes: undefined, ...filtro },
    )

  // Un solo modal abierto a la vez: la acción y la reserva sobre la que se abrió.
  const [modal, setModal] = useState<{ accion: AccionReserva; reserva: ReservaCupo } | null>(null)
  const reservaDe = (accion: AccionReserva) => (modal?.accion === accion ? modal.reserva : null)
  const cerrarModal = (open: boolean) => !open && setModal(null)
  const exito = (mensaje: string) => notify(mensaje, { variant: "success" })

  const columns = createColumns({
    onAction: (accion, r) => {
      switch (accion) {
        case "VER_DETALLE":
          return navigate({ to: paths.app.coberturaReservaDetalle.getHref(r.id) })
        case "ASIGNAR_GRUPO":
          return navigate({ to: paths.app.coberturaReservaAsignarGrupo.getHref(r.id) })
        case "CAMBIAR_JORNADA_SEDE":
        case "SOLICITAR_TRASLADO":
        case "LIBERAR":
        case "REGISTRAR_RETIRO":
          return setModal({ accion, reserva: r })
        default:
          // Las demás acciones llegan en las siguientes entregas.
          return notify(`${ACCIONES[accion].label}: disponible próximamente.`, { variant: "info" })
      }
    },
  })

  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => row.id,
    ...pagination,
    columnVisibilityStorageKey: "reservas-cupo-table-column-visibility",
  })

  const hasFilters = Object.values(filters).some((v) => v !== undefined && v !== "")
  const emptyMessage = filters.entrantes
    ? "No hay traslados por responder."
    : hasFilters
      ? "No hay reservas que coincidan con la búsqueda y los filtros aplicados."
      : "Aún no hay reservas. Use Reservar cupos para crear las de los estudiantes antiguos."

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado}
        <Contadores contadores={data?.contadores} filters={filters} onToggle={toggleContador} />

        <TableScreenToolbar>
          <SearchReservasCupo
            filters={filters}
            onSearch={(q) => setFilters({ q: q || undefined })}
            onApply={(values) => setFilters(values)}
            onClearAll={() => setFilters(SIN_FILTROS)}
          />
          <TableScreenActions>
            <Button
              variant={filters.porConfirmar ? "soft" : "outline"}
              color={filters.porConfirmar ? "primary" : "neutral"}
              aria-pressed={Boolean(filters.porConfirmar)}
              onClick={() => setFilters({ porConfirmar: filters.porConfirmar ? undefined : true })}
            >
              <PersonCheckIcon data-icon="inline-start" />
              Por confirmar
            </Button>
            <ReservarCuposDialog />
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage={emptyMessage}
          errorMessage={error ? getErrorMessage(error) : undefined}
        />
        {data && (
          <Pagination
            viewOptions={<DataTableViewOptions table={table} />}
            pageIndex={pagination.pageIndex}
            pageCount={data.pageCount}
            canPrev={pagination.pageIndex > 0}
            canNext={pagination.pageIndex < data.pageCount - 1}
            onPageChange={pagination.goToPage}
            totalCount={data.totalCount}
            pageSize={pagination.pageSize}
            onPageSizeChange={pagination.setPageSize}
          />
        )}
      </TableScreenBody>

      <CambiarJornadaSedeDialog
        reserva={reservaDe("CAMBIAR_JORNADA_SEDE")}
        onOpenChange={cerrarModal}
        onDone={exito}
      />
      <SolicitarTrasladoDialog
        reserva={reservaDe("SOLICITAR_TRASLADO")}
        onOpenChange={cerrarModal}
        onDone={exito}
      />
      <LiberarReservaDialog
        reserva={reservaDe("LIBERAR")}
        onOpenChange={cerrarModal}
        onDone={exito}
      />
      <RegistrarRetiroDialog
        reserva={reservaDe("REGISTRAR_RETIRO")}
        onOpenChange={cerrarModal}
        onDone={exito}
      />
    </TableScreen>
  )
}
