"use no memo"

import { useCallback, type ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import {
  TableScreenBody,
  TableScreenHeader,
  TableScreenTabs,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { getErrorMessage } from "@/lib/api-client"

import type { GestionAlertaRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import type { AccionGestion } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/acciones-gestion"
import { SearchGestionAlertas } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/search-gestion-alertas"
import { useDialogosGestion } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/dialogos/use-dialogos-gestion"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"
import { useGestionAlertasLista } from "@/features/gestion-estudiantil/prevencion/hooks/use-gestion-alertas-lista"

/** Pestaña «Gestión de alertas (N)» (§9.11, G.8.GAL.1). */
export function GestionAlertasTab({ tabs }: { tabs: ReactNode }) {
  const { irGestionAlerta } = useNavegacionPrevencion()
  const dlg = useDialogosGestion()
  const { abrir } = dlg
  // «Ver detalle» abre la página; las demás, su modal (las banderas puede_* ya deshabilitan las que no aplican).
  const onAccion = useCallback(
    (fila: GestionAlertaRow, accion: AccionGestion) => {
      if (accion === "ver") irGestionAlerta(fila.id)
      else abrir({ dialogo: accion, gestion: fila })
    },
    [irGestionAlerta, abrir],
  )
  const l = useGestionAlertasLista(onAccion)
  const { query, table, filters, pageIndex, pageSize } = l
  const { data, isPending, isError, error, refetch } = query
  const total = data?.totalCount ?? 0

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle>Prevención y retención</TableScreenTitle>
        <TableScreenTabs>{tabs}</TableScreenTabs>
        <TableScreenToolbar>
          <div className="flex w-full flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SearchGestionAlertas
                search={l.search}
                onSearchChange={l.onSearchChange}
                filters={l.filtros}
                applyFilters={l.applyFilters}
                onClearAll={l.onClearAll}
                onDraftChange={() => {}}
                opciones={l.opciones}
              />
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {total} {total === 1 ? "alerta" : "alertas"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="gestion-ver-todas" size="sm" round checked={l.verTodas} onCheckedChange={l.onVerTodas} />
              <Label htmlFor="gestion-ver-todas">Ver todas</Label>
              <span className="text-xs text-muted-foreground">
                {l.verTodas ? "Todas las gestiones a su alcance." : "Las suyas y las Sin responsable de su sede y jornada."}
              </span>
            </div>
          </div>
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending && filters != null}
          isError={isError}
          onRetry={refetch}
          emptyMessage={
            l.sinEstablecimiento
              ? "No tiene sedes asignadas: elija una sede para ver las alertas."
              : "No hay alertas de inasistencia en gestión."
          }
          errorMessage={error ? getErrorMessage(error) : undefined}
        />
        <Pagination
          pageIndex={pageIndex}
          pageCount={data?.pageCount ?? 1}
          canPrev={pageIndex > 0}
          canNext={pageIndex < (data?.pageCount ?? 1) - 1}
          onPageChange={l.goToPage}
          totalCount={total}
          pageSize={pageSize}
          onPageSizeChange={l.setPageSize}
          viewOptions={<DataTableViewOptions table={table} />}
        />
      </TableScreenBody>
      {dlg.dialogos}
    </>
  )
}
