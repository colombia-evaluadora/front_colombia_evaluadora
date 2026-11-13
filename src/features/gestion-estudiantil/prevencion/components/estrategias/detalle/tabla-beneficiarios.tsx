"use no memo"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { getErrorMessage } from "@/lib/api-client"

import type { useEstrategiaDetalle } from "@/features/gestion-estudiantil/prevencion/hooks/use-estrategia-detalle"

/** Beneficiarios paginados de la estrategia (G.8.EST.7); «N beneficiarios» = `beneficiarios_total`. */
export function TablaBeneficiarios({ d }: { d: ReturnType<typeof useEstrategiaDetalle> }) {
  const { query } = d
  return (
    <section aria-labelledby="beneficiarios-titulo" className="flex flex-col gap-3">
      <h2 id="beneficiarios-titulo" className="text-lg font-semibold">
        Beneficiarios ({d.total})
      </h2>
      <DataTable
        table={d.table}
        isPending={query.isPending}
        isError={query.isError}
        onRetry={query.refetch}
        emptyMessage="Esta estrategia aún no tiene beneficiarios."
        errorMessage={query.error ? getErrorMessage(query.error) : undefined}
      />
      <Pagination
        pageIndex={d.pageIndex}
        pageCount={Math.max(1, Math.ceil(d.total / d.pageSize))}
        canPrev={d.pageIndex > 0}
        canNext={(d.pageIndex + 1) * d.pageSize < d.total}
        onPageChange={d.goToPage}
        totalCount={d.total}
        pageSize={d.pageSize}
        onPageSizeChange={d.setPageSize}
        viewOptions={<DataTableViewOptions table={d.table} />}
      />
    </section>
  )
}
