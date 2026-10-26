import { useId, useState } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckIcon, PencilSimpleIcon, StarFillIcon, StarIcon, TrashIcon, XIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import {
  useEditarFavoritoFiltro,
  useEliminarFavoritoFiltro,
  useFavoritosFiltroQuery,
  useGuardarFavoritoFiltro,
  type FiltroFavorito,
} from "@/features/comunicaciones/chat/api/query/use-favoritos-filtro"
import {
  describirFiltros,
  filtrosDeCuerpo,
  hayFiltros,
  mismosFiltros,
  type FiltrosChat,
} from "@/features/comunicaciones/chat/lib/filtros-chat"

const NOMBRE_MAX = 80

/**
 * Filtros favoritos del historial (HU "Filtrar mensajes"): guardar la combinación actual con un
 * nombre, aplicarla de un clic, renombrarla y eliminarla. Son de cada persona (servidor) y viajan
 * entre equipos; el aplicado queda marcado con la estrella llena.
 */
export function FavoritosFiltrosPopover({
  filtros,
  onFiltros,
}: {
  filtros: FiltrosChat
  onFiltros: (f: FiltrosChat) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const favoritos = useFavoritosFiltroQuery(abierto)
  const guardar = useGuardarFavoritoFiltro()
  const { notify } = useNotify()
  const [nombre, setNombre] = useState("")
  const ids = useId()
  const lista = favoritos.data ?? []
  const aplicado = lista.find((f) => mismosFiltros(filtrosDeCuerpo(f.filtros), filtros))
  const puedeGuardar = hayFiltros(filtros)
  const onError = (e: unknown) => notify(getErrorMessage(e), { variant: "error" })

  const guardarActual = () => {
    const n = nombre.trim()
    if (!n || guardar.isPending) return
    guardar.mutate(
      { nombre: n, filtros },
      {
        onSuccess: (f) => {
          setNombre("")
          notify(`Se guardó el filtro favorito «${f.nombre}».`, { variant: "success" })
        },
        onError,
      },
    )
  }

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Filtros favoritos"
            title="Filtros favoritos"
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-lg border bg-card text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none data-popup-open:border-primary",
              aplicado && "border-primary text-primary",
            )}
          />
        }
      >
        {aplicado ? <StarFillIcon aria-hidden className="size-5" /> : <StarIcon aria-hidden className="size-5" />}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label="Filtros favoritos"
        className="max-h-[min(36rem,var(--available-height))] w-80 gap-3 overflow-y-auto"
      >
        <section aria-labelledby={`${ids}-lista`} className="space-y-1.5">
          <h3 id={`${ids}-lista`} className="text-xs font-medium text-muted-foreground">
            Filtros favoritos
          </h3>
          {favoritos.isPending ? (
            <Skeleton className="h-16 w-full" />
          ) : favoritos.isError ? (
            <p className="text-xs text-muted-foreground">
              No se pudieron cargar tus favoritos.{" "}
              <button type="button" onClick={() => void favoritos.refetch()} className="font-medium text-primary underline">
                Reintentar
              </button>
            </p>
          ) : lista.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aún no tienes favoritos. Elige filtros y guárdalos aquí para usarlos de un clic.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {lista.map((f) => (
                <ItemFavorito
                  key={f.id}
                  favorito={f}
                  activo={f.id === aplicado?.id}
                  onAplicar={() => {
                    onFiltros(filtrosDeCuerpo(f.filtros))
                    setAbierto(false)
                  }}
                />
              ))}
            </ul>
          )}
        </section>

        <form
          className="space-y-1.5 border-t pt-3"
          onSubmit={(e) => {
            e.preventDefault()
            guardarActual()
          }}
        >
          <label htmlFor={`${ids}-nombre`} className="text-xs font-medium text-muted-foreground">
            Guardar los filtros actuales
          </label>
          {puedeGuardar ? (
            <>
              <p className="truncate text-xs text-muted-foreground" title={describirFiltros(filtros)}>
                {[filtros.q.trim() && `“${filtros.q.trim()}”`, describirFiltros(filtros)].filter(Boolean).join(" · ")}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  id={`${ids}-nombre`}
                  size="sm"
                  variant="outlined"
                  maxLength={NOMBRE_MAX}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej.: No leídos de 601"
                />
                <Button type="submit" size="sm" disabled={!nombre.trim() || guardar.isPending}>
                  Guardar
                </Button>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Escribe una búsqueda o elige filtros para guardarlos.</p>
          )}
        </form>
      </PopoverContent>
    </Popover>
  )
}

