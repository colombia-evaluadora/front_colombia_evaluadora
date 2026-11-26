import { useLayoutEffect, useRef, useState, type RefObject } from "react"

import { Badge } from "@/components/ui/badge"
import { XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

export interface ChipSeleccion<T extends string | number> {
  id: T
  label: string
  /** Fijo: siempre elegido y no se puede quitar, así que su chip va sin «×» (p. ej. las causas predeterminadas). */
  fijo?: boolean
}

/**
 * Cuántos chips entran en una sola línea del contenedor: arranca con todos y, mientras desborde, quita
 * uno (el «+N» que aparece también tiene que entrar). Vuelve a medir al cambiar la cantidad o el ancho.
 */
function useChipsVisibles(contenedorRef: RefObject<HTMLDivElement | null>, total: number, firma: string): number {
  const [cantidad, setCantidad] = useState(total)
  // Cada cambio de ancho del campo pide una medición nueva aunque `cantidad` no cambie: sin esto, un campo
  // que se mide oculto (ancho 0) o que se ensancha después no volvía a recortar y el último chip quedaba
  // cortado sin «+N» (pasaba en «Causas de inasistencia reservadas»).
  const [medida, setMedida] = useState(0)

  // Con otros chips (cantidad o textos: las etiquetas pueden llegar después que los ids) se vuelve a probar
  // con todos.
  useLayoutEffect(() => {
    setCantidad(total)
    setMedida((m) => m + 1)
  }, [total, firma])

  useLayoutEffect(() => {
    const el = contenedorRef.current
    if (el && el.clientWidth > 0 && el.scrollWidth > el.clientWidth && cantidad > 0) setCantidad((c) => c - 1)
  }, [contenedorRef, cantidad, medida])

  useLayoutEffect(() => {
    const el = contenedorRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const observador = new ResizeObserver(() => {
      setCantidad(total)
      setMedida((m) => m + 1)
    })
    observador.observe(el)
    return () => observador.disconnect()
  }, [contenedorRef, total])

  return cantidad
}

interface Props<T extends string | number> {
  elementos: ChipSeleccion<T>[]
  /** Quitar un elemento desde su «×». Sin esta función (o deshabilitado) los chips no llevan «×». */
  onQuitar?: (id: T) => void
  deshabilitado?: boolean
  className?: string
}

/**
 * Selección de un campo de varias opciones como chips en una línea, con «+N» para los que no caben: el
 * mismo aspecto en todo el proyecto (Grados del servicio social, Estudiantes, Establecimientos a cargo…).
 * Va dentro del recuadro del campo; el contenedor no recibe clics (`pointer-events-none`) para que lleguen
 * al campo y abran la lista, y solo la «×» de cada chip los recibe.
 */
export function ChipsSeleccion<T extends string | number>({ elementos, onQuitar, deshabilitado, className }: Props<T>) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const visibles = useChipsVisibles(contenedorRef, elementos.length, elementos.map((e) => e.label).join("\u0000"))
  const mostrados = elementos.slice(0, visibles)
  const resto = elementos.length - mostrados.length
  const conQuitar = Boolean(onQuitar) && !deshabilitado

  return (
    <div
      ref={contenedorRef}
      className={cn("pointer-events-none flex min-w-0 flex-1 flex-nowrap items-center gap-1 overflow-hidden", className)}
    >
      {mostrados.map((e) => (
        <Badge key={e.id} variant="soft" color="muted" className="text-xs" title={e.label}>
          {/* En un `<span>`: el Badge soft pinta un punto de estado cuando solo lleva texto (chip fijo, sin «×»). */}
          <span>{e.label}</span>
          {conQuitar && !e.fijo && (
            <button
              type="button"
              aria-label={`Quitar ${e.label}`}
              data-icon="inline-end"
              className="pointer-events-auto inline-flex cursor-pointer items-center hover:text-foreground"
              // Sin esto el clic también abre (o cierra) la lista del campo.
              onPointerDown={(ev) => {
                ev.preventDefault()
                ev.stopPropagation()
              }}
              onClick={(ev) => {
                ev.preventDefault()
                ev.stopPropagation()
                onQuitar?.(e.id)
              }}
            >
              <XIcon className="size-3" />
            </button>
          )}
        </Badge>
      ))}
      {resto > 0 && (
        <Badge
          variant="soft"
          color="muted"
          className="text-xs normal-case tracking-normal"
          title={elementos
            .slice(visibles)
            .map((e) => e.label)
            .join(", ")}
        >
          <span>+{resto}</span>
        </Badge>
      )}
    </div>
  )
}
