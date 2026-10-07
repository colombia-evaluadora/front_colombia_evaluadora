import { useState, type RefObject } from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react"

import { ClockIcon, MagnifyingGlassIcon, XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { Conversacion } from "@/features/comunicaciones/chat/api/types"
import { ICONO_CATEGORIA } from "@/features/comunicaciones/chat/api/ui-mappings"
import { useBusquedasRecientes } from "@/features/comunicaciones/chat/hooks/use-busquedas-recientes"

// Buscador del panel de conversaciones: popover que se abre con la lupa sobre
// el encabezado. Vacío muestra las búsquedas recientes; con texto, los resultados.
export function BuscadorConversaciones({
  conversaciones,
  anchor,
  onSeleccionar,
}: {
  conversaciones: Conversacion[]
  anchor: RefObject<HTMLElement | null>
  onSeleccionar: (id: number) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [filtro, setFiltro] = useState("")
  const { recientes, recordar, quitar } = useBusquedasRecientes()
  const texto = filtro.trim().toLowerCase()
  const resultados = texto
    ? conversaciones.filter((c) => c.nombre.toLowerCase().includes(texto)).slice(0, 8)
    : []

  const cambiarAbierto = (o: boolean) => {
    setAbierto(o)
    if (!o) setFiltro("")
  }

  const elegir = (c: Conversacion) => {
    recordar(filtro)
    cambiarAbierto(false)
    onSeleccionar(c.id)
  }

  return (
    <PopoverPrimitive.Root open={abierto} onOpenChange={cambiarAbierto}>
      <PopoverPrimitive.Trigger
        aria-label="Buscar conversación"
        title="Buscar conversación"
        className="grid size-9 shrink-0 place-items-center rounded-full text-foreground hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none data-popup-open:bg-muted/60"
      >
        <MagnifyingGlassIcon className="size-5" />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          anchor={anchor}
          side="bottom"
          align="start"
          sideOffset={0}
          alignOffset={0}
          className="isolate z-50"
        >
          <PopoverPrimitive.Popup
            aria-label="Buscar conversación"
            className="w-[min(calc(var(--anchor-width)+6rem),calc(100vw-1rem))] origin-(--transform-origin) overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg outline-none duration-100 data-closed:animate-out data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0"
          >
            <div className="flex items-center gap-2 border-b px-3">
              <MagnifyingGlassIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && resultados[0]) elegir(resultados[0])
                }}
                placeholder="Buscar conversación"
                aria-label="Buscar conversación"
                className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <PopoverPrimitive.Close
                aria-label="Cerrar búsqueda"
                className="grid size-8 shrink-0 place-items-center rounded-md hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <XIcon className="size-5" />
              </PopoverPrimitive.Close>
            </div>

            {texto ? (
              resultados.length > 0 ? (
                <ul aria-label="Resultados" className="max-h-80 overflow-y-auto py-1">
                  {resultados.map((c) => {
                    const Icono = ICONO_CATEGORIA[c.categoria]
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => elegir(c)}
                          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                        >
                          <Icono aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{c.nombre}</span>
                          {c.archivada && (
                            <span className="ml-auto shrink-0 text-xs text-muted-foreground">Archivada</span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="px-4 py-4 text-sm text-muted-foreground">
                  Ninguna conversación coincide con «{filtro.trim()}».
                </p>
              )
            ) : recientes.length > 0 ? (
              <section aria-label="Búsquedas recientes" className="pb-2">
                <h3 className="px-4 pt-3 pb-1 text-xs text-muted-foreground">Búsquedas recientes</h3>
                <ul>
                  {recientes.map((r) => (
                    <li key={r} className="group/reciente flex items-center hover:bg-muted/50">
                      <button
                        type="button"
                        onClick={() => setFiltro(r)}
                        className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left text-sm focus-visible:bg-muted/50 focus-visible:outline-none"
                      >
                        <ClockIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{r}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Quitar «${r}» de las búsquedas recientes`}
                        onClick={() => quitar(r)}
                        className={cn(
                          "mr-3 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 group-hover/reciente:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                        )}
                      >
                        <XIcon className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                Escribe el nombre de un canal o de una persona.
              </p>
            )}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
