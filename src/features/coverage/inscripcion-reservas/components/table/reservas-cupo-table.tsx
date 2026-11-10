"use no memo"

import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { paths } from "@/config/paths"
import { CambiarJornadaSedeDialog } from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-cambiar-jornada-sede"
import {
  LiberarReservaDialog,
  RegistrarRetiroDialog,
} from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-motivo-reserva"
import { SolicitarTrasladoDialog } from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-solicitar-traslado"
import type { AccionReserva } from "@/features/coverage/inscripcion-reservas/components/table/columns-reservas-cupo"
import type { ReservaCupo } from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { ExportDialog } from "@/components/export-dialog"
import { Pagination } from "@/components/pagination"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { CheckIcon, PersonAddIcon, XIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AsignarGrupoLoteDialog } from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-asignar-grupo-lote"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { coberturaInscritosRoute } from "@/router"

import { useReservasCupoQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import type {
  FiltroRapido,
  ReservasCupoFilters,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"
import { FILTRO_RAPIDO_UI } from "@/features/coverage/inscripcion-reservas/api/ui-mappings"
import { ReservarCuposDialog } from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-reservar-cupos"
import { SearchReservasCupo } from "@/features/coverage/inscripcion-reservas/components/search/search-reservas-cupo"
import {
  ACCIONES,
  createColumns,
} from "@/features/coverage/inscripcion-reservas/components/table/columns-reservas-cupo"

const EMPTY_MESSAGES: Partial<Record<FiltroRapido, string>> = {
  TRASLADOS_POR_RESPONDER: "No hay traslados por responder.",
}

/** Pestaña "Reservas de cupo" (Cobertura Educativa, Sección 3.2). */
export function ReservasCupoTable({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaInscritosRoute.useSearch()
  const navigate = coberturaInscritosRoute.useNavigate()
  const pagination = useTablePagination()

  const filters: ReservasCupoFilters = {
    q: search.q,
    rapido: search.rapido,
    sede: search.sede,
    jornada: search.jornada,
    grado: search.grado,
    estado: search.estado,
    estadoTraslado: search.estadoTraslado,
  }
  const rapido = filters.rapido ?? "TODAS"

  const { data, isPending, isError, error, refetch } = useReservasCupoQuery({
    filters,
    sorting: pagination.sorting,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
  })

  const setFilters = (patch: Partial<ReservasCupoFilters>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 0 }), replace: true })

  // Un solo modal abierto a la vez: la acción y la reserva sobre la que se abrió.
  const [modal, setModal] = useState<{ accion: AccionReserva; reserva: ReservaCupo } | null>(null)
  const reservaDe = (accion: AccionReserva) => (modal?.accion === accion ? modal.reserva : null)
  const cerrarModal = (open: boolean) => !open && setModal(null)

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
          return toast.info(`${ACCIONES[accion].label} — ${r.estudiante}: próximamente.`)
      }
    },
  })

  const { table, selectedRows, hasSelection, resetSelection } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => row.id,
    ...pagination,
    columnVisibilityStorageKey: "reservas-cupo-table-column-visibility",
  })

  // Asignar grupo por lote (Sección 3.6): solo reservas Reservadas propias, de
  // un mismo grado, sede y jornada, porque un grupo es de uno solo (Regla 30).
  const [loteAbierto, setLoteAbierto] = useState(false)
  const motivoLoteNoValido = (() => {
    if (selectedRows.some((r) => r.estado !== "RESERVADA" || r.trasladoEntrante)) {
      return "Solo se asigna grupo a reservas Reservadas. Quite de la selección las demás."
    }
    const combinaciones = new Set(selectedRows.map((r) => `${r.grado}|${r.sede}|${r.jornada}`))
    if (combinaciones.size > 1) return "Marque reservas de un mismo grado, sede y jornada."
    return null
  })()

  const hasFilters = Boolean(
    filters.q ||
    filters.sede ||
    filters.jornada ||
    filters.grado ||
    filters.estado ||
    filters.estadoTraslado,
  )
  const emptyMessage = hasFilters
    ? "No hay reservas que coincidan con la búsqueda y los filtros aplicados."
    : (EMPTY_MESSAGES[rapido] ??
      "Aún no hay reservas. Use Reservar cupos para crear las de los estudiantes antiguos.")

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado}
        <div
          className="flex flex-wrap gap-2 px-(--screen-spacing) pt-4"
          role="group"
          aria-label="Filtros rápidos"
        >
          {FILTRO_RAPIDO_UI.map((f) => {
            const active = rapido === f.value
            return (
              <Button
                key={f.value}
                size="sm"
                variant={active ? "fill" : "outline"}
                color={active ? "primary" : "neutral"}
                aria-pressed={active}
                className={cn(!active && "font-normal")}
                onClick={() => setFilters({ rapido: f.value === "TODAS" ? undefined : f.value })}
              >
                {active && <CheckIcon data-icon="inline-start" />}
                {f.label} ({data?.contadores[f.count] ?? "…"})
              </Button>
            )
          })}
        </div>

        <TableScreenToolbar>
          <SearchReservasCupo
            filters={filters}
            onSearch={(q) => setFilters({ q: q || undefined })}
            onApply={(values) => setFilters(values)}
            onClearAll={() =>
              setFilters({
                q: undefined,
                sede: undefined,
                jornada: undefined,
                grado: undefined,
                estado: undefined,
                estadoTraslado: undefined,
              })
            }
          />
          <TableScreenActions>
            {hasSelection ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedRows.length} seleccionadas
                </span>
                <Button variant="outline" color="neutral" onClick={resetSelection}>
                  <XIcon data-icon="inline-start" />
                  Quitar selección
                </Button>
                <Tooltip>
                  <TooltipTrigger render={<span className="w-fit" />}>
                    <Button
                      disabled={motivoLoteNoValido != null}
                      onClick={() => setLoteAbierto(true)}
                    >
                      <PersonAddIcon data-icon="inline-start" />
                      Asignar grupo
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {motivoLoteNoValido ?? "Asignar un grupo a las reservas marcadas"}
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <ExportDialog
                  label="Exportar reservas"
                  description="Elige un formato para exportar las reservas que coinciden con los filtros aplicados."
                  onExport={async (format) => ({
                    status: "ok",
                    message: `Se exportaron las reservas en ${format === "pdf" ? "PDF" : "Excel"}.`,
                  })}
                />
                <ReservarCuposDialog />
              </>
            )}
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
      />
      <SolicitarTrasladoDialog
        reserva={reservaDe("SOLICITAR_TRASLADO")}
        onOpenChange={cerrarModal}
      />
      <LiberarReservaDialog reserva={reservaDe("LIBERAR")} onOpenChange={cerrarModal} />
      <RegistrarRetiroDialog reserva={reservaDe("REGISTRAR_RETIRO")} onOpenChange={cerrarModal} />
      <AsignarGrupoLoteDialog
        open={loteAbierto}
        reservas={selectedRows}
        onOpenChange={setLoteAbierto}
        onDone={resetSelection}
      />
    </TableScreen>
  )
}
