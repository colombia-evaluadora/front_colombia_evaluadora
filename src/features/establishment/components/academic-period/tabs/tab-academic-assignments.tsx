"use no memo"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"
import { MagnifyingGlassIcon, SpinnerIcon } from "@/components/ui/icons"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { ExpandableDataTable } from "../table/expandable-data-table"
import { ExportAcademicAssignmentsDialog } from "../dialogs/dialog-export-academic-assignments"

import { useTeachersQuery } from "../../../api/query/use-teachers-query"
import { useAssignmentSubjectsQuery } from "../../../api/query/use-assignment-subjects-query"
import { useTeacherAssignmentsQuery } from "../../../api/query/use-teacher-assignments-query"
import { useSaveTeacherAssignments } from "../../../api/mutations/save-teacher-assignments"
import type { Teacher } from "../../../api/types/academic-period/teacher"
import { createAcademicAssignmentColumns } from "../table/columns-academic-assignments"
import { AssignmentTransfer } from "../academic-assignments/assignment-transfer"

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

  // Búsqueda por nombre del docente. Los mismos filtros alimentan la
  // exportación, para que "exportar" respete la búsqueda activa.
  const queryFilters = useMemo(
    () => ({ nombre: search.trim() || undefined }),
    [search]
  )

  const [expanded, setExpanded] = useState<Teacher | null>(null)
  const [assignedIds, setAssignedIds] = useState<Record<string, string[]>>({})

  const { data: pool = [] } = useAssignmentSubjectsQuery(academicPeriodId)

  const { data: savedIds } = useTeacherAssignmentsQuery(
    academicPeriodId,
    expanded?.documento
  )
  useEffect(() => {
    if (expanded && savedIds && assignedIds[expanded.documento] === undefined) {
      setAssignedIds((prev) => ({ ...prev, [expanded.documento]: savedIds }))
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

  const { data, isPending, isError, refetch } = useTeachersQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
    academicPeriodId,
  })

  const goToPage = setPageIndex
  const changePageSize = (size: number) => {
    setPageSize(size)
    setPageIndex(0)
  }

  const toggleExpand = useCallback((teacher: Teacher) => {
    setExpanded((prev) =>
      prev?.documento === teacher.documento ? null : teacher
    )
  }, [])

  const columns = useMemo(
    () =>
      createAcademicAssignmentColumns({
        expandedDoc: expanded?.documento ?? null,
        onToggleExpand: toggleExpand,
      }),
    [expanded, toggleExpand]
  )

  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => row.documento,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize: changePageSize,
    sorting,
    setSorting,
  })

  function assign(docId: string, ids: string[]) {
    setAssignedIds((prev) => ({
      ...prev,
      [docId]: [...(prev[docId] ?? []), ...ids],
    }))
  }

  function unassign(docId: string, ids: string[]) {
    setAssignedIds((prev) => ({
      ...prev,
      [docId]: (prev[docId] ?? []).filter((id) => !ids.includes(id)),
    }))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <InputGroup className="w-full rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 sm:w-72">
          <InputGroupAddon align="inline-start" className="ml-2">
            <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Buscar por nombre"
            aria-label="Buscar docente por nombre"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPageIndex(0)
            }}
          />
        </InputGroup>

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
          const teacher = row.original as Teacher
          if (expanded?.documento !== teacher.documento) return null
          // Disponibles/asignadas derivadas del pool según los IDs asignados.
          const ids = new Set(assignedIds[teacher.documento] ?? [])
          const assigned = pool.filter((s) => ids.has(s.id))
          const available = pool.filter((s) => !ids.has(s.id))
          return (
            <div className="-m-4 flex flex-col gap-4 bg-background p-4">
              <AssignmentTransfer
                available={available}
                assigned={assigned}
                onAssign={(nextIds) => assign(teacher.documento, nextIds)}
                onUnassign={(nextIds) => unassign(teacher.documento, nextIds)}
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
                      documento: teacher.documento,
                      subjectIds: assignedIds[teacher.documento] ?? [],
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
