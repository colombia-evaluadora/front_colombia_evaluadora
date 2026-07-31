"use no memo"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"
import { SpinnerIcon } from "@/components/ui/icons"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { ExpandableDataTable } from "../../common/expandable-data-table"
import { ExportAcademicAssignmentsDialog } from "../dialogs/dialog-export-academic-assignments"

import { useEmployeesQuery } from "@/features/establishment/api/query/use-employees-query"
import type { EmployeeListItem } from "@/features/establishment/api/types/employee"

import { useAssignmentSubjectsQuery } from "../../../api/query/academic-assignments/use-assignment-subjects-query"
import { useTeacherAssignmentsQuery } from "../../../api/query/academic-assignments/use-teacher-assignments-query"
import { useAcademicPeriodQuery } from "../../../api/query/academic-period/use-academic-period-query"
import { useSaveTeacherAssignments } from "../../../api/mutations/academic-assignments/save-teacher-assignments"
import { createAcademicAssignmentColumns } from "../table/columns-academic-assignments"
import { AssignmentTransfer } from "../assignment-transfer"

interface TabAcademicAssignmentsProps {
  academicPeriodId?: number
}

export function TabAcademicAssignments({
  academicPeriodId,
}: TabAcademicAssignmentsProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState("")

  // Búsqueda por nombre / documento del docente. El endpoint de empleados
  // ya hace match por documento, nombre o sede; lo compartimos con la
  // exportación para que "exportar" respete la búsqueda activa.
  // `campusId` se agrega al filtro para acotar el listado a los funcionarios
  // con permiso en la sede del periodo académico (resuelto abajo).
  const { data: academicPeriod } = useAcademicPeriodQuery(academicPeriodId)
  const campusId = academicPeriod?.sedeId

  const queryFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      campusId,
    }),
    [search, campusId]
  )

  const [expanded, setExpanded] = useState<EmployeeListItem | null>(null)
  const [assignedIds, setAssignedIds] = useState<Record<string, string[]>>({})

  const { data: pool = [] } = useAssignmentSubjectsQuery(academicPeriodId)

  const { data: savedIds } = useTeacherAssignmentsQuery(
    academicPeriodId,
    expanded?.documentNumber
  )
  useEffect(() => {
    if (
      expanded &&
      savedIds &&
      assignedIds[expanded.id] === undefined
    ) {
      setAssignedIds((prev) => ({ ...prev, [expanded.id]: savedIds }))
    }
  }, [expanded, savedIds, assignedIds])

  const saveAssignments = useSaveTeacherAssignments({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          toast.error(result.message)
          return
        }
        toast.success(result.message)
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
    [expanded, toggleExpand]
  )

  const { table } = useDataTable({
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full gap-2 sm:w-72"
        >
          <FieldLabel htmlFor="academic-assignments-search">Buscar</FieldLabel>
          <Input
            id="academic-assignments-search"
            name="search"
            type="text"
            autoComplete="off"
            placeholder="Buscar por nombre"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPageIndex(0)
            }}
          />
        </Field>

        <ExportAcademicAssignmentsDialog filters={queryFilters} />
      </div>

      <ExpandableDataTable
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
                      documentNumber: employee.documentNumber,
                      subjectIds: assignedIds[employee.id] ?? [],
                    })
                  }
                >
                  {saveAssignments.isPending && (
                    <SpinnerIcon
                      data-icon="inline-start"
                      className="animate-spin"
                    />
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
