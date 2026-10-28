import { useEffect, useRef, useState, type ReactNode } from "react"

import { TabsList } from "@/components/ui/tabs"
import { CaretLeftIcon, CaretRightIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

// Clases para cada TabsTrigger: texto normal, subrayado del color primario.
export const PERIOD_TAB_TRIGGER =
  "flex-none px-2 text-sm font-normal tracking-normal normal-case text-muted-foreground hover:text-foreground data-active:text-primary after:bg-primary group-data-horizontal/tabs:after:bottom-[-1px] not-data-active:after:bg-muted-foreground/60 not-data-active:hover:after:opacity-100"

// Pestañas del período en una sola fila: las que no entran se recorren con
// las flechas de los extremos (o con scroll/arrastre en touch).
export function ScrollTabsList({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: false, end: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () =>
      setEdges({
        start: el.scrollLeft > 1,
        end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      })
    update()
    el.addEventListener("scroll", update, { passive: true })
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update)
    observer?.observe(el)
    return () => {
      el.removeEventListener("scroll", update)
      observer?.disconnect()
    }
  }, [])

  const scrollBy = (direction: 1 | -1) =>
    ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.6, behavior: "smooth" })

  const arrow =
    "absolute top-0 bottom-px z-10 flex w-9 items-center bg-background text-muted-foreground hover:text-foreground"

  return (
    <div className="relative border-b border-border">
      {edges.start && (
        <button
          type="button"
          aria-label="Ver pestañas anteriores"
          onClick={() => scrollBy(-1)}
          className={cn(arrow, "left-0 justify-start")}
        >
          <CaretLeftIcon className="size-5" />
        </button>
      )}
      <div
        ref={ref}
        className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <TabsList variant="line" className="h-11 w-max justify-start gap-4 p-0">
          {children}
        </TabsList>
      </div>
      {edges.end && (
        <button
          type="button"
          aria-label="Ver más pestañas"
          onClick={() => scrollBy(1)}
          className={cn(arrow, "right-0 justify-end")}
        >
          <CaretRightIcon className="size-5" />
        </button>
      )}
    </div>
  )
}
