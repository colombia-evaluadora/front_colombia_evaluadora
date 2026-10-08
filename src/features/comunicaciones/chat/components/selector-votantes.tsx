import { useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { CaretDownIcon, CaretRightIcon } from "@/components/ui/icons"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { GrupoVotantes } from "@/features/comunicaciones/chat/api/types"
import {
  useOpcionesVotantesQuery,
  useVotantesQuery,
} from "@/features/comunicaciones/chat/api/query/use-votantes-query"

const GRUPOS: [GrupoVotantes, string][] = [
  ["GRADO", "Grado"],
  ["FUNCIONARIO", "Funcionario"],
]

interface Filtro {
  grupo: GrupoVotantes
  valor: string
}

// Paso "Seleccionar estudiantes": se elige un grado o un tipo de funcionario y se marcan
// las personas. La selección se conserva al cambiar de grado para sumar varios.
export function SelectorVotantes({
  seleccion,
  onCambio,
  invalido,
}: {
  seleccion: Set<number>
  onCambio: (s: Set<number>) => void
  invalido: boolean
}) {
  const [filtro, setFiltro] = useState<Filtro | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [grupoActivo, setGrupoActivo] = useState<GrupoVotantes>("GRADO")
  const opciones = useOpcionesVotantesQuery(true)
  const votantes = useVotantesQuery(filtro?.grupo, filtro?.valor)
  const lista = votantes.data ?? []
  const marcados = lista.filter((v) => seleccion.has(v.id)).length
  const todos = lista.length > 0 && marcados === lista.length

  const cambiar = (ids: number[], marcar: boolean) => {
    const s = new Set(seleccion)
    for (const id of ids) {
      if (marcar) s.add(id)
      else s.delete(id)
    }
    onCambio(s)
  }

  const valores = grupoActivo === "GRADO" ? opciones.data?.grados : opciones.data?.funcionarios

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div>
        <h3 className="font-semibold">Seleccionar estudiantes</h3>
        <p className="text-sm text-muted-foreground">
          Elige un grado o un tipo de funcionario para cargar el listado.
        </p>
      </div>

      <Popover open={abierto} onOpenChange={setAbierto}>
        <div className="relative">
          <span className="pointer-events-none absolute -top-2.5 left-3 z-10 bg-popover px-1 text-xs font-medium text-muted-foreground">
            Grado o funcionario
          </span>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(
                  "flex h-12 w-full items-center gap-2 rounded-lg border px-4 text-left text-sm focus-visible:border-primary focus-visible:outline-none data-popup-open:border-primary",
                  invalido && "border-red",
                )}
              />
            }
          >
            <span className={cn("flex-1 truncate", !filtro && "text-muted-foreground")}>
              {filtro?.valor ?? "Selecciona grado o funcionario"}
            </span>
            <CaretDownIcon aria-hidden className="size-5 text-muted-foreground transition-transform in-data-popup-open:rotate-180" />
          </PopoverTrigger>
        </div>
        <PopoverContent align="start" className="w-(--anchor-width) p-0">
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] divide-x">
            <ul aria-label="Tipo" className="space-y-1 p-2">
              {GRUPOS.map(([grupo, etiqueta]) => (
                <li key={grupo}>
                  <button
                    type="button"
                    onClick={() => setGrupoActivo(grupo)}
                    onMouseEnter={() => setGrupoActivo(grupo)}
                    aria-pressed={grupoActivo === grupo}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50",
                      grupoActivo === grupo && "bg-primary/10",
                    )}
                  >
                    {etiqueta}
                    <CaretRightIcon aria-hidden className="size-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
            <ul aria-label={grupoActivo === "GRADO" ? "Grados" : "Funcionarios"} className="max-h-64 overflow-y-auto p-2">
              {opciones.isPending ? (
                <li className="space-y-2 p-1">
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                </li>
              ) : (
                valores?.map((valor) => (
                  <li key={valor}>
                    <button
                      type="button"
                      onClick={() => {
                        setFiltro({ grupo: grupoActivo, valor })
                        setAbierto(false)
                      }}
                      className={cn(
                        "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted/50",
                        filtro?.valor === valor && filtro.grupo === grupoActivo && "font-medium text-primary",
                      )}
                    >
                      {valor}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </PopoverContent>
      </Popover>

      {filtro &&
        (votantes.isPending ? (
          <div className="space-y-2" aria-busy>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : votantes.isError ? (
          <p className="text-sm text-muted-foreground">
            No se pudo cargar el listado.{" "}
            <button type="button" onClick={() => void votantes.refetch()} className="font-medium text-primary underline">
              Reintentar
            </button>
          </p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay personas en {filtro.valor}.</p>
        ) : (
          <>
            <div className="flex items-center justify-between px-3">
              <label className="flex items-center gap-3 font-medium">
                <Checkbox
                  checked={todos}
                  indeterminate={marcados > 0 && !todos}
                  onCheckedChange={(v) => cambiar(lista.map((x) => x.id), v === true)}
                />
                Seleccionar todos
              </label>
              <span className="text-sm text-primary tabular-nums">
                {marcados} de {lista.length} seleccionados
              </span>
            </div>
            <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border">
              {lista.map((v) => {
                const marcado = seleccion.has(v.id)
                return (
                  <li key={v.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 px-3 py-2.5",
                        marcado ? "bg-primary/10" : "hover:bg-muted/40",
                      )}
                    >
                      <Checkbox checked={marcado} onCheckedChange={(c) => cambiar([v.id], c === true)} />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate">{v.nombre}</span>
                        <span className="block text-xs text-muted-foreground tabular-nums">{v.documento}</span>
                      </span>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        N.º {String(v.numero).padStart(2, "0")}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </>
        ))}

      {invalido && (
        <p role="alert" className="text-sm text-red">
          Selecciona al menos una persona habilitada para votar.
        </p>
      )}
      {seleccion.size > 0 && (
        <p className="text-sm text-muted-foreground">
          En total: {seleccion.size} {seleccion.size === 1 ? "persona habilitada" : "personas habilitadas"} para votar.
        </p>
      )}
    </section>
  )
}
