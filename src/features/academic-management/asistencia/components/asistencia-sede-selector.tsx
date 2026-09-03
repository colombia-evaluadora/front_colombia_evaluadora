import * as React from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CaretDownIcon, CaretLeftIcon, CaretRightIcon } from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { useSedeOptionsQuery } from "@/features/establishment/academic-period/api/query/use-sede-options"

interface AsistenciaSedeSelectorProps {
  sedeId: number | null
  onChange: (sedeId: number) => void
}

const SCROLL_STEP = 160


export function AsistenciaSedeSelector({ sedeId, onChange }: AsistenciaSedeSelectorProps) {
  const { data: sedes, isPending } = useSedeOptionsQuery()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const buttonRefs = React.useRef(new Map<number, HTMLButtonElement>())
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  const updateScrollState = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  React.useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el) return

    const observer = new ResizeObserver(updateScrollState)
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateScrollState, sedes])

  React.useEffect(() => {
    if (sedeId === null) return
    buttonRefs.current.get(sedeId)?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    })
  }, [sedeId])

  function scrollBy(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" })
  }

  if (isPending) {
    return (
      <div className="flex gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>
    )
  }

  return (
    <div className="flex min-w-0 max-w-96 items-center gap-1">
      {canScrollLeft && (
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          size="icon-xs"
          aria-label="Ver sedes anteriores"
          className="shrink-0"
          onClick={() => scrollBy(-SCROLL_STEP)}
        >
          <CaretLeftIcon />
        </Button>
      )}

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        role="group"
        aria-label="Sede"
        className={cn(
          "flex min-w-0 gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          canScrollRight && "[mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)]",
        )}
      >
        {(sedes ?? []).map((sede) => (
          <Button
            key={sede.pk_sede}
            ref={(el) => {
              if (el) buttonRefs.current.set(sede.pk_sede, el)
              else buttonRefs.current.delete(sede.pk_sede)
            }}
            type="button"
            size="xs"
            variant={sede.pk_sede === sedeId ? "ghost" : "soft"}
            color="muted"
            className={cn(
              "shrink-0 rounded-sm",
              sede.pk_sede === sedeId
                ? "bg-card font-semibold text-foreground shadow-sm hover:bg-card"
                : "hover:shadow-sm",
            )}
            onClick={() => onChange(sede.pk_sede)}
          >
            {sede.nombre}
          </Button>
        ))}
      </div>

      {canScrollRight && (
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          size="icon-xs"
          aria-label="Ver más sedes"
          className="shrink-0"
          onClick={() => scrollBy(SCROLL_STEP)}
        >
          <CaretRightIcon />
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              size="icon-xs"
              aria-label="Ver todas las sedes"
              className="shrink-0"
            />
          }
        >
          <CaretDownIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {(sedes ?? []).map((sede) => (
            <DropdownMenuItem
              key={sede.pk_sede}
              className={cn(sede.pk_sede === sedeId && "font-semibold")}
              onClick={() => onChange(sede.pk_sede)}
            >
              {sede.nombre}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
