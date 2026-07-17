import { useState } from "react"
import { EraserIcon, FunnelIcon } from "@phosphor-icons/react"

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
  SessionOperationsFiltersFormInput,
  SessionOperationsFiltersFormValues,
} from "../../api/schema"
import { FilterSessionOperationsForm } from "../forms/form-filter-session-operations"

const FILTER_SESSION_OPERATIONS_FORM_ID = "filter-session-operations-form"

interface FilterSessionOperationsSheetProps {
  activeFilterCount: number
  filters: SessionOperationsFiltersFormInput
  applyFilters: (values: SessionOperationsFiltersFormValues) => void
  clearAllFilters: () => void
}

export function FilterSessionOperationsSheet({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
}: FilterSessionOperationsSheetProps) {
  const [open, setOpen] = useState(false)

  function handleSubmit(values: SessionOperationsFiltersFormValues) {
    applyFilters(values)
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" />}>
        <FunnelIcon />
        <span className="sr-only md:not-sr-only">Filtros</span>
        {activeFilterCount > 0 && <span>· {activeFilterCount}</span>}
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>
            {activeFilterCount > 0
              ? `${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${activeFilterCount === 1 ? "" : "s"}.`
              : "Sin filtros activos."}
          </SheetDescription>
        </SheetHeader>

        <FilterSessionOperationsForm
          id={FILTER_SESSION_OPERATIONS_FORM_ID}
          defaultValues={filters}
          onSubmit={handleSubmit}
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
          <Button type="submit" form={FILTER_SESSION_OPERATIONS_FORM_ID}>
            Aplicar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}