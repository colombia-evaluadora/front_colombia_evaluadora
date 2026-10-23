import { PaperclipIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ResultadoMensaje } from "@/features/comunicaciones/chat/api/query/use-busqueda-chat-query"
import { resaltarPalabras } from "@/features/comunicaciones/chat/lib/filtros-chat"
import { iniciales } from "@/features/comunicaciones/chat/lib/chat-format"
import { fechaResultado, textoPlano } from "@/features/comunicaciones/chat/lib/buscar-mensajes"
import { ETIQUETA_PERFIL } from "@/features/comunicaciones/chat/lib/estado-mensaje"

/**
 * Mensajes que cumplen los filtros (historial), en formato chat: autor, conversación, fecha, el
 * texto con las palabras resaltadas y su estado (no leído, editado, eliminado). Elegir uno abre la
 * conversación en ese mensaje.
 */
export function ResultadosBusqueda({
  mensajes,
  termino,
  cargando,
  error,
  hayMas,
  cargandoMas,
  onMas,
  onReintentar,
  onAbrir,
}: {
  mensajes: ResultadoMensaje[]
  termino: string
  cargando: boolean
  error: boolean
  hayMas: boolean
  cargandoMas: boolean
  onMas: () => void
  onReintentar: () => void
  onAbrir: (m: ResultadoMensaje) => void
}) {
  if (cargando) {
    return (
      <li className="space-y-2 p-2" aria-busy>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </li>
    )
  }
  if (error) {
    return (
      <li className="p-2 text-sm">
        <span className="text-muted-foreground">No se pudo consultar el historial. </span>
        <button type="button" onClick={onReintentar} className="font-medium text-primary underline">
          Reintentar
        </button>
      </li>
    )
  }
  if (mensajes.length === 0) {
    return <li className="p-2 text-sm text-muted-foreground">Ningún mensaje coincide con los filtros.</li>
  }
  return (
    <>
      {mensajes.map((m) => {
        const texto = textoPlano(m.texto)
        return (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onAbrir(m)}
              className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <span
                aria-hidden
                className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-navy-22 text-[9px] font-semibold text-navy"
              >
                {iniciales(m.autor)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-1">
                  <span className={cn("truncate", m.noLeido ? "font-semibold" : "font-medium")}>
                    {m.esPropio ? "Tú" : m.autor}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{fechaResultado(m.fecha)}</span>
                  {m.noLeido && (
                    <span title="No leído" className="size-2 shrink-0 self-center rounded-full bg-orange">
                      <span className="sr-only">No leído</span>
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {m.tipoConversacion === "DIRECTO" ? "Mensaje directo" : m.conversacion}
                  {!m.esPropio && ETIQUETA_PERFIL[m.perfilAutor] && ` · ${ETIQUETA_PERFIL[m.perfilAutor]}`}
                </span>
                {m.eliminado && !texto ? (
                  <span className="block text-muted-foreground italic">Este mensaje fue eliminado</span>
                ) : (
                  <span className="line-clamp-2 text-foreground/90">
                    {resaltarPalabras(texto, termino).map((t, i) =>
                      t.coincide ? (
                        <mark key={i} className="rounded-sm bg-yellow-22 text-inherit">
                          {t.texto}
                        </mark>
                      ) : (
                        <span key={i}>{t.texto}</span>
                      ),
                    )}
                  </span>
                )}
                {m.adjunto && (
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <PaperclipIcon aria-hidden className="size-3.5 shrink-0" />
                    <span className="truncate">{m.adjunto}</span>
                  </span>
                )}
                {(m.editado || (m.eliminado && texto)) && (
                  <span className="mt-0.5 flex gap-2 text-xs text-muted-foreground">
                    {m.eliminado && texto && <span className="text-red">Eliminado (visible para directivos)</span>}
                    {m.editado && <span>Editado</span>}
                  </span>
                )}
              </span>
            </button>
          </li>
        )
      })}
      {hayMas && (
        <li>
          <button
            type="button"
            onClick={onMas}
            disabled={cargandoMas}
            className={cn(
              "h-8 w-full rounded-lg text-sm font-medium text-primary hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              cargandoMas && "opacity-60",
            )}
          >
            {cargandoMas ? "Cargando…" : "Ver más mensajes"}
          </button>
        </li>
      )}
    </>
  )
}
