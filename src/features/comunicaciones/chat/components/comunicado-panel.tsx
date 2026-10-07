import { format } from "date-fns"

import { Skeleton } from "@/components/ui/skeleton"
import { ClockIcon, LockIcon, MegaphoneIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { Comunicado } from "@/features/comunicaciones/chat/api/types"
import { AUDIENCIAS } from "@/features/comunicaciones/chat/api/ui-mappings"
import { CLASES_HTML, htmlSeguro } from "@/features/comunicaciones/chat/lib/html-seguro"

// Un canal de comunicado no tiene conversación: solo muestra el comunicado.
export function ComunicadoPanel({
  comunicado: c,
  isPending,
  isError,
  onRetry,
}: {
  comunicado: Comunicado | null | undefined
  isPending: boolean
  isError: boolean
  onRetry: () => void
}) {
  if (isPending) {
    return (
      <div className="flex-1 p-3 md:p-5" aria-busy>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }
  if (isError || !c) {
    return (
      <div className="grid flex-1 place-items-center p-6 text-center text-sm">
        <div className="space-y-2">
          <p className="text-muted-foreground">No se pudo cargar el comunicado.</p>
          <button type="button" onClick={onRetry} className="font-medium text-primary underline">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const programado = new Date(c.publicarEn) > new Date()
  // Los programados solo los ve quien los creó hasta la fecha de publicación.
  if (programado && !c.esCreador) {
    return (
      <p className="grid flex-1 place-items-center p-6 text-sm text-muted-foreground">
        Este comunicado aún no se ha publicado.
      </p>
    )
  }

  const audiencia = AUDIENCIAS.filter((a) => c.audiencia.includes(a.value))
    .map((a) => a.label)
    .join(", ")

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5">
      <article
        aria-labelledby="comunicado-titulo"
        className="mx-auto max-w-3xl rounded-xl border bg-card px-4 py-4 md:px-5"
      >
        <p className="mb-4 flex items-center gap-2 font-medium">
          <MegaphoneIcon aria-hidden className="size-5 text-muted-foreground" />
          Comunicado oficial
        </p>
        {programado && (
          <p className="mb-3 flex w-fit items-center gap-1.5 rounded-full bg-orange-22 px-3 py-1 text-xs text-orange">
            <ClockIcon aria-hidden className="size-4" />
            Programado para el {format(new Date(c.publicarEn), "dd/MM/yyyy 'a las' hh:mm a")}
          </p>
        )}
        <header className="border-b pb-3">
          <h3 id="comunicado-titulo" className="font-semibold">
            {c.titulo}
          </h3>
          <dl className="text-xs text-muted-foreground">
            <div>
              <dt className="inline">Publicado por: </dt>
              <dd className="inline">{c.publicadoPor}</dd>
            </div>
            <div>
              <dt className="inline">Fecha: </dt>
              <dd className="inline">
                <time dateTime={c.publicarEn}>
                  {format(new Date(c.publicarEn), "dd/MM/yyyy - hh:mm a")}
                </time>
              </dd>
            </div>
            {audiencia && (
              <div>
                <dt className="inline">Dirigido a: </dt>
                <dd className="inline">{audiencia}</dd>
              </div>
            )}
          </dl>
        </header>
        <div
          className={cn("py-4", CLASES_HTML)}
          // Saneado con DOMPurify: solo etiquetas de formato, sin scripts ni on*.
          dangerouslySetInnerHTML={{ __html: htmlSeguro(c.contenidoHtml) }}
        />
        <footer className="flex items-start gap-1.5 border-t pt-3 text-sm text-muted-foreground">
          <LockIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>
            Este es un canal informativo.
            <br />
            Los comentarios están deshabilitados.
          </p>
        </footer>
      </article>
    </div>
  )
}
