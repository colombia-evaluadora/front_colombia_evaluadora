import { useMemo, useState } from "react"
import { CaretDownIcon, CheckIcon, MagnifyingGlassIcon, XIcon } from "@/components/ui/icons"

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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

import { useGeneralAreasQuery } from "@/features/establishment/academic-period/api/query/use-general-areas"
import type { GeneralArea } from "@/features/establishment/academic-period/api/types/general-area"

// Grilla de áreas: 3 columnas × 15 filas por página → 45 áreas por página.
const COLUMNS = 3
const ROWS = 15
const PAGE_SIZE = COLUMNS * ROWS

// Mismo cálculo de ventana de páginas que `components/pagination.tsx` (no se
// puede reusar directo: ese componente asume paginación server-side con
// selector de "Entradas", que acá no aplica).
function buildPageRange(current: number, total: number): (number | "ellipsis")[] {
  const window = new Set<number>([1, total, current - 1, current, current + 1])
  const items: (number | "ellipsis")[] = []
  let last = 0
  for (const p of [...window].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)) {
    if (last && p - last > 1) items.push("ellipsis")
    items.push(p)
    last = p
  }
  return items
}

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

      <DialogContent className="sm:max-w-4xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Agregar área</DialogTitle>
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
        <div className="min-w-0">
          <Table className="table-fixed">
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
                            title={area.nombre}
                            onClick={() => handleSelect(area.nombre)}
                            className={cn(
                              "flex w-full min-w-0 items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50",
                              selected && "bg-muted font-medium text-primary hover:bg-muted",
                            )}
                          >
                            {selected && <CheckIcon className="size-4 shrink-0" />}
                            <span className="min-w-0 flex-1 truncate">{area.nombre}</span>
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

        {/* Paginación (3 × 15 = 45 áreas por página) — mismo diseño que la
            paginación compartida (números de página, elipsis, activa en
            fill primario), pero sin selector de "Entradas" (el tamaño de
            página es fijo acá) y con Atrás/Siguiente solo ícono. */}
        <div className="flex items-center justify-center gap-2">
          <UIPagination className="mx-0 w-auto justify-center">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={page > 0 ? "#" : undefined}
                  text=""
                  aria-label="Página anterior"
                  className={page === 0 ? "pointer-events-none opacity-50" : ""}
                  onClick={(e) => {
                    e.preventDefault()
                    if (page > 0) setPageIndex(page - 1)
                  }}
                />
              </PaginationItem>

              {buildPageRange(page + 1, pageCount).map((item, i) =>
                item === "ellipsis" ? (
                  <PaginationItem key={`e-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      href="#"
                      isActive={item === page + 1}
                      className={cn(
                        item === page + 1 &&
                          "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:border-primary",
                      )}
                      onClick={(e) => {
                        e.preventDefault()
                        setPageIndex(item - 1)
                      }}
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}

              <PaginationItem>
                <PaginationNext
                  href={page < pageCount - 1 ? "#" : undefined}
                  text=""
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
          <DialogClose
            render={<Button size="sm" type="button" variant="fill" color="neutral" />}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
