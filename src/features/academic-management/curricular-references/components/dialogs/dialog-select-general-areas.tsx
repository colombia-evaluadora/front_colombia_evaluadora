import { useMemo, useState } from "react"
import { CaretDownIcon, CheckIcon, MagnifyingGlassIcon, XIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
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
import type { GeneralArea } from "@/features/establishment/academic-period/api/types/general-area"

// Mismo diseño que `SelectGeneralAreaDialog` (buscador + grilla paginada de
// 3×15): con ~300 áreas generales, un dropdown con checkboxes se vuelve
// inmanejable — el usuario pidió reusar el selector con buscador que ya
// existe en Área/Asignatura, en versión multi-selección.
const COLUMNS = 3
const ROWS = 15
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

function chunkRows(areas: GeneralArea[]): GeneralArea[][] {
  const grid: GeneralArea[][] = []
  for (let i = 0; i < areas.length; i += COLUMNS) {
    grid.push(areas.slice(i, i + COLUMNS))
  }
  return grid
}

interface SelectGeneralAreasDialogProps {
  value: number[]
  onChange: (ids: number[]) => void
  id?: string
  invalid?: boolean
  placeholder?: string
}

export function SelectGeneralAreasDialog({
  value,
  onChange,
  id,
  invalid,
  placeholder = "Seleccionar",
}: SelectGeneralAreasDialogProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  // Borrador propio del diálogo: los cambios solo pegan en `value` al
  // confirmar con "Aceptar" — así "Cancelar" no deja a medio marcar.
  const [draft, setDraft] = useState<number[]>(value)

  const resolvedVariant = useInputVariant()

  const { data: areas = [] } = useGeneralAreasQuery()
  const areaById = new Map(areas.map((area) => [area.id, area]))

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

  function toggle(areaId: number) {
    setDraft((prev) => (prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId]))
  }

  function handleAccept() {
    onChange(draft)
    setOpen(false)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      // Arranca cada apertura sincronizado con lo ya guardado.
      setDraft(value)
    } else {
      setSearch("")
      setPageIndex(0)
    }
  }

  const selectedNames = value.map((areaId) => areaById.get(areaId)?.nombre).filter(Boolean) as string[]
  const visibleChips = selectedNames.slice(0, 2)
  const extra = selectedNames.length - visibleChips.length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            id={id}
            aria-invalid={invalid}
            className={cn(
              inputVariants({ variant: resolvedVariant }),
              inputTriggerVariants({ variant: resolvedVariant }),
              "flex h-auto min-h-11 items-center justify-between gap-1.5 text-left",
              resolvedVariant === "outlined" && "bg-background",
            )}
          />
        }
      >
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {selectedNames.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <>
              {visibleChips.map((name) => (
                <Badge key={name} variant="soft" color="muted" className="text-xs" title={name}>
                  {name}
                </Badge>
              ))}
              {extra > 0 && (
                <Badge variant="soft" color="muted" className="text-xs normal-case tracking-normal">
                  +{extra}
                </Badge>
              )}
            </>
          )}
        </div>
        <CaretDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </DialogTrigger>

      {/* `forceRender`: este diálogo se abre anidado dentro del de "Agregar
          referente curricular" (ya abierto) — sin forzar su propio overlay,
          no bloquea el fondo (mismo fix que `SelectGeneralAreaDialog`). */}
      <DialogPortal>
        <DialogOverlay forceRender className="bg-black/30" />
      </DialogPortal>
      <DialogContent className="sm:max-w-4xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Seleccionar áreas o dimensiones</DialogTitle>
        </DialogHeader>

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

        {draft.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {draft.length === 1 ? "1 área seleccionada" : `${draft.length} áreas seleccionadas`}
          </p>
        )}

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
                      const selected = draft.includes(area.id)
                      return (
                        <TableCell key={c} className="border-r p-0 last:border-r-0">
                          <button
                            type="button"
                            title={area.nombre}
                            onClick={() => toggle(area.id)}
                            className={cn(
                              "flex w-full min-w-0 items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50",
                              selected && "bg-muted font-medium text-primary hover:bg-muted",
                            )}
                          >
                            <Checkbox checked={selected} className="pointer-events-none shrink-0" />
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
          <Button size="sm" type="button" color="primary" onClick={handleAccept}>
            <CheckIcon data-icon="inline-start" />
            Aceptar
          </Button>
          <DialogClose render={<Button size="sm" type="button" variant="fill" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
