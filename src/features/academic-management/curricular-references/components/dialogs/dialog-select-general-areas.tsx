import { useLayoutEffect, useMemo, useRef, useState } from "react"
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

function chunkRows(areas: GeneralArea[]): GeneralArea[][] {
  const grid: GeneralArea[][] = []
  for (let i = 0; i < areas.length; i += COLUMNS) {
    grid.push(areas.slice(i, i + COLUMNS))
  }
  return grid
}

const CHIP_GAP_PX = 4
const MIN_CHIP_WIDTH_PX = 40

function useAdaptiveVisibleChips(names: string[]) {
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(names.length)
  const [truncatedLast, setTruncatedLast] = useState(false)
  const namesKey = names.join(" ")

  useLayoutEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) {
      setVisibleCount(names.length)
      setTruncatedLast(false)
      return
    }

    function recalc() {
      if (!container || !measure) return
      const available = container.clientWidth
      const chipEls = Array.from(measure.querySelectorAll<HTMLElement>("[data-measure-chip]"))
      const extraEl = measure.querySelector<HTMLElement>("[data-measure-extra]")
      const extraWidth = extraEl?.offsetWidth ?? 0

      let used = 0
      let count = 0
      let lastTruncated = false
      for (let i = 0; i < chipEls.length; i++) {
        const gapBefore = i > 0 ? CHIP_GAP_PX : 0
        const remaining = chipEls.length - (i + 1)
        const extraSpace = remaining > 0 ? extraWidth + CHIP_GAP_PX : 0
        const budget = available - used - gapBefore - extraSpace
        const fullWidth = chipEls[i].offsetWidth

        if (budget < MIN_CHIP_WIDTH_PX) break

        used += gapBefore + Math.min(fullWidth, budget)
        count++
        if (fullWidth > budget) {
          lastTruncated = true
          break
        }
      }
      setVisibleCount(names.length > 0 ? Math.max(count, 1) : 0)
      setTruncatedLast(lastTruncated)
    }

    recalc()
    const ro = new ResizeObserver(recalc)
    ro.observe(container)
    return () => ro.disconnect()
  }, [namesKey])

  return { containerRef, measureRef, visibleCount, truncatedLast }
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
  const { containerRef, measureRef, visibleCount, truncatedLast } = useAdaptiveVisibleChips(selectedNames)
  const visibleChips = selectedNames.slice(0, visibleCount)
  const extra = selectedNames.length - visibleChips.length

  function removeSelected(areaId: number) {
    onChange(value.filter((id) => id !== areaId))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <div
        className={cn(
          inputVariants({ variant: resolvedVariant }),
          inputTriggerVariants({ variant: resolvedVariant }),
          "relative flex h-auto min-h-11 items-center gap-1.5 text-left",
          resolvedVariant === "outlined" && "bg-background",
        )}
      >
        <DialogTrigger
          render={
            <button
              type="button"
              id={id}
              aria-invalid={invalid}
              className="absolute inset-0 z-0 cursor-pointer bg-transparent outline-none"
            />
          }
        />
        <div
          ref={containerRef}
          className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-1 overflow-hidden"
        >
          {selectedNames.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <>
              {visibleChips.map((name, i) => {
                const isLastVisible = i === visibleChips.length - 1
                const canTruncate = isLastVisible && truncatedLast
                const areaId = value.find((id) => areaById.get(id)?.nombre === name)
                return (
                  <Badge
                    key={name}
                    variant="soft"
                    color="muted"
                    className={cn(
                      "text-xs normal-case tracking-normal",
                      canTruncate ? "min-w-0 shrink justify-start" : "shrink-0",
                    )}
                    title={name}
                  >
                    {canTruncate ? <span className="block truncate">{name}</span> : name}
                    {areaId != null && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeSelected(areaId)
                        }}
                        aria-label={`Quitar ${name}`}
                        data-icon="inline-end"
                        className="pointer-events-auto inline-flex cursor-pointer items-center hover:text-foreground"
                      >
                        <XIcon className="size-3" />
                      </button>
                    )}
                  </Badge>
                )
              })}
              {extra > 0 && (
                <Badge
                  variant="soft"
                  color="muted"
                  className="shrink-0 text-xs normal-case tracking-normal"
                >
                  +{extra}
                </Badge>
              )}
            </>
          )}
        </div>
        <div
          ref={measureRef}
          aria-hidden
          className="pointer-events-none invisible absolute flex items-center gap-1 whitespace-nowrap"
          style={{ top: -9999, left: -9999 }}
        >
          {selectedNames.map((name) => (
            <Badge
              key={name}
              data-measure-chip
              variant="soft"
              color="muted"
              className="text-xs normal-case tracking-normal"
            >
              {name}
              {/* Mismo botón "X" que el chip real: si no se mide acá, el
                  cálculo de cuántos chips caben queda corto y el visible
                  termina recortado a una sola letra para hacerle lugar. */}
              <button
                type="button"
                tabIndex={-1}
                data-icon="inline-end"
                className="pointer-events-none inline-flex items-center"
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
          <Badge
            data-measure-extra
            variant="soft"
            color="muted"
            className="text-xs normal-case tracking-normal"
          >
            +{selectedNames.length}
          </Badge>
        </div>
        <CaretDownIcon className="pointer-events-none relative z-10 size-3.5 shrink-0 text-muted-foreground" />
      </div>
      <DialogPortal>
        <DialogOverlay forceRender className="bg-black/30" />
      </DialogPortal>
      <DialogContent
        className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-4xl"
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Seleccionar áreas o dimensiones</DialogTitle>
        </DialogHeader>

        {/* Único bloque con scroll: título, paginación y acciones quedan
            fijos afuera — así la grilla de áreas no empuja el botón
            "Aceptar" fuera de la pantalla en modales altos. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4">
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
