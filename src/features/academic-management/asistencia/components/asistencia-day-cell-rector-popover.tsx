import * as React from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ArrowLeftIcon, CaretRightIcon, XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import type { AsistenciaDayEntry } from "@/features/academic-management/asistencia/components/asistencia-month-grid"
import {
  ESTADO_SESION_COLOR,
  ESTADO_SESION_ICON,
  peorEstado,
} from "@/features/academic-management/asistencia/api/ui-mappings"

interface AsistenciaDayCellRectorPopoverProps {
  items: AsistenciaDayEntry[]
  children: React.ReactNode
}

function formatFechaLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO", { day: "numeric", month: "long" })
}

type RectorView =
  | { level: "grados" }
  | { level: "grupos"; grado: string; jornada: string }
  | { level: "asignaturas"; grado: string; jornada: string; grupo: string }

export function AsistenciaDayCellRectorPopover({ items, children }: AsistenciaDayCellRectorPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const [view, setView] = React.useState<RectorView>({ level: "grados" })
  const fecha = items[0]?.fecha

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setView({ level: "grados" })
  }

  const grados = React.useMemo(() => {
    const porGradoJornada = new Map<string, AsistenciaDayEntry[]>()
    for (const item of items) {
      const key = `${item.grado}-${item.jornada}`
      const list = porGradoJornada.get(key) ?? []
      list.push(item)
      porGradoJornada.set(key, list)
    }
    return [...porGradoJornada.values()]
      .map((entries) => ({
        grado: entries[0].grado,
        jornada: entries[0].jornada,
        entries,
        estado: peorEstado(entries.map((e) => e.estado)),
      }))
      .sort((a, b) => a.grado.localeCompare(b.grado) || a.jornada.localeCompare(b.jornada))
  }, [items])

  const grupos = React.useMemo(() => {
    if (view.level === "grados") return []
    const porGrupo = new Map<string, AsistenciaDayEntry[]>()
    for (const item of items) {
      if (item.grado !== view.grado || item.jornada !== view.jornada) continue
      const list = porGrupo.get(item.grupo) ?? []
      list.push(item)
      porGrupo.set(item.grupo, list)
    }
    return [...porGrupo.entries()]
      .map(([grupo, entries]) => ({ grupo, entries, estado: peorEstado(entries.map((e) => e.estado)) }))
      .sort((a, b) => a.grupo.localeCompare(b.grupo))
  }, [items, view])

  const asignaturas = React.useMemo(() => {
    if (view.level !== "asignaturas") return []
    return items.filter(
      (item) => item.grado === view.grado && item.jornada === view.jornada && item.grupo === view.grupo,
    )
  }, [items, view])

  const titulo =
    view.level === "grados"
      ? "Grados"
      : view.level === "grupos"
        ? `Grupos de ${view.grado} (${view.jornada})`
        : `${view.grupo} (${view.jornada})`

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={<button type="button" className="h-full w-full min-w-0 text-left" />}>
        {children}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-3 p-3">
        <div className="flex items-center gap-2">
          {view.level !== "grados" && (
            <button
              type="button"
              aria-label="Volver"
              className="text-muted-foreground hover:text-foreground"
              onClick={() =>
                setView(
                  view.level === "asignaturas"
                    ? { level: "grupos", grado: view.grado, jornada: view.jornada }
                    : { level: "grados" },
                )
              }
            >
              <ArrowLeftIcon className="size-4" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{titulo}</span>
            <span className="block truncate text-xs text-muted-foreground capitalize">
              {fecha ? formatFechaLarga(fecha) : ""}
            </span>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => handleOpenChange(false)}
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {view.level === "grados" && (
          <ul className="flex flex-col gap-1">
            {grados.map(({ grado, jornada, entries, estado }) => {
              const EstadoIcon = ESTADO_SESION_ICON[estado]
              return (
                <li key={`${grado}-${jornada}`}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/40"
                    onClick={() => setView({ level: "grupos", grado, jornada })}
                  >
                    <EstadoIcon className={cn("size-3.5 shrink-0", ESTADO_SESION_COLOR[estado])} />
                    <span className="min-w-0 flex-1 truncate font-medium">{grado}</span>
                    <span className="shrink-0 rounded-sm bg-muted px-1 text-[10px] font-semibold text-muted-foreground">
                      {jornada}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {entries.length} {entries.length === 1 ? "clase" : "clases"}
                    </span>
                    <CaretRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {view.level === "grupos" && (
          <ul className="flex flex-col gap-1">
            {grupos.map(({ grupo, entries, estado }) => {
              const EstadoIcon = ESTADO_SESION_ICON[estado]
              return (
                <li key={grupo}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/40"
                    onClick={() =>
                      setView({ level: "asignaturas", grado: view.grado, jornada: view.jornada, grupo })
                    }
                  >
                    <EstadoIcon className={cn("size-3.5 shrink-0", ESTADO_SESION_COLOR[estado])} />
                    <span className="min-w-0 flex-1 truncate font-medium">{grupo}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {entries.length} {entries.length === 1 ? "asignatura" : "asignaturas"}
                    </span>
                    <CaretRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {view.level === "asignaturas" && (
          <ul className="flex flex-col gap-2">
            {asignaturas.map((item) => {
              const EstadoIcon = ESTADO_SESION_ICON[item.estado]
              return (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <EstadoIcon className={cn("size-3.5 shrink-0", ESTADO_SESION_COLOR[item.estado])} />
                  <span className="min-w-0 flex-1 truncate">{item.asignatura}</span>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
