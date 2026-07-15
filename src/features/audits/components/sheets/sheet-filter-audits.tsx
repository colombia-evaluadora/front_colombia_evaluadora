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
  AuditFiltersFormInput,
  AuditFiltersFormValues,
} from "../../api/schema"
import { FilterAuditsForm } from "../forms/form-filter-audits"

const FILTER_AUDITS_FORM_ID = "filter-audits-form"

interface FilterAuditsSheetProps {
  activeFilterCount: number
  filters: AuditFiltersFormInput
  applyFilters: (values: AuditFiltersFormValues) => void
  clearAllFilters: () => void
}

export function FilterAuditsSheet({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
}: FilterAuditsSheetProps) {
  const [open, setOpen] = useState(false)

  function handleSubmit(values: AuditFiltersFormValues) {
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
            {activeFilterCount > 0 ? `${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${activeFilterCount === 1 ? "" : "s"}.` : "Sin filtros activos."}
          </SheetDescription>
        </SheetHeader>

        <FilterAuditsForm
          id={FILTER_AUDITS_FORM_ID}
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
          <Button type="submit" form={FILTER_AUDITS_FORM_ID}>
            Aplicar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
