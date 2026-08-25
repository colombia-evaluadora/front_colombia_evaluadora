"use no memo"

import { useState, useMemo } from "react"

import {
  InfoIcon,
  FolderOpenIcon,
  ClipboardAddIcon,
  CheckIcon,
  XIcon,
  UserGroupAddIcon,
} from "@/components/ui/icons"
import { AsignarCupoDialog } from "@/features/coverage/components/dialogs/dialog-asignar-cupo"
import { ExportReservationsDialog } from "@/features/coverage/components/dialogs/dialog-export-reservations"
import { ExportSelectedReservationsDialog } from "@/features/coverage/components/dialogs/dialog-export-selected-reservations"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  TableScreen,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
  TableScreenBody,
  TableScreenActions,
} from "@/components/layout/table-screen"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"

import { SearchPreMatricula } from "@/features/coverage/components/search/search-pre-matricula"
import { usePreMatriculaFilters } from "@/features/coverage/hooks/use-pre-matricula-filters"
import { usePreMatriculaQuery } from "@/features/coverage/api/query/use-pre-matricula-query"
import { columnsPreMatricula } from "@/features/coverage/components/table/columns-pre-matricula"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

export function PreMatriculaPage() {
  const [hasPreMatricula, setHasPreMatricula] = useState(false)
  const [open, setOpen] = useState(false)
  const [openAsignar, setOpenAsignar] = useState(false)

  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    usePreMatriculaFilters()

  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

  const { data, isPending, isError, refetch } = usePreMatriculaQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
    enabled: hasPreMatricula,
  })

  const { table, selectedIds, hasSelection, resetSelection } = useDataTable({
    columns: columnsPreMatricula,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => row.id,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
  })

  /**
   * Grado sugerido para el dialog: si todos los seleccionados tienen el mismo
   * targetGrade se usa ese; si difieren (o no hay selección) se pasa null.
   */
  const suggestedTargetGrade = useMemo(() => {
    if (!data?.rows.length || !selectedIds.length) return null
    const selected = data.rows.filter((r) => selectedIds.includes(r.id))
    const grades = [...new Set(selected.map((r) => r.targetGrade))]
    return grades.length === 1 ? grades[0] : null
  }, [data?.rows, selectedIds])

  /**
   * Grupo sugerido: primero del conjunto seleccionado (si hay uno solo).
   * Si hay varios, se deja vacío para que el usuario lo complete.
   */
  const suggestedGroup = useMemo(() => {
    if (!data?.rows.length || selectedIds.length !== 1) return ""
    const row = data.rows.find((r) => r.id === selectedIds[0])
    // La API todavía no expone grupo sugerido; placeholder basado en targetGrade
    return row?.targetGrade != null ? `${row.targetGrade}01` : ""
  }, [data?.rows, selectedIds])

  /**
   * Estudiantes seleccionados reprobados: repiten su grado actual y el admin
   * debe confirmarlo explícitamente en el dialog de asignar cupo.
   */
  const selectedReprobados = useMemo(() => {
    if (!data?.rows.length || !selectedIds.length) return []
    return data.rows.filter((r) => selectedIds.includes(r.id) && r.failed)
  }, [data?.rows, selectedIds])

  function handleConfirmarPreMatricula() {
    setHasPreMatricula(true)
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>Pre-Matricula</TableScreenTitle>
        <TableScreenToolbar>
          <SearchPreMatricula
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
          />
          <TableScreenActions>
            {hasSelection ? (
              <>
                <Button size="sm" color="primary" onClick={() => setOpenAsignar(true)}>
                  <UserGroupAddIcon data-icon="inline-start" />
                  Asignar cupo
                </Button>
                <AsignarCupoDialog
                  open={openAsignar}
                  onOpenChange={setOpenAsignar}
                  selectedIds={selectedIds}
                  targetGrade={suggestedTargetGrade}
                  suggestedGroup={suggestedGroup}
                  reprobados={selectedReprobados}
                  onConfirm={(values) => {
                    // TODO: llamar mutación con selectedIds + values
                    console.log("Asignar cupo", { selectedIds, ...values })
                    resetSelection()
                  }}
                />
              </>
            ) : (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger render={<Button size="sm" color="primary" />}>
                  <ClipboardAddIcon data-icon="inline-start" />
                  Pre-matricular
                </DialogTrigger>
                <DialogContent showCloseButton={false}>
                  <DialogHeader className="sm:text-center sm:place-items-center">
                    <DialogTitle>
                      ¿Está seguro de que desea continuar con la prematrícula?
                    </DialogTitle>
                    <DialogDescription>
                      Esta acción asignará automáticamente a todos los estudiantes al grado
                      siguiente y generará un registro con la fecha, hora y usuario responsable.
                      Además, se enviará una notificación a los acudientes para que confirmen la
                      prematrícula
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="sm:justify-center">
                    <Button
                      size="sm"
                      color="primary"
                      onClick={() => {
                        handleConfirmarPreMatricula()
                        setOpen(false)
                      }}
                    >
                      <CheckIcon data-icon="inline-start" />
                      Continuar con la prematrícula
                    </Button>
                    <DialogClose render={<Button size="sm" variant="fill" color="neutral" />}>
                      <XIcon data-icon="inline-start" />
                      Cancelar
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {hasPreMatricula &&
              (hasSelection ? (
                <ExportSelectedReservationsDialog
                  selectedIds={selectedIds}
                  resetSelection={resetSelection}
                />
              ) : (
                <ExportReservationsDialog filters={queryFilters} />
              ))}
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        {hasPreMatricula ? (
          <>
            <DataTable
              table={table}
              isPending={isPending}
              isError={isError}
              onRetry={refetch}
              emptyMessage="Sin resultados."
              errorMessage="Ocurrió un error al cargar la prematrícula."
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
                onPageSizeChange={setPageSize}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-3 rounded-md border border-blue-stroke bg-blue-22 px-4 py-3 text-sm text-foreground">
              <InfoIcon className="size-5 shrink-0 text-blue" />
              <p className="leading-relaxed">
                Aún no se han realizado prematrículas. Al iniciar el proceso, se tomarán los
                estudiantes matriculados en el periodo académico{" "}
                <strong className="font-semibold">2025</strong> para realizar la prematrícula del
                periodo académico <strong className="font-semibold">2026</strong>.
              </p>
            </div>

            <Empty className="border-0 my-12">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-transparent text-muted-foreground">
                  <FolderOpenIcon className="size-12 opacity-50" />
                </EmptyMedia>
                <EmptyTitle className="text-muted-foreground font-normal normal-case">
                  Sin datos
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          </div>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
