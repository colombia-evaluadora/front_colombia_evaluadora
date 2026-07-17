import { useState } from "react"
import { EraserIcon, FunnelIcon, XIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import type {
  TableOperationsFiltersFormInput,
  TableOperationsFiltersFormValues,
} from "../../api/schema"
import { FilterTableOperationsForm } from "../forms/form-filter-table-operations"

const FILTER_TABLE_OPERATIONS_FORM_ID = "filter-table-operations-form"

interface FilterTableOperationsSheetProps {
  activeFilterCount: number
  filters: TableOperationsFiltersFormInput
  applyFilters: (values: TableOperationsFiltersFormValues) => void
  clearAllFilters: () => void
  // Campos de la tabla auditada — se inyectan en el form para el dropdown
  // de filtros por campo.
  availableFields: string[]
}

export function FilterTableOperationsSheet({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
  availableFields,
}: FilterTableOperationsSheetProps) {
  const [open, setOpen] = useState(false)

  function handleSubmit(values: TableOperationsFiltersFormValues) {
    applyFilters(values)
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setOpen(false)
  }

  return (
    <div className="flex items-center">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant={activeFilterCount > 0 ? "fill" : "outline"} />
          }
        >
          <FunnelIcon />
          <span className="sr-only md:not-sr-only">Filtros</span>
          {activeFilterCount > 0 && <span>· {activeFilterCount}</span>}
        </SheetTrigger>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>
              {activeFilterCount > 0 ? `${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${activeFilterCount === 1 ? "" : "s"}.` : "Sin filtros activos."}
            </SheetDescription>
          </SheetHeader>

          <FilterTableOperationsForm
            id={FILTER_TABLE_OPERATIONS_FORM_ID}
            defaultValues={filters}
            onSubmit={handleSubmit}
            availableFields={availableFields}
          />

          <SheetFooter className="flex-row items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearAll}
              disabled={activeFilterCount === 0}
            >
              <EraserIcon data-icon="inline-start" />
              Limpiar todo
            </Button>
            <Button type="submit" form={FILTER_TABLE_OPERATIONS_FORM_ID}>
              Aplicar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {/* Clear rápido sin abrir el sheet — solo visible si hay algo
          para limpiar. */}
      {activeFilterCount > 0 && (
        <Button
          type="button"
          variant="fill"
          size="icon"
          className="border-l-0"
          aria-label="Limpiar filtros"
          onClick={clearAllFilters}
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}
