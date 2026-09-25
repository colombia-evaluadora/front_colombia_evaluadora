import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CaretDownIcon, InfoIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import type { HistorialCambio } from "@/features/academic-management/reports/api/types"

interface HistorialCambiosSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cambios: HistorialCambio[]
  cargando?: boolean
}

function etiquetaDia(fechaIso: string, hoy: Date): string {
  const fecha = new Date(`${fechaIso}T00:00:00`)
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const diffDias = Math.round((inicioHoy.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDias === 0) return "Hoy"
  if (diffDias === 1) return "Ayer"
  return fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function hora(momento: string): string {
  const fecha = new Date(momento)
  if (Number.isNaN(fecha.getTime())) return momento
  return fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
}

function agruparPorDia(cambios: HistorialCambio[]): { etiqueta: string; cambios: HistorialCambio[] }[] {
  const hoy = new Date()
  const grupos = new Map<string, HistorialCambio[]>()
  for (const cambio of cambios) {
    const etiqueta = etiquetaDia(cambio.fecha, hoy)
    const lista = grupos.get(etiqueta)
    if (lista) lista.push(cambio)
    else grupos.set(etiqueta, [cambio])
  }
  return Array.from(grupos, ([etiqueta, cambios]) => ({ etiqueta, cambios }))
}

export function HistorialCambiosSheet({
  open,
  onOpenChange,
  cambios,
  cargando,
}: HistorialCambiosSheetProps) {
  const grupos = React.useMemo(() => agruparPorDia(cambios), [cambios])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 p-0">
        <SheetHeader className="pb-4">
          <SheetTitle>Historial de cambios</SheetTitle>
          <p className="text-sm text-muted-foreground">Últimas actualizaciones detectadas</p>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-auto px-8 pb-4">
          {cargando && (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando historial…</p>
          )}
          {!cargando && grupos.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay cambios recientes para lo seleccionado.
            </p>
          )}
          {grupos.map((grupo) => (
            <div key={grupo.etiqueta} className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">{grupo.etiqueta}</h3>
              <div className="relative flex flex-col gap-3">
                <span aria-hidden="true" className="absolute top-2 bottom-2 left-[3px] w-px bg-border" />
                {grupo.cambios.map((cambio) => (
                  <EntradaHistorial key={cambio.id} cambio={cambio} />
                ))}
              </div>
            </div>
          ))}

          <div className="mt-2 flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            Los cambios provienen de la planilla de actividades.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function EntradaHistorial({ cambio }: { cambio: HistorialCambio }) {
  const [expandido, setExpandido] = React.useState(false)
  const plural = cambio.estudiantes !== 1

  return (
    <div className="flex gap-3">
      <span className="relative z-10 mt-2 size-2 shrink-0 rounded-full bg-primary" />
      <div className="flex-1 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="soft" color="neutral">
            {cambio.grupoNombre}
          </Badge>
          <span className="text-xs text-muted-foreground">{hora(cambio.momento)}</span>
        </div>
        <p className="mt-1.5 font-semibold">{cambio.asignaturaNombre ?? "Informe completo"}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Se {plural ? "consolidaron" : "consolidó"} {cambio.estudiantes}{" "}
          {plural ? "estudiantes" : "estudiante"} · {cambio.periodoNombre}
        </p>
        {cambio.usuario && (
          <p className="mt-0.5 text-xs text-muted-foreground">por {cambio.usuario}</p>
        )}
        {cambio.detalle.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setExpandido((v) => !v)}
              className="mt-2 flex w-full items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/40"
            >
              Cambios: {cambio.detalle.length}
              <CaretDownIcon className={cn("size-3.5 transition-transform", expandido && "rotate-180")} />
            </button>
            {expandido && (
              <ul className="mt-1.5 flex flex-col gap-1">
                {cambio.detalle.map((detalle) => (
                  <li
                    key={detalle.matriculaId}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="min-w-0 truncate">{detalle.estudiante}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {detalle.asignaturas === 1
                        ? "1 asignatura"
                        : `${detalle.asignaturas} asignaturas`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}
