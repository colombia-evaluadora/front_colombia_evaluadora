import { useMemo, useState } from "react"
import { CaretDownIcon, CheckIcon, MagnifyingGlassIcon, XIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
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
import { useDeleteAreaSubject } from "@/features/establishment/academic-period/api/mutations/delete-area-subject"
import type { GeneralArea } from "@/features/establishment/academic-period/api/types/general-area"

const COLUMNS = 3
const ROWS = 6
const PAGE_SIZE = COLUMNS * ROWS

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
  /** Acta 19-sep-2026: al elegir la asignatura general de una asignatura
   *  (a diferencia del área general) no se puede borrar del catálogo — es
   *  una lista predefinida de ley. Default `true` para no tocar el
   *  comportamiento existente del selector de área. */
  allowDelete?: boolean
}

export function SelectGeneralAreaDialog({
  value,
  onChange,
  id,
  invalid,
  allowDelete = true,
}: SelectGeneralAreaDialogProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const resolvedVariant = useInputVariant()

  const { data: areas = [] } = useGeneralAreasQuery()
  const deleteArea = useDeleteAreaSubject()

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

  async function handleDelete(area: GeneralArea): Promise<boolean> {
    try {
      const result = await deleteArea.mutateAsync(area.id)
      if (result.status === "error") {
        setError(result.message)
        return true
      }
    } catch (err) {
      setError(getErrorMessage(err))
      return true
    }
    setError(null)
    if (value === area.nombre) onChange("")
    return true
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setSearch("")
          setPageIndex(0)
          setError(null)
        }
      }}
    >
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

      <DialogPortal>
        <DialogOverlay forceRender className="bg-black/30" />
      </DialogPortal>
      <DialogContent
        className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-4xl"
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Agregar área</DialogTitle>
        </DialogHeader>


        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4">
            {error && <p className="text-sm text-red">{error}</p>}

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
                              <div
                                className={cn(
                                  "flex min-w-0 items-center hover:bg-muted/50",
                                  selected && "bg-muted hover:bg-muted",
                                )}
                              >
                                <button
                                  type="button"
                                  title={area.nombre}
                                  onClick={() => handleSelect(area.nombre)}
                                  className={cn(
                                    "flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm",
                                    selected && "font-medium text-primary",
                                  )}
                                >
                                  {selected && <CheckIcon className="size-4 shrink-0" />}
                                  <span className="min-w-0 flex-1 truncate">{area.nombre}</span>
                                </button>
                                {allowDelete && (
                                  <ConfirmRemoveButton
                                    label={`Eliminar ${area.nombre}`}
                                    description={`Se eliminará permanentemente el área ${area.nombre}. Esta acción no se puede deshacer.`}
                                    className="mr-1 shrink-0 text-muted-foreground hover:text-foreground"
                                    onConfirm={() => handleDelete(area)}
                                  />
                                )}
                              </div>
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-center gap-2">
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

        <DialogFooter className="shrink-0">
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
