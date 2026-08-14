import { useLayoutEffect, useRef, useState } from "react"

import { CaretDownIcon, XIcon } from "@/components/ui/icons"

import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import type { TeachingLevel } from "@/features/establishment/academic-period/api/types/rating-scales"

interface TeachingLevelsMultiSelectProps {
  id?: string
  levels: TeachingLevel[]
  value: number[]
  onChange: (ids: number[]) => void
  invalid?: boolean
}

// Ancho reservado para el chip "+N" del overflow. Cubre "+99" + padding
// interno (px-2) + borde del Badge. Si la estimación queda corta, el
// `overflow-hidden` recorta el "+N" sin romper el layout — el usuario ve
// menos overflow pero nunca un desborde.
const OVERFLOW_CHIP_RESERVE_PX = 44
const BADGE_GAP_PX = 6 // gap-1.5 a 16px base

// Chips en el trigger + dropdown con checkboxes al estilo de "Columnas
// visibles" (DataTableViewOptions).
export function TeachingLevelsMultiSelect({
  id,
  levels,
  value,
  onChange,
  invalid,
}: TeachingLevelsMultiSelectProps) {
  const selected = levels.filter((level) => value.includes(level.id))
  const resolvedVariant = useInputVariant()

  // Firma estable del arreglo para que el efecto no se reejecute en cada
  // render (filter devuelve un array nuevo cada vez aunque los IDs no cambien).
  const selectedKey = selected.map((level) => level.id).join(",")

  const chipsRef = useRef<HTMLDivElement>(null)
  // `truncatedIndex` es el chip que recibe el `truncate` visual — el último
  // que entra, dejando paso al "+N" y a los que se esconden detrás. Los chips
  // con índice mayor se marcan `hidden` (siguen en el DOM para poder medirse
  // en el siguiente ciclo si cambia la selección).
  const [truncatedIndex, setTruncatedIndex] = useState(-1)
  const [overflowCount, setOverflowCount] = useState(0)

  useLayoutEffect(() => {
    const container = chipsRef.current
    if (!container) return

    const measure = () => {
      const containerWidth = container.clientWidth
      if (containerWidth === 0) {
        setTruncatedIndex(-1)
        setOverflowCount(0)
        return
      }

      const badges = Array.from(
        container.querySelectorAll<HTMLElement>("[data-badge-id]"),
      )

      let accumulatedWidth = 0
      let truncatedIdx = -1

      for (let i = 0; i < badges.length; i++) {
        const badgeWidth = badges[i].offsetWidth
        const gapWidth = i > 0 ? BADGE_GAP_PX : 0
        const projected = accumulatedWidth + gapWidth + badgeWidth

        // Si quedan chips por venir, hay que reservar lugar al "+N" para no
        // pasarnos del borde. El último chip no necesita reserva — si no
        // entra igual lo truncamos, pero no hay nadie detrás.
        const remainingChips = badges.length - i - 1
        const reserveForN =
          remainingChips > 0 ? OVERFLOW_CHIP_RESERVE_PX : 0

        if (projected + reserveForN > containerWidth) {
          truncatedIdx = i
          break
        }

        accumulatedWidth = projected
      }

      const overflow =
        truncatedIdx >= 0 ? badges.length - truncatedIdx - 1 : 0
      setTruncatedIndex(truncatedIdx)
      setOverflowCount(overflow)
    }

    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [selectedKey])

  function toggle(levelId: number) {
    onChange(value.includes(levelId) ? value.filter((v) => v !== levelId) : [...value, levelId])
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            id={id}
            type="button"
            aria-invalid={invalid}
            className={cn(
              inputVariants({ variant: resolvedVariant }),
              inputTriggerVariants({ variant: resolvedVariant }),
              "flex h-auto min-h-10 items-center justify-between gap-2 text-left",
            )}
          />
        }
      >
        {/*
          `flex-nowrap overflow-hidden min-w-0` mantiene los chips en una sola
          línea: el contenedor recorta lo que sobre y el efecto decide cuál es
          el último visible (el que se trunca) antes de pintar el "+N". El
          `min-w-0` es para que `flex-1` achique al contenedor dentro del
          trigger en vez de empujarlo (el trigger es el que pone el ancho).
        */}
        <div
          ref={chipsRef}
          className="flex flex-1 flex-nowrap gap-1.5 overflow-hidden min-w-0"
        >
          {selected.length === 0 ? (
            <span className="text-muted-foreground">Seleccionar</span>
          ) : (
            <>
              {selected.map((level, i) => {
                const isTruncated = i === truncatedIndex
                const isHidden = truncatedIndex >= 0 && i > truncatedIndex

                return (
                  <Badge
                    key={level.id}
                    data-badge-id={level.id}
                    data-overflow={isHidden ? "true" : undefined}
                    variant="soft"
                    color="muted"
                    className={cn(
                      "text-xs normal-case",
                      // El Badge base viene con `shrink-0`: lo pisamos en el
                      // chip truncado con `flex-1 min-w-0` para que ceda
                      // espacio a los demás y pueda achicarse bajo su
                      // contenido (necesario para que `truncate` muestre "...").
                      !isTruncated && !isHidden && "shrink-0",
                      isTruncated && "min-w-0 flex-1",
                      isHidden && "hidden",
                    )}
                  >
                    <span
                      className={cn(
                        isTruncated && "min-w-0 flex-1 truncate",
                      )}
                    >
                      {level.nombre}
                    </span>
                    {/* El chip truncado no muestra × — ya está al límite de
                        espacio, sumarlo lo rompería. Los chips escondidos
                        tampoco (no son visibles). */}
                    {!isHidden && !isTruncated && (
                      <span
                        role="button"
                        tabIndex={-1}
                        aria-label={`Quitar ${level.nombre}`}
                        data-icon="inline-end"
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggle(level.id)
                        }}
                      >
                        <XIcon className="size-3" />
                      </span>
                    )}
                  </Badge>
                )
              })}
              {overflowCount > 0 && (
                <Badge
                  variant="soft"
                  color="muted"
                  className="text-xs normal-case shrink-0"
                  title={`${overflowCount} nivel${overflowCount === 1 ? "" : "es"} más`}
                >
                  +{overflowCount}
                </Badge>
              )}
            </>
          )}
        </div>
        <CaretDownIcon className="text-muted-foreground size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        {levels.map((level) => (
          <DropdownMenuCheckboxItem
            key={level.id}
            checked={value.includes(level.id)}
            onCheckedChange={() => toggle(level.id)}
            className="capitalize"
          >
            {level.nombre}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
