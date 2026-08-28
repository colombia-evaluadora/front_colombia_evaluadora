"use no memo"

import { useCallback, useEffect, useMemo, useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import type { SortingState } from "@tanstack/react-table"
import { SpinnerIcon } from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { useNotify, NoticeOutlet } from "@/components/notice/notice-context"
import { SearchAcademicAssignments } from "@/features/establishment/academic-period/components/search/search-academic-assignments"
import { ExportAcademicAssignmentsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-academic-assignments"
import { ExportSelectedAcademicAssignmentsDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-export-selected-academic-assignments"

import { useAssignmentTeachersQuery } from "@/features/establishment/academic-period/api/query/use-assignment-teachers"
import type {
  EmployeeListItem,
  EmployeeStatus,
} from "@/features/establishment/employees/api/types/employee"

import { useAssignmentSubjectsQuery } from "@/features/establishment/academic-period/api/query/use-assignment-subjects"
import { useTeacherAssignmentsQuery } from "@/features/establishment/academic-period/api/query/use-teacher-assignments"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import { useSaveTeacherAssignments } from "@/features/establishment/academic-period/api/mutations/save-teacher-assignments"
import { createAcademicAssignmentColumns } from "@/features/establishment/academic-period/components/table/columns-academic-assignments"
import { AssignmentTransfer } from "@/features/establishment/academic-period/components/assignment-transfer"

interface TabAcademicAssignmentsProps {
  academicPeriodId?: number
}

export function TabAcademicAssignments({ academicPeriodId }: TabAcademicAssignmentsProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<EmployeeStatus | "">("")
  const { notify } = useNotify()

  const { data: academicPeriod } = useAcademicPeriodQuery(academicPeriodId)
  // `sedeId` es string en el dominio de periodo académico; el filtro de
  // funcionarios espera el id numérico real de la sede.
  const campusId = academicPeriod?.sedeId ? Number(academicPeriod.sedeId) : undefined

  const queryFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      statuses: status ? [status] : undefined,
      campusId,
    }),
    [search, status, campusId],
  )

  const [expanded, setExpanded] = useState<EmployeeListItem | null>(null)
  const [assignedIds, setAssignedIds] = useState<Record<string, string[]>>({})

  const { data: pool = [] } = useAssignmentSubjectsQuery(academicPeriodId)

  const { data: savedIds } = useTeacherAssignmentsQuery(
    academicPeriodId,
    expanded == null ? undefined : String(expanded.id),
  )
  useEffect(() => {
    if (expanded && savedIds && assignedIds[expanded.id] === undefined) {
      setAssignedIds((prev) => ({ ...prev, [expanded.id]: savedIds }))
    }
  }, [expanded, savedIds, assignedIds])

  const saveAssignments = useSaveTeacherAssignments({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.academicAssignment.updated)
      },
    },
  })


  const { data, isPending, isError, refetch } = useAssignmentTeachersQuery({
    academicPeriodId,
    search: queryFilters.search,
    status,
    sorting,
    pageIndex,
    pageSize,
  })

  const goToPage = setPageIndex
  const changePageSize = (size: number) => {
    setPageSize(size)
    setPageIndex(0)
  }

  const toggleExpand = useCallback((employee: EmployeeListItem) => {
    setExpanded((prev) => {
      const isClosing = prev?.id === employee.id
      if (isClosing) {
        setAssignedIds((current) => {
          const { [employee.id]: _drop, ...rest } = current
          return rest
        })
        return null
      }
      return employee
    })
  }, [])

  const columns = useMemo(
    () =>
      createAcademicAssignmentColumns({
        expandedId: expanded?.id ?? null,
        onToggleExpand: toggleExpand,
      }),
    [expanded, toggleExpand],
  )

  const { table, selectedIds, hasSelection, resetSelection } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize: changePageSize,
    sorting,
    setSorting,
  })

  function assign(employeeId: number, ids: string[]) {
    setAssignedIds((prev) => ({
      ...prev,
      [employeeId]: [...(prev[employeeId] ?? []), ...ids],
    }))
  }

  function unassign(employeeId: number, ids: string[]) {
    setAssignedIds((prev) => ({
      ...prev,
      [employeeId]: (prev[employeeId] ?? []).filter((id) => !ids.includes(id)),
    }))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
        <SearchAcademicAssignments
          search={search}
          onSearchChange={(value) => {
            setSearch(value)
            setPageIndex(0)
          }}
          status={status}
          onStatusChange={(value) => {
            setStatus(value)
            setPageIndex(0)
          }}
        />

        <div className="flex gap-2">
          {hasSelection ? (
            <ExportSelectedAcademicAssignmentsDialog
              selectedIds={selectedIds.map(Number)}
              resetSelection={resetSelection}
              academicPeriodId={academicPeriodId}
            />
          ) : (
            <ExportAcademicAssignmentsDialog academicPeriodId={academicPeriodId} />
          )}
        </div>
      </div>

      <NoticeOutlet />

      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Sin docentes."
        errorMessage="Ocurrió un error al cargar los docentes."
        renderSubRow={(row) => {
          const employee = row.original as EmployeeListItem
          if (expanded?.id !== employee.id) return null
          const ids = new Set(assignedIds[employee.id] ?? [])
          const assigned = pool.filter((s) => ids.has(s.id))
          const available = pool.filter(
            (s) =>
              !ids.has(s.id) &&
              (s.funcionarioId == null || s.funcionarioId === String(employee.id)),
          )
          return (
            // Sin límite propio, este subrow + las 10 filas de la página
            // (>10 docentes) exceden el `max-h-[64vh]`/`[58vh]` del panel de
            // la tab (evaluation-periods-section.tsx) y el excedente se
            // arrastra como scroll de la página en vez de quedar contenido
            // en la tabla — reproducible solo acá porque ningún otro tab
            // anida un `renderSubRow` así de alto. El tope acá (45vh) tiene
            // que quedar POR DEBAJO del más chico de los dos del panel
            // (58vh con el acordeón abierto): si el subrow puede crecer más
            // que el panel que lo contiene, el `overflow-y-auto` del panel
            // no alcanza a contenerlo con docentes que tienen muchas
            // materias en el pool (confirmado con un pool de 38 ítems).
            <div className="-m-4 flex max-h-[45vh] flex-col gap-4 overflow-y-auto bg-background p-4">
              <AssignmentTransfer
                available={available}
                assigned={assigned}
                onAssign={(nextIds) => assign(employee.id, nextIds)}
                onUnassign={(nextIds) => unassign(employee.id, nextIds)}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  color="primary"
                  size="sm"
                  disabled={saveAssignments.isPending}
                  aria-busy={saveAssignments.isPending}
                  onClick={() =>
                    saveAssignments.mutate({
                      academicPeriodId: academicPeriodId as number,
                      funcionarioId: String(employee.id),
                      subjectIds: assignedIds[employee.id] ?? [],
                    })
                  }
                >
                  {saveAssignments.isPending && (
                    <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                  )}
                  Guardar asignaturas
                </Button>
              </div>
            </div>
          )
        }}
      />
      {data && (
        <Pagination
          viewOptions={<DataTableViewOptions table={table} />}
          pageIndex={pageIndex}
          pageCount={data.pageCount}
          canPrev={pageIndex > 0}
          canNext={pageIndex < data.pageCount - 1}
          onPageChange={goToPage}
          totalCount={data.totalCount}
          pageSize={pageSize}
          onPageSizeChange={changePageSize}
        />
      )}
    </div>
  )
}
