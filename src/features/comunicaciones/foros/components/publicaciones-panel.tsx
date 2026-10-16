import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HashIcon, MagnifyingGlassIcon, PlusIcon } from "@/components/ui/icons"
import { OnlineOnlyTooltip } from "@/components/offline/online-only-tooltip"
import { getErrorMessage } from "@/lib/api-client"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { cn } from "@/lib/utils"
import { usePublicacionesQuery } from "@/features/comunicaciones/foros/api/query/use-foros-query"
import { ORDENES_FORO, type Foro, type OrdenForo } from "@/features/comunicaciones/foros/api/types"
import { PublicacionCard } from "@/features/comunicaciones/foros/components/publicacion-card"
import { CLASE_ETIQUETA, ETIQUETA_ORDEN } from "@/features/comunicaciones/foros/lib/foros"

interface Props {
  foro: Foro
  orden: OrdenForo
  etiqueta?: number
  q?: string
  onFiltros: (cambios: { orden?: OrdenForo; etiqueta?: number; q?: string }) => void
  onAbrir: (id: number) => void
  onNueva: () => void
  onEtiquetas: () => void
}

// Listado del foro: búsqueda (FTS en español del servidor), orden, filtro por etiqueta y "Cargar más".
export function PublicacionesPanel({ foro, orden, etiqueta, q, onFiltros, onAbrir, onNueva, onEtiquetas }: Props) {
  const so = useOnlineOnly()
  const [texto, setTexto] = useState(q ?? "")
  const query = usePublicacionesQuery({ foroId: foro.id, orden, etiqueta, q })
  const publicaciones = query.data ?? []
  const total = query.data?.[0]?.totalCount ?? 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 border-b p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto truncate text-lg font-bold">{foro.nombre}</h2>
          {foro.puedeModerar && (
            <Button variant="outline" color="neutral" size="sm" onClick={onEtiquetas}>
              <HashIcon data-icon="inline-start" />
              Etiquetas
            </Button>
          )}
          {foro.puedePublicar && (
            <OnlineOnlyTooltip tooltip={so.tooltip}>
              <Button size="sm" disabled={so.disabled} onClick={onNueva}>
                <PlusIcon data-icon="inline-start" />
                Nueva publicación
              </Button>
            </OnlineOnlyTooltip>
          )}
        </div>

        <form
          role="search"
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            onFiltros({ q: texto.trim() || undefined })
          }}
        >
          <label className="relative min-w-48 flex-1">
            <span className="sr-only">Buscar publicaciones</span>
            <MagnifyingGlassIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value)
                // Limpiar la caja vuelve al listado completo sin pulsar Enter.
                if (!e.target.value && q) onFiltros({ q: undefined })
              }}
              placeholder="Buscar por título o contenido"
              className="pl-9"
            />
          </label>
          <div role="group" aria-label="Ordenar por" className="flex rounded-lg border p-0.5">
            {ORDENES_FORO.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={orden === o}
                onClick={() => onFiltros({ orden: o })}
                className="h-8 rounded-md px-3 text-sm text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none aria-pressed:bg-primary/10 aria-pressed:font-medium aria-pressed:text-primary"
              >
                {ETIQUETA_ORDEN[o]}
              </button>
            ))}
          </div>
        </form>

        {foro.etiquetas.length > 0 && (
          <ul role="group" aria-label="Filtrar por etiqueta" className="flex flex-wrap gap-1.5">
            <li>
              <button
                type="button"
                aria-pressed={!etiqueta}
                onClick={() => onFiltros({ etiqueta: undefined })}
                className="h-7 rounded-full border px-3 text-xs text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none aria-pressed:border-primary aria-pressed:text-primary"
              >
                Todas
              </button>
            </li>
            {foro.etiquetas.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  aria-pressed={etiqueta === e.id}
                  onClick={() => onFiltros({ etiqueta: etiqueta === e.id ? undefined : e.id })}
                  className={cn(
                    "h-7 rounded-full border px-3 text-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                    etiqueta === e.id ? CLASE_ETIQUETA[e.color] : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {e.nombre}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-busy={query.isFetching}>
        {query.isPending ? (
          <p className="text-sm text-muted-foreground">Cargando publicaciones…</p>
        ) : query.isError && !query.data ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-red">
              {getErrorMessage(query.error)}
            </p>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : publicaciones.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {q || etiqueta
              ? "Ninguna publicación coincide con la búsqueda."
              : "Todavía no hay publicaciones. Abre la primera con una pregunta o un tema."}
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {total === 1 ? "1 publicación" : `${total} publicaciones`}
            </p>
            <ul className="space-y-3">
              {publicaciones.map((p) => (
                <li key={p.id}>
                  <PublicacionCard publicacion={p} onAbrir={onAbrir} />
                </li>
              ))}
            </ul>
            {query.hasNextPage && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  color="neutral"
                  size="sm"
                  disabled={query.isFetchingNextPage}
                  aria-busy={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                >
                  Cargar más
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
