"use no memo"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDataTable } from "@/hooks/use-data-table"
import { getErrorMessage } from "@/lib/api-client"

import type { OpcionCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { buildColumnsSesiones } from "@/features/gestion-estudiantil/convivencia/components/comite/columns-sesiones"
import type { useComiteTab } from "@/features/gestion-estudiantil/convivencia/hooks/use-comite-tab"

interface Props {
  tab: ReturnType<typeof useComiteTab>
  puedeGestionar: boolean
  onVer: (id: number) => void
  onModificar: (id: number) => void
}

function FiltroTipo({ tipos, value, onChange }: { tipos: OpcionCatalogo[]; value: string; onChange: (v: string) => void }) {
  const items = { "": "Todos", ...Object.fromEntries(tipos.map((t) => [t.value, t.label])) }
  return (
    <Field orientation="vertical" variant="outlined" className="w-full gap-2 sm:w-72">
      <FieldLabel htmlFor="sesiones-tipo">Tipo de sesión</FieldLabel>
      <Select items={items} value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger id="sesiones-tipo" size="default" className="w-full">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos</SelectItem>
          {tipos.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

/** «Sesiones» del Comité: filtro por tipo, tabla y paginación (G.2.COM.SES.1). */
export function SeccionSesiones({ tab, puedeGestionar, onVer, onModificar }: Props) {
  const { sesiones, pagina } = tab
  const rows = sesiones.data?.rows ?? []
  const pageCount = sesiones.data?.pageCount ?? 1

  const { table } = useDataTable({
    columns: buildColumnsSesiones({
      puedeModificar: puedeGestionar,
      onAccion: (s, accion) => (accion === "ver" ? onVer(s.id) : onModificar(s.id)),
    }),
    data: rows,
    pageCount,
    getRowId: (row) => String(row.id),
    ...pagina,
    columnVisibilityStorageKey: "convivencia-sesiones-column-visibility",
  })

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-medium">Sesiones</h2>
          <FiltroTipo tipos={tab.tipos} value={tab.tipo} onChange={tab.setTipo} />
        </div>
      </div>
      <DataTable
        table={table}
        isPending={sesiones.isPending}
        isError={sesiones.isError}
        onRetry={sesiones.refetch}
        emptyMessage={tab.tipo ? "No hay sesiones para el filtro aplicado." : "Aún no hay sesiones del Comité en este período."}
        errorMessage={sesiones.error ? getErrorMessage(sesiones.error) : undefined}
      />
      <Pagination
        pageIndex={pagina.pageIndex}
        pageCount={pageCount}
        canPrev={pagina.pageIndex > 0}
        canNext={pagina.pageIndex < pageCount - 1}
        onPageChange={pagina.goToPage}
        totalCount={sesiones.data?.totalCount ?? 0}
        pageSize={pagina.pageSize}
        onPageSizeChange={pagina.setPageSize}
        viewOptions={<DataTableViewOptions table={table} />}
      />
    </section>
  )
}
