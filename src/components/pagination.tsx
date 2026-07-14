import {
  Pagination as UIPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import { Field, FieldLabel } from "@/components/ui/field"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PaginationProps {
  pageIndex: number
  pageCount: number
  canPrev: boolean
  canNext: boolean
  totalCount: number
  pageSize: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
}

function buildPageRange(current: number, total: number): (number | "ellipsis")[] {
  // Ventana con primera y última fija, y elippsis cuando hay huecos.
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

export function Pagination({
  pageIndex,
  pageCount,
  canPrev,
  canNext,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const range = buildPageRange(pageIndex + 1, pageCount)

  return (
    <div className="flex items-center justify-between gap-2 px-2 py-4">
      <p className="shrink-0 text-sm text-muted-foreground">
        {totalCount} registro(s)
      </p>

      <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-6">
        <Field orientation="horizontal" className="hidden w-fit lg:flex">
          <FieldLabel htmlFor="rows-per-page" className="text-sm">
            Filas
          </FieldLabel>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger id="rows-per-page" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <UIPagination className="mx-0 w-auto justify-center">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={canPrev ? `#page=${pageIndex}` : undefined}
                aria-label="Página anterior"
                text="Atrás"
                className={!canPrev ? "pointer-events-none opacity-50" : ""}
                onClick={(e) => {
                  e.preventDefault()
                  if (canPrev) onPageChange(pageIndex - 1)
                }}
              />
            </PaginationItem>

            <PaginationItem className="sm:hidden">
              <span className="px-2 text-sm text-muted-foreground">
                {pageIndex + 1}/{pageCount}
              </span>
            </PaginationItem>

            {range.map((item, i) =>
              item === "ellipsis" ? (
                <PaginationItem key={`e-${i}`} className="hidden sm:list-item">
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item} className="hidden sm:list-item">
                  <PaginationLink
                    href={`#page=${item}`}
                    isActive={item === pageIndex + 1}
                    onClick={(e) => {
                      e.preventDefault()
                      onPageChange(item - 1)
                    }}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                href={canNext ? `#page=${pageIndex + 2}` : undefined}
                aria-label="Página siguiente"
                text="Sig."
                className={!canNext ? "pointer-events-none opacity-50" : ""}
                onClick={(e) => {
                  e.preventDefault()
                  if (canNext) onPageChange(pageIndex + 1)
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </UIPagination>
      </div>
    </div>
  )
}
