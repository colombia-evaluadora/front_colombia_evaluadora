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

  // `EmployeeListItem.id` es numérico, pero el id del funcionario viaja como
  // string en el dominio de asignaciones (va en el path del endpoint).
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

  // `useAssignmentTeachersQuery` (fn_asignacion_docente_listar, V83) ya
  // filtra por rol Docente y por la sede del periodo en el backend — a
  // diferencia de `useEmployeesQuery` (módulo legacy de empleados), que
  // traía cualquier funcionario con permisos en la sede. `queryFilters`
  // sigue viva para los diálogos de exportación, que todavía hablan con el
  // endpoint legacy.
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
    // `getRowId` de TanStack Table siempre devuelve string; el `id` real de
    // la fila es number, así que se convierte solo para la selección.
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
              selectedIds={selectedIds.map(Number)}
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
          // Asignadas: las que este docente tiene en su borrador (ids
          // guardados + cambios locales sin guardar). Disponibles: el resto
          // del pool que no está en el borrador — libres, o del propio
          // docente (el `pool` no se refetchea al tocar flechas, así que si
          // se saca una materia ya guardada de "asignadas" su `funcionarioId`
          // en el pool sigue siendo el de este docente hasta el próximo
          // guardado; sin el `|| funcionarioId === employee.id` desaparecía
          // de las dos listas en vez de volver a "disponibles"). Una materia
          // de OTRO docente sí queda afuera.
          const ids = new Set(assignedIds[employee.id] ?? [])
          const assigned = pool.filter((s) => ids.has(s.id))
          const available = pool.filter(
            (s) =>
              !ids.has(s.id) &&
              (s.funcionarioId == null || s.funcionarioId === String(employee.id)),
          )
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
