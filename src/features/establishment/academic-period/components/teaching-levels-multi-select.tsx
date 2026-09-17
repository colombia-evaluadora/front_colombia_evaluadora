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

const OVERFLOW_CHIP_RESERVE_PX = 44
const BADGE_GAP_PX = 6

export function TeachingLevelsMultiSelect({
  id,
  levels,
  value,
  onChange,
  invalid,
}: TeachingLevelsMultiSelectProps) {
  const selected = levels.filter((level) => value.includes(level.id))
  const resolvedVariant = useInputVariant()
  const selectedKey = selected.map((level) => level.id).join(",")
  const chipsRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [truncatedIndex, setTruncatedIndex] = useState(-1)
  const [overflowCount, setOverflowCount] = useState(0)

  useLayoutEffect(() => {
    const container = chipsRef.current
    const ghost = measureRef.current
    if (!container || !ghost) return

    const measure = () => {
      const containerWidth = container.clientWidth
      const badges = Array.from(ghost.children) as HTMLElement[]
      if (containerWidth === 0 || badges.length === 0) {
        setTruncatedIndex(-1)
        setOverflowCount(0)
        return
      }

      let accumulatedWidth = 0
      let truncatedIdx = -1

      for (let i = 0; i < badges.length; i++) {
        const badgeWidth = badges[i].offsetWidth
        const gapWidth = i > 0 ? BADGE_GAP_PX : 0
        const projected = accumulatedWidth + gapWidth + badgeWidth
        const remainingChips = badges.length - i - 1
        const reserveForN = remainingChips > 0 ? OVERFLOW_CHIP_RESERVE_PX : 0

        if (projected + reserveForN > containerWidth) {
          truncatedIdx = i
          break
        }

        accumulatedWidth = projected
      }

      const overflow = truncatedIdx >= 0 ? badges.length - truncatedIdx - 1 : 0
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
              "flex h-auto min-h-11 items-center justify-between gap-2 text-left",
            )}
          />
        }
      >
        <div
          ref={chipsRef}
          className="relative flex flex-1 flex-nowrap gap-1.5 overflow-hidden min-w-0"
        >
          <div
            ref={measureRef}
            aria-hidden
            className="pointer-events-none invisible absolute top-0 left-0 flex w-max flex-nowrap gap-1.5"
          >
            {selected.map((level) => (
              <Badge key={level.id} variant="soft" color="muted" className="text-xs normal-case">
                <span>{level.nombre}</span>
                <span data-icon="inline-end">
                  <XIcon className="size-3" />
                </span>
              </Badge>
            ))}
          </div>

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
                    title={level.nombre}
                    className={cn(
                      "text-xs normal-case",
                      !isTruncated && !isHidden && "shrink-0",
                      isTruncated && "min-w-0 flex-1",
                      isHidden && "hidden",
                    )}
                  >
                    <span className={cn(isTruncated && "min-w-0 flex-1 truncate")}>
                      {level.nombre}
                    </span>
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
            title={level.nombre}
          >
            {level.nombre}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
