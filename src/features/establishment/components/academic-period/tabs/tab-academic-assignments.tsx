"use no memo"

import { useCallback, useMemo, useState } from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"

import { useTeachersQuery } from "../../../api/query/use-teachers-query"
import type { Teacher } from "../../../api/types/academic-period/teacher"
import { createAcademicAssignmentColumns } from "../table/columns-academic-assignments"
import {
  defaultAssignments,
  type TeacherAssignments,
} from "../academic-assignments/assignments-data"
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

  const [expanded, setExpanded] = useState<Teacher | null>(null)
  const [assignments, setAssignments] = useState<
    Record<string, TeacherAssignments>
  >({})

  const { data, isPending, isError, refetch } = useTeachersQuery({
    filters: {},
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
    // Inicializa las asignaturas del docente la primera vez que se expande.
    setAssignments((prev) =>
      prev[teacher.documento]
        ? prev
        : { ...prev, [teacher.documento]: defaultAssignments() }
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
    setAssignments((prev) => {
      const t = prev[docId]
      const moving = t.available.filter((s) => ids.includes(s.id))
      return {
        ...prev,
        [docId]: {
          available: t.available.filter((s) => !ids.includes(s.id)),
          assigned: [...t.assigned, ...moving],
        },
      }
    })
  }

  function unassign(docId: string, ids: string[]) {
    setAssignments((prev) => {
      const t = prev[docId]
      const moving = t.assigned.filter((s) => ids.includes(s.id))
      return {
        ...prev,
        [docId]: {
          assigned: t.assigned.filter((s) => !ids.includes(s.id)),
          available: [...t.available, ...moving],
        },
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Sin docentes."
        errorMessage="Ocurrió un error al cargar los docentes."
        renderSubRow={(row) => {
          const teacher = row.original as Teacher
          if (expanded?.documento !== teacher.documento) return null
          const teacherAssignments = assignments[teacher.documento]
          if (!teacherAssignments) return null
          return (
            <div className="-m-4 bg-background p-4">
              <AssignmentTransfer
                available={teacherAssignments.available}
                assigned={teacherAssignments.assigned}
                onAssign={(ids) => assign(teacher.documento, ids)}
                onUnassign={(ids) => unassign(teacher.documento, ids)}
              />
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
