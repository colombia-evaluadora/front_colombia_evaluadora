import { useMemo, useState } from "react"
import { CaretDownIcon, CheckIcon, MagnifyingGlassIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input, inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import {
  Pagination as UIPagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

import { useGeneralAreasQuery } from "../../../api/query/use-general-areas-query"
import type { GeneralArea } from "../../../api/types/general-area"

// Grilla de áreas: 3 columnas × 15 filas por página → 45 áreas por página.
const COLUMNS = 3
const ROWS = 15
const PAGE_SIZE = COLUMNS * ROWS

// Parte las áreas de la página en filas de 3 columnas.
function chunkRows(areas: GeneralArea[]): GeneralArea[][] {
  const grid: GeneralArea[][] = []
  for (let i = 0; i < areas.length; i += COLUMNS) {
    grid.push(areas.slice(i, i + COLUMNS))
  }
  return grid
}

interface SelectGeneralAreaDialogProps {
  // Nombre del área general seleccionada (valor del formulario).
  value: string
  onChange: (nombre: string) => void
  id?: string
  invalid?: boolean
}

export function SelectGeneralAreaDialog({
  value,
  onChange,
  id,
  invalid,
}: SelectGeneralAreaDialogProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)

  const resolvedVariant = useInputVariant()

  const { data: areas = [] } = useGeneralAreasQuery()

  // Búsqueda por nombre (client-side: el catálogo se trae completo).
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return areas
    return areas.filter((area) => area.nombre.toLowerCase().includes(query))
  }, [areas, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(pageIndex, pageCount - 1)
  const pageAreas = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  const grid = chunkRows(pageAreas)

  function handleSearch(next: string) {
    setSearch(next)
    setPageIndex(0)
  }

  function handleSelect(nombre: string) {
    onChange(nombre)
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setSearch("")
          setPageIndex(0)
        }
      }}
    >
      {/* Disparador con el mismo aspecto que un SelectTrigger del formulario. */}
      <DialogTrigger
        render={
          <button
            type="button"
            id={id}
            aria-invalid={invalid}
            className={cn(
              inputVariants({ variant: resolvedVariant }),
              inputTriggerVariants({ variant: resolvedVariant }),
              "flex items-center justify-between gap-1.5 text-left",
              resolvedVariant === "outlined" && "bg-background",
              value ? "text-foreground" : "text-muted-foreground",
            )}
          />
        }
      >
        <span className="flex-1 truncate">{value || "Seleccionar"}</span>
        <CaretDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Seleccionar área general</DialogTitle>
        </DialogHeader>

        {/* Buscador */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Buscar área..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Grilla de áreas: 3 columnas, estilo tabla de áreas. */}
        <div className="min-w-0 overflow-hidden rounded-md border">
          <Table>
            <TableBody>
              {grid.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={COLUMNS} className="h-24 text-center text-muted-foreground">
                    No se encontraron áreas.
                  </TableCell>
                </TableRow>
              ) : (
                grid.map((rowAreas, r) => (
                  <TableRow key={r} className="hover:bg-transparent">
                    {Array.from({ length: COLUMNS }).map((_, c) => {
                      const area = rowAreas[c]
                      if (!area) {
                        return <TableCell key={c} className="border-r p-0 last:border-r-0" />
                      }
                      const selected = area.nombre === value
                      return (
                        <TableCell key={c} className="border-r p-0 last:border-r-0">
                          <button
                            type="button"
                            onClick={() => handleSelect(area.nombre)}
                            className={cn(
                              "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50",
                              selected && "bg-muted font-medium text-primary hover:bg-muted",
                            )}
                          >
                            {selected && <CheckIcon className="size-4 shrink-0" />}
                            <span className="truncate">{area.nombre}</span>
                          </button>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación (3 × 15 = 45 áreas por página) */}
        <div className="flex items-center justify-between gap-2">
          <p className="shrink-0 text-sm text-muted-foreground">{filtered.length} área(s)</p>
          <UIPagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={page > 0 ? "#" : undefined}
                  text="Atrás"
                  aria-label="Página anterior"
                  className={page === 0 ? "pointer-events-none opacity-50" : ""}
                  onClick={(e) => {
                    e.preventDefault()
                    if (page > 0) setPageIndex(page - 1)
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-2 text-sm text-muted-foreground">
                  {page + 1}/{pageCount}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href={page < pageCount - 1 ? "#" : undefined}
                  text="Sig."
                  aria-label="Página siguiente"
                  className={page >= pageCount - 1 ? "pointer-events-none opacity-50" : ""}
                  onClick={(e) => {
                    e.preventDefault()
                    if (page < pageCount - 1) setPageIndex(page + 1)
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </UIPagination>
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
