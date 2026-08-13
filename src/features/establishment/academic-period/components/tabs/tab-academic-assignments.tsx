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

import { useEmployeesQuery } from "@/features/establishment/employees/api/query/use-employees"
import type { EmployeeListItem, EmployeeStatus } from "@/features/establishment/employees/api/types/employee"

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
  const campusId = academicPeriod?.sedeId

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

  const { data: savedIds } = useTeacherAssignmentsQuery(academicPeriodId, expanded?.id)
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

  const { data, isPending, isError, refetch } = useEmployeesQuery({
    filters: queryFilters,
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
    getRowId: (row) => row.id,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize: changePageSize,
    sorting,
    setSorting,
  })

  function assign(employeeId: string, ids: string[]) {
    setAssignedIds((prev) => ({
      ...prev,
      [employeeId]: [...(prev[employeeId] ?? []), ...ids],
    }))
  }

  function unassign(employeeId: string, ids: string[]) {
    setAssignedIds((prev) => ({
      ...prev,
      [employeeId]: (prev[employeeId] ?? []).filter((id) => !ids.includes(id)),
    }))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* El `border-b` cierra la barra de acciones igual que el `hr` de
          `TableScreenHeader` en las pantallas de listado. */}
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
              selectedIds={selectedIds}
              resetSelection={resetSelection}
            />
          ) : (
            <ExportAcademicAssignmentsDialog filters={queryFilters} />
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
          // Disponibles/asignadas derivadas del pool según los IDs asignados.
          const ids = new Set(assignedIds[employee.id] ?? [])
          const assigned = pool.filter((s) => ids.has(s.id))
          const available = pool.filter((s) => !ids.has(s.id))
          return (
            <div className="-m-4 flex flex-col gap-4 bg-background p-4">
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
                      funcionarioId: employee.id,
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
