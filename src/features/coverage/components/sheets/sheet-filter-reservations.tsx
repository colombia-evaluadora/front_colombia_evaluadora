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

import { useReservationCatalogsQuery } from "../../api/query/use-reservation-catalogs-query"
import type { ReservationFiltersFormInput, ReservationFiltersFormValues } from "../../api/schema"
import { FilterReservationsForm } from "../forms/form-filter-reservations"

const FILTER_RESERVATIONS_FORM_ID = "filter-reservations-form"

interface FilterReservationsSheetProps {
  activeFilterCount: number
  filters: ReservationFiltersFormInput
  applyFilters: (values: ReservationFiltersFormValues) => void
  clearAllFilters: () => void
}

export function FilterReservationsSheet({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
}: FilterReservationsSheetProps) {
  const [open, setOpen] = useState(false)
  const { data: catalogs } = useReservationCatalogsQuery()

  function handleSubmit(values: ReservationFiltersFormValues) {
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
              className={activeFilterCount > 0 ? "rounded-r-none" : undefined}
            />
          }
        >
          <FunnelIcon />
          <span className="sr-only md:not-sr-only">Filtros</span>
          {activeFilterCount > 0 && <span>· {activeFilterCount}</span>}
        </SheetTrigger>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Filtros de análisis</SheetTitle>
            <SheetDescription>
              {activeFilterCount > 0
                ? `${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${activeFilterCount === 1 ? "" : "s"}.`
                : "Aplica los filtros para consultar la información."}
            </SheetDescription>
          </SheetHeader>

          <FilterReservationsForm
            id={FILTER_RESERVATIONS_FORM_ID}
            defaultValues={filters}
            onSubmit={handleSubmit}
            catalogs={catalogs}
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
            <Button type="submit" form={FILTER_RESERVATIONS_FORM_ID} color="primary">
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
          variant="soft"
          color="secondary"
          size="icon"
          className="rounded-l-none border-l-0"
          aria-label="Limpiar filtros"
          onClick={clearAllFilters}
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}
