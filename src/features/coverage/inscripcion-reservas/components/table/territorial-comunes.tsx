"use no memo"

import { useEffect, useState, type ReactNode } from "react"
import { format, parseISO } from "date-fns"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, FileDownloadOutlinedIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { coberturaInscritosRoute } from "@/router"

import { MatriculaSelectField } from "@/features/coverage/matricula/components/forms/form-create-matricula"

// Lo que comparten las secciones de la pestaña Entidad territorial.

export const num = "tabular-nums"
export const wrap = "whitespace-normal"
export const fecha = (iso: string | null) => (iso ? format(parseISO(iso), "dd/MM/yyyy") : "—")
export const km = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("es-CO", { maximumFractionDigits: 1 })
export const siNo = (v: boolean | null) => (v == null ? "No aplica" : v ? "Sí" : "No")
export const nombre = (x: { numero: string; aspirante: string }) => `${x.numero} · ${x.aspirante}`

/** Con `inactiva` la acción sigue a la vista pero no hace nada, y el texto emergente dice por qué. */
export function AccionFila({
  etiqueta,
  icono,
  inactiva,
  onClick,
}: {
  etiqueta: string
  icono: ReactNode
  inactiva?: string
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          // aria-disabled y no disabled: un botón deshabilitado no muestra el texto emergente.
          <Button
            variant="ghost"
            color="muted"
            size="icon-sm"
            aria-label={etiqueta}
            aria-disabled={inactiva ? true : undefined}
            className={inactiva ? "cursor-not-allowed opacity-50" : undefined}
            onClick={inactiva ? undefined : onClick}
          >
            {icono}
          </Button>
        }
      />
      <TooltipContent>{inactiva ?? etiqueta.split(" — ")[0]}</TooltipContent>
    </Tooltip>
  )
}

/** Ficha de solo lectura en pares etiqueta / valor, tres por fila (como el prototipo). */
const COLUMNAS_FICHA = {
  1: "grid-cols-[auto_1fr]",
  2: "sm:grid-cols-[auto_1fr_auto_1fr]",
  3: "sm:grid-cols-[auto_1fr_auto_1fr] lg:grid-cols-[auto_1fr_auto_1fr_auto_1fr]",
}

export function Ficha({
  datos,
  columnas = 3,
}: {
  datos: [string, ReactNode][]
  columnas?: 1 | 2 | 3
}) {
  return (
    <dl
      className={cn(
        "grid overflow-hidden rounded-md border border-border",
        COLUMNAS_FICHA[columnas],
      )}
    >
      {datos.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="border-b border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
            {k}
          </dt>
          <dd className="border-b border-border px-3 py-2.5 text-sm font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** CSV con BOM (Excel lee las tildes) de lo que se ve en la tabla. */
export function exportarCsv(archivo: string, cabecera: string[], filas: (string | number)[][]) {
  const csv = [cabecera, ...filas]
    .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(";"))
    .join("\r\n")
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
  Object.assign(document.createElement("a"), { href: url, download: archivo }).click()
  URL.revokeObjectURL(url)
}

export function BotonExportar({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            color="neutral"
            size="icon"
            aria-label="Exportar"
            disabled={disabled}
            onClick={onClick}
          >
            <FileDownloadOutlinedIcon />
          </Button>
        }
      />
      <TooltipContent>Exportar</TooltipContent>
    </Tooltip>
  )
}

/** Buscador por número o nombre, con un filtro de una sola lista. */
export function Buscador({
  id,
  texto,
  onTexto,
  filtro,
  onFiltro,
  etiqueta,
  opciones,
}: {
  id: string
  texto: string
  onTexto: (v: string) => void
  filtro: string
  onFiltro: (v: string) => void
  etiqueta: string
  opciones: [string, string][]
}) {
  const [abierto, setAbierto] = useState(false)
  const [borrador, setBorrador] = useState("")
  return (
    <SearchQueryBar
      id={id}
      placeholder="Número de inscripción o nombre"
      value={texto}
      onValueChange={onTexto}
      onClearAll={() => {
        onTexto("")
        onFiltro("")
        setAbierto(false)
      }}
      onClearFilters={() => setBorrador("")}
      activeFilterCount={(filtro ? 1 : 0) + (texto ? 1 : 0)}
      badgeCount={filtro ? 1 : 0}
      open={abierto}
      onOpenChange={(o) => {
        if (o) setBorrador(filtro)
        setAbierto(o)
      }}
      onApply={() => {
        onFiltro(borrador)
        setAbierto(false)
      }}
    >
      <div className="px-4">
        <MatriculaSelectField
          id={`${id}-filtro`}
          label={etiqueta}
          placeholder="Todos"
          value={borrador}
          options={opciones.map(([v]) => v)}
          labelFor={(v) => opciones.find(([x]) => x === v)?.[1] ?? v}
          onChange={setBorrador}
        />
      </div>
    </SearchQueryBar>
  )
}

// Selección y aspirante quedan fijas al scrollear en horizontal; fondo opaco
// con el mismo tono del hover de fila para tapar lo que pasa por debajo. Lleva el
// `transition-colors` de TableRow: sin él cambia antes que el resto de la fila.
export const FIJA =
  "sticky z-10 bg-card transition-colors group-hover/row:bg-[color-mix(in_srgb,var(--muted)_28%,var(--card))]"

/**
 * Búsqueda `terrQ` en la URL con debounce. `reiniciarPagina: false` conserva la
 * página: las listas paginadas en el front ya la recortan solas.
 */
export function useBusquedaTerritorial({
  reiniciarPagina = true,
}: { reiniciarPagina?: boolean } = {}) {
  const search = coberturaInscritosRoute.useSearch()
  const navigate = coberturaInscritosRoute.useNavigate()
  const [texto, setTexto] = useState(search.terrQ ?? "")
  useEffect(() => {
    if (texto === (search.terrQ ?? "")) return
    const t = setTimeout(
      () =>
        navigate({
          search: (prev) => ({
            ...prev,
            terrQ: texto || undefined,
            ...(reiniciarPagina ? { page: 0 } : {}),
          }),
          replace: true,
        }),
      300,
    )
    return () => clearTimeout(t)
  }, [texto, search.terrQ, navigate, reiniciarPagina])
  return { texto, setTexto, q: (search.terrQ ?? "").trim().toLowerCase() }
}

export function Cargando({ volver, error }: { volver: () => void; error?: string }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 px-(--screen-spacing)">
      <Button variant="outline" color="neutral" className="w-fit" onClick={volver}>
        <ArrowLeftIcon data-icon="inline-start" />
        Volver
      </Button>
      {error ? (
        <p className="py-10 text-center text-sm text-red">{error}</p>
      ) : (
        <Skeleton className="h-48 w-full" />
      )}
    </div>
  )
}
