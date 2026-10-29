"use no memo"

import { useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { getErrorMessage } from "@/lib/api-client"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import {
  useDeleteAcademicAssignment,
  useSetAcademicAssignmentStatus,
} from "@/features/establishment/academic-period/api/mutations/academic-assignments"
import { useAcademicAssignmentsQuery } from "@/features/establishment/academic-period/api/query/use-academic-assignments"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import { useJornadasQuery } from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"
import type {
  AcademicAssignment,
  AcademicAssignmentFilters,
} from "@/features/establishment/academic-period/api/types/academic-assignment"
import { AcademicAssignmentDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-academic-assignment"
import { ExportAcademicAssignmentsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-academic-assignments"
import {
  EMPTY_ASSIGNMENT_FILTERS,
  SearchAcademicAssignments,
} from "@/features/establishment/academic-period/components/search/search-academic-assignments"
import { createAcademicAssignmentColumns } from "@/features/establishment/academic-period/components/table/columns-academic-assignments"
import { useLocalPagination } from "@/features/establishment/academic-period/hooks/use-local-pagination"
import { usePeriodReadOnly } from "@/features/establishment/academic-period/utils/period-read-only"

interface TabAcademicAssignmentsProps {
  academicPeriodId?: number
}

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

// Opciones únicas para los filtros, sacadas de las mismas asignaciones.
function uniqueOptions(
  rows: AcademicAssignment[],
  value: (a: AcademicAssignment) => string,
  label: (a: AcademicAssignment) => string,
) {
  return [...new Map(rows.map((a) => [value(a), label(a)]))]
    .map(([v, l]) => ({ value: v, label: l }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

// Pestaña Asignaciones académicas (Sección 5.4): la carga académica de cada
// docente, una fila por Docente + Grupo + Asignatura.
export function TabAcademicAssignments({ academicPeriodId }: TabAcademicAssignmentsProps) {
  const { notify } = useNotify()
  const [sorting, setSorting] = useState<SortingState>([])
  const [filters, setFilters] = useState<AcademicAssignmentFilters>(EMPTY_ASSIGNMENT_FILTERS)
  const [dialog, setDialog] = useState<{ open: boolean; assignment: AcademicAssignment | null }>({
    open: false,
    assignment: null,
  })

  const { data: period } = useAcademicPeriodQuery(academicPeriodId)
  const { data: jornadas = [] } = useJornadasQuery()
  const {
    data: assignments = [],
    isPending,
    isError,
    error,
    refetch,
  } = useAcademicAssignmentsQuery(academicPeriodId)
  const statusMutation = useSetAcademicAssignmentStatus()
  const deleteMutation = useDeleteAcademicAssignment()
  // Consulta sin red; guardar sigue siendo solo en línea.
  const soloEnLinea = useOnlineOnly()

  // Con el período Cerrado, la carga queda de solo lectura.
  const { readOnly } = usePeriodReadOnly()
  const jornadaName = jornadas.find((j) => j.id === period?.config.jornadaId)?.name
  const sedeJornada = [period?.sedeName, jornadaName].filter(Boolean).join(" · ")
  const title = [period?.sedeName, period?.startDate.slice(0, 4), jornadaName]
    .filter(Boolean)
    .join(" · ")

  const search = fold(filters.search.trim())
  const filtered = assignments.filter(
    (a) =>
      (!search || fold(a.docente).includes(search) || fold(a.asignatura).includes(search)) &&
      (!filters.funcionarioId || a.funcionarioId === filters.funcionarioId) &&
      (filters.gradeId === "" || a.gradeId === filters.gradeId) &&
      (filters.subjectId === "" || a.subjectId === filters.subjectId) &&
      (!filters.status || a.status === filters.status),
  )
  // Orden del lado del front: la consulta ya trae todo.
  const [sort] = sorting
  const sorted = sort
    ? [...filtered].sort((a, b) => {
        const key = (sort.id === "estado" ? "status" : sort.id) as keyof AcademicAssignment
        const cmp = String(a[key]).localeCompare(String(b[key]), "es", { numeric: true })
        return sort.desc ? -cmp : cmp
      })
    : filtered

  function toggleStatus(assignment: AcademicAssignment) {
    const next = assignment.status === "A" ? "I" : "A"
    statusMutation.mutate(
      { id: assignment.id, status: next },
      {
        onSuccess: () =>
          notify(
            next === "A"
              ? SUCCESS_MESSAGES.academicAssignment.activated
              : SUCCESS_MESSAGES.academicAssignment.deactivated,
          ),
        onError: (e) => notify(getErrorMessage(e), { variant: "error" }),
      },
    )
  }

  async function deleteAssignment(assignment: AcademicAssignment) {
    try {
      await deleteMutation.mutateAsync({ id: assignment.id })
      notify(SUCCESS_MESSAGES.academicAssignment.deleted)
      return true
    } catch (e) {
      notify(getErrorMessage(e), { variant: "error" })
      return false
    }
  }

  const page = useLocalPagination(sorted)
  const columns = createAcademicAssignmentColumns({
    readOnly: readOnly || soloEnLinea.disabled,
    onEdit: (assignment) => setDialog({ open: true, assignment }),
    onToggleStatus: toggleStatus,
    onDelete: deleteAssignment,
  })
  const { table } = useDataTable({
    columns,
    data: page.pageRows,
    getRowId: (row) => String(row.id),
    ...page.table,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "tab-academic-assignments-column-visibility",
  })

  const hasFilters = filters.search !== "" || filtered.length !== assignments.length

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-medium">
        Asignaciones académicas{title ? ` de ${title}` : ""}
      </h3>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <SearchAcademicAssignments
          filters={filters}
          onFiltersChange={setFilters}
          teachers={uniqueOptions(
            assignments,
            (a) => a.funcionarioId,
            (a) => a.docente,
          )}
          grades={uniqueOptions(
            assignments,
            (a) => String(a.gradeId),
            (a) => a.grado,
          )}
          subjects={uniqueOptions(
            assignments,
            (a) => String(a.subjectId),
            (a) => a.asignatura,
          )}
        />
        <div className="flex items-center gap-2">
          <ExportAcademicAssignmentsDialog academicPeriodId={academicPeriodId} />
          {!readOnly && (
            <Button
              color="primary"
              size="sm"
              disabled={soloEnLinea.disabled}
              title={soloEnLinea.tooltip ?? undefined}
              onClick={() => setDialog({ open: true, assignment: null })}
            >
              <PlusIcon data-icon="inline-start" />
              Nueva asignación
            </Button>
          )}
        </div>
      </div>

      <NoticeOutlet />


      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage={
          hasFilters
            ? "Ninguna asignación coincide con la búsqueda. Pruebe con otros filtros."
            : "Aún no hay asignaciones académicas en este período. Use Nueva asignación para registrar la carga de los Responsables de enseñanza."
        }
        errorMessage={error ? getErrorMessage(error) : undefined}
      />
      <Pagination viewOptions={<DataTableViewOptions table={table} />} {...page.pagination} />

      {academicPeriodId != null && (
        <AcademicAssignmentDialog
          key={dialog.assignment?.id ?? "new"}
          open={dialog.open}
          onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
          academicPeriodId={academicPeriodId}
          sedeJornada={sedeJornada}
          assignment={dialog.assignment}
        />
      )}
    </div>
  )
}
