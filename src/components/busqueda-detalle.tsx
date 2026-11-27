import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { cn } from "@/lib/utils"

/**
 * Buscador de los «Ver detalle» largos (CLAUDE.md §13): filtra los datos de las fichas por etiqueta o valor,
 * resalta lo encontrado y oculta los bloques que se quedan sin datos. Sin texto, el detalle se ve igual.
 *
 * Piezas:
 * - `DetalleConBusqueda`: la línea del buscador (a la izquierda) con las acciones (a la derecha), el contador
 *   debajo y el aviso de «sin coincidencias». Envuelve el contenido del detalle.
 * - `FichaDatos` lee la búsqueda sola (filtra y resalta sus pares); los pares visibles llevan `data-par-ficha`.
 * - `BloqueBuscable`: título + ficha (o cualquier grupo de fichas) que se oculta si no le queda ningún par.
 *   Con `contar`, cuenta como «sección» en el contador.
 */
export const BusquedaDetalleContext = createContext("")

export const useBusquedaDetalle = () => useContext(BusquedaDetalleContext)

/**
 * La búsqueda coincide con el título del bloque que contiene a este dato («acudiente» en «Información del
 * acudiente»): el bloque se muestra entero, y sus datos cuentan como coincidencias aunque no tengan el texto.
 */
export const CoincideTodoContext = createContext(false)

/** Minúsculas y sin tildes, para que «matricula» encuentre «Matrícula». */
export const normalizarBusqueda = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

/** ¿El texto contiene la búsqueda? Sin búsqueda, siempre. */
export const coincideBusqueda = (texto: string, busqueda: string) => {
  const q = normalizarBusqueda(busqueda)
  return !q || normalizarBusqueda(texto).includes(q)
}

/** Resalta las apariciones de la búsqueda en un texto (en un solo span: las celdas de la ficha son flex). */
export function Resaltado({ texto, busqueda }: { texto: string; busqueda: string }) {
  const q = normalizarBusqueda(busqueda)
  if (!q) return <>{texto}</>
  const base = texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  // NFD solo separa las tildes: si la longitud cambia, el texto tiene algo raro y se muestra sin resaltar.
  if (base.length !== texto.length) return <>{texto}</>
  const partes: ReactNode[] = []
  let desde = 0
  for (let i = base.indexOf(q); i !== -1; i = base.indexOf(q, i + q.length)) {
    if (i > desde) partes.push(texto.slice(desde, i))
    partes.push(
      <mark key={i} className="rounded-xs bg-yellow-22 px-0.5 text-foreground ring-1 ring-yellow-stroke">
        {texto.slice(i, i + q.length)}
      </mark>,
    )
    desde = i + q.length
  }
  partes.push(texto.slice(desde))
  return <span>{partes}</span>
}

/**
 * Bloque de un detalle (título + ficha, un acordeón…): mientras se busca, se oculta si no contiene ningún dato
 * que coincida. `contar` lo suma a «N datos en M secciones» (solo en los bloques más internos).
 */
export function BloqueBuscable({
  children,
  className,
  contar = false,
}: {
  children: ReactNode
  className?: string
  contar?: boolean
}) {
  const busqueda = useBusquedaDetalle()
  const buscando = normalizarBusqueda(busqueda) !== ""
  const ref = useRef<HTMLDivElement>(null)
  const [vacio, setVacio] = useState(false)
  useLayoutEffect(() => {
    setVacio(buscando && !ref.current?.querySelector("[data-par-ficha]"))
  }, [buscando, busqueda, children])
  return (
    <div ref={ref} className={className} hidden={vacio} data-seccion-detalle={contar ? "" : undefined}>
      {children}
    </div>
  )
}

/**
 * Detalle largo con buscador. El buscador va a la izquierda y `acciones` a la derecha, en la misma línea y
 * alineados abajo (regla de las pantallas de lista); el contador va debajo del buscador.
 */
export function DetalleConBusqueda({
  acciones,
  children,
  className,
  etiqueta = "Buscar un dato o valor",
  onBuscandoChange,
}: {
  acciones?: ReactNode
  children: ReactNode
  className?: string
  etiqueta?: string
  /** Avisa si hay texto: la página abre sus acordeones mientras se busca (los cerrados no muestran datos). */
  onBuscandoChange?: (buscando: boolean) => void
}) {
  const [busqueda, setBusquedaInterna] = useState("")
  const setBusqueda = (texto: string) => {
    setBusquedaInterna(texto)
    onBuscandoChange?.(normalizarBusqueda(texto) !== "")
  }
  const contenedor = useRef<HTMLDivElement>(null)
  const [conteo, setConteo] = useState({ datos: 0, secciones: 0 })
  const buscando = normalizarBusqueda(busqueda) !== ""

  // Después de que fichas y bloques se filtraron: cuántos pares quedan y en cuántas secciones.
  useLayoutEffect(() => {
    const raiz = contenedor.current
    if (!raiz || !buscando) return
    const secciones = [...raiz.querySelectorAll("[data-seccion-detalle]")].filter((s) => s.querySelector("[data-par-ficha]"))
    setConteo({ datos: raiz.querySelectorAll("[data-par-ficha]").length, secciones: secciones.length })
  }, [busqueda, buscando, children])

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1.5">
        {/* Una sola línea desde sm: las acciones no se encogen y el buscador toma lo que queda (no las empuja abajo). */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SearchQueryBar
            className="min-w-56 flex-1"
            id="buscar-en-detalle"
            label={etiqueta}
            placeholder={etiqueta}
            value={busqueda}
            onValueChange={setBusqueda}
            onClearAll={() => setBusqueda("")}
            activeFilterCount={0}
          />
          {acciones ? <div className="shrink-0">{acciones}</div> : null}
        </div>
        {buscando ? (
          <p role="status" className="text-xs text-muted-foreground">
            {conteo.datos === 0
              ? "Sin coincidencias"
              : `${conteo.datos} ${conteo.datos === 1 ? "dato" : "datos"} en ${conteo.secciones} ${conteo.secciones === 1 ? "sección" : "secciones"}`}
          </p>
        ) : null}
      </div>
      {buscando && conteo.datos === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Ningún dato coincide con «{busqueda.trim()}». Pruebe con otra palabra.
        </p>
      ) : null}
      {/* Las secciones del detalle van separadas (antes quedaban pegadas dentro de un div sin espacio). */}
      <div ref={contenedor} className="flex flex-col gap-4">
        <BusquedaDetalleContext value={busqueda}>{children}</BusquedaDetalleContext>
      </div>
    </div>
  )
}
