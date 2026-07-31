import { useState } from "react"
import { EraserIcon, FunnelIcon, XIcon } from "@/components/ui/icons"

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
  AcademicPeriodsFiltersFormInput,
  AcademicPeriodsFiltersFormValues,
} from "../../../api/schema"
import { FilterAcademicPeriodsForm } from "../forms/form-filter-academic-periods"

const FILTER_ACADEMIC_PERIODS_FORM_ID = "filter-academic-periods-form"

interface FilterAcademicPeriodsSheetProps {
  activeFilterCount: number
  filters: AcademicPeriodsFiltersFormInput
  applyFilters: (values: AcademicPeriodsFiltersFormValues) => void
  clearAllFilters: () => void
}

export function FilterAcademicPeriodsSheet({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
}: FilterAcademicPeriodsSheetProps) {
  const [open, setOpen] = useState(false)

  function handleSubmit(values: AcademicPeriodsFiltersFormValues) {
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
            <Button
              variant={activeFilterCount > 0 ? "soft" : "outline"}
              color="secondary"
            />
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
              {activeFilterCount > 0
                ? `${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${activeFilterCount === 1 ? "" : "s"}.`
                : "Sin filtros activos."}
            </SheetDescription>
          </SheetHeader>

          <FilterAcademicPeriodsForm
            id={FILTER_ACADEMIC_PERIODS_FORM_ID}
            defaultValues={filters}
            onSubmit={handleSubmit}
          />

          <SheetFooter className="flex-row items-center justify-between gap-2">
            <Button
              type="button"
              color="muted"
              onClick={handleClearAll}
              disabled={activeFilterCount === 0}
            >
              <EraserIcon data-icon="inline-start" />
              Limpiar todo
            </Button>
            <Button
              type="submit"
              form={FILTER_ACADEMIC_PERIODS_FORM_ID}
              color="primary"
            >
              Aplicar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {activeFilterCount > 0 && (
        <Button
          type="button"
          variant="soft"
          color="secondary"
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