function ItemFavorito({
  favorito: f,
  activo,
  onAplicar,
}: {
  favorito: FiltroFavorito
  activo: boolean
  onAplicar: () => void
}) {
  const { notify } = useNotify()
  const editar = useEditarFavoritoFiltro()
  const eliminar = useEliminarFavoritoFiltro()
  const [modo, setModo] = useState<"ver" | "renombrar" | "eliminar">("ver")
  const [nombre, setNombre] = useState(f.nombre)
  const filtros = filtrosDeCuerpo(f.filtros)
  const resumen = [filtros.q && `“${filtros.q}”`, describirFiltros(filtros)].filter(Boolean).join(" · ")
  const onError = (e: unknown) => notify(getErrorMessage(e), { variant: "error" })
  const botonIcono =
    "grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"

  if (modo === "renombrar") {
    const renombrar = () => {
      const n = nombre.trim()
      if (!n || n === f.nombre) return setModo("ver")
      editar.mutate(
        { id: f.id, nombre: n },
        {
          onSuccess: (e) => {
            setModo("ver")
            notify(`Se renombró el filtro favorito a «${e.nombre}».`, { variant: "success" })
          },
          onError,
        },
      )
    }
    return (
      <li>
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            renombrar()
          }}
        >
          <Input
            aria-label={`Nuevo nombre de ${f.nombre}`}
            size="sm"
            variant="outlined"
            autoFocus
            maxLength={NOMBRE_MAX}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation()
                setNombre(f.nombre)
                setModo("ver")
              }
            }}
          />
          <button type="submit" aria-label="Guardar nombre" disabled={editar.isPending} className={botonIcono}>
            <CheckIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Cancelar"
            onClick={() => {
              setNombre(f.nombre)
              setModo("ver")
            }}
            className={botonIcono}
          >
            <XIcon className="size-4" />
          </button>
        </form>
      </li>
    )
  }

  if (modo === "eliminar") {
    return (
      <li className="flex items-center gap-2 rounded-md bg-red-22 px-2 py-1.5 text-sm">
        <span className="min-w-0 flex-1 truncate">¿Eliminar «{f.nombre}»?</span>
        <Button
          type="button"
          size="xs"
          variant="fill"
          color="destructive"
          disabled={eliminar.isPending}
          onClick={() =>
            eliminar.mutate(f.id, {
              onSuccess: () => notify(`Se eliminó el filtro favorito «${f.nombre}».`, { variant: "success" }),
              onError: (e) => {
                setModo("ver")
                onError(e)
              },
            })
          }
        >
          Eliminar
        </Button>
        <Button type="button" size="xs" variant="ghost" color="neutral" onClick={() => setModo("ver")}>
          Cancelar
        </Button>
      </li>
    )
  }

  return (
    <li className="group/fav flex items-center gap-1">
      <button
        type="button"
        onClick={onAplicar}
        aria-current={activo ? "true" : undefined}
        title={resumen}
        className={cn(
          "flex min-w-0 flex-1 items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
          activo && "bg-primary/10",
        )}
      >
        {activo ? (
          <StarFillIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-yellow" />
        ) : (
          <StarIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{f.nombre}</span>
          <span className="block truncate text-xs text-muted-foreground">{resumen}</span>
        </span>
      </button>
      <button type="button" aria-label={`Renombrar ${f.nombre}`} onClick={() => setModo("renombrar")} className={botonIcono}>
        <PencilSimpleIcon className="size-4" />
      </button>
      <button type="button" aria-label={`Eliminar ${f.nombre}`} onClick={() => setModo("eliminar")} className={botonIcono}>
        <TrashIcon className="size-4" />
      </button>
    </li>
  )
}
