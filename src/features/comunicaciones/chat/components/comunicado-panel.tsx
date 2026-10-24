import { useState } from "react"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChatCircleTextIcon,
  ClockIcon,
  LockIcon,
  MegaphoneIcon,
  WarningCircleIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { Comunicado } from "@/features/comunicaciones/chat/api/types"
import { useRecepcionComunicadoQuery } from "@/features/comunicaciones/chat/api/query/use-recepcion-comunicado-query"
import { AdjuntosComunicadoLista } from "@/features/comunicaciones/chat/components/adjuntos-comunicado"
import { CLASES_HTML, htmlSeguro } from "@/features/comunicaciones/chat/lib/html-seguro"
import { resumenDestinatarios } from "@/features/comunicaciones/chat/lib/destinos-comunicado"

// Un canal de comunicado sin respuestas no tiene conversación: solo muestra el comunicado.
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

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5">
      <ComunicadoArticulo comunicado={c} />
    </div>
  )
}

/** Tarjeta "Comunicado oficial" (diseño 3883:57269); sola o encabezando la conversación de respuestas. */
export function ComunicadoArticulo({ comunicado: c }: { comunicado: Comunicado }) {
  const [verRecepcion, setVerRecepcion] = useState(false)
  const programado = new Date(c.publicarEn) > new Date()
  const dirigidoA = resumenDestinatarios(c.audiencia, c.destinos)

  return (
    <article
      aria-labelledby="comunicado-titulo"
      className={cn(
        "mx-auto w-full max-w-3xl rounded-xl border bg-card px-4 py-4 md:px-5",
        c.importante && "border-red-stroke",
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-medium">
          <MegaphoneIcon aria-hidden className="size-5 text-muted-foreground" />
          Comunicado oficial
        </p>
        {c.importante && (
          <Badge variant="soft" color="destructive">
            <WarningCircleIcon data-icon="inline-start" aria-hidden />
            Importante
          </Badge>
        )}
      </div>
      {programado && (
        <p className="mb-3 flex w-fit items-center gap-1.5 rounded-full bg-orange-22 px-3 py-1 text-xs text-orange">
          <ClockIcon aria-hidden className="size-4" />
          Programado para el {format(new Date(c.publicarEn), "dd/MM/yyyy 'a las' hh:mm a")}
        </p>
      )}
      <header className="border-b pb-3">
        <h3 id="comunicado-titulo" className="text-[15px] leading-snug font-semibold">
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
              <time dateTime={c.publicarEn}>{format(new Date(c.publicarEn), "dd/MM/yyyy - hh:mm a")}</time>
            </dd>
          </div>
          {dirigidoA && (
            <div>
              <dt className="inline">Dirigido a: </dt>
              <dd className="inline">{dirigidoA}</dd>
            </div>
          )}
          {c.leidos != null && c.totalDestinatarios != null && (
            // Confirmación de lectura: solo la recibe quien lo publicó; abre el registro por persona.
            <div>
              <dt className="inline">Leído por: </dt>
              <dd className="inline">
                <button
                  type="button"
                  onClick={() => setVerRecepcion(true)}
                  className="font-medium text-primary tabular-nums underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  {c.leidos} de {c.totalDestinatarios}
                </button>
              </dd>
            </div>
          )}
        </dl>
      </header>
      <div
        className={cn("py-4", CLASES_HTML)}
        // Saneado con DOMPurify: solo etiquetas de formato, sin scripts ni on*.
        dangerouslySetInnerHTML={{ __html: htmlSeguro(c.contenidoHtml) }}
      />
      <AdjuntosComunicadoLista adjuntos={c.adjuntos ?? []} />
      <footer className="flex items-start gap-1.5 border-t pt-3 text-sm text-muted-foreground">
        {c.permiteRespuestas ? (
          <>
            <ChatCircleTextIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p>Puedes responder a este comunicado en la conversación.</p>
          </>
        ) : (
          <>
            <LockIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p>
              Este es un comunicado informativo.
              <br />
              Los comentarios están deshabilitados.
            </p>
          </>
        )}
      </footer>

      {verRecepcion && (
        <RecepcionDialog conversacionId={c.conversacionId} onClose={() => setVerRecepcion(false)} />
      )}
    </article>
  )
}

/** Registro de recepción: por destinatario, si lo leyó y a qué hora (solo quien lo publicó). */
function RecepcionDialog({ conversacionId, onClose }: { conversacionId: number; onClose: () => void }) {
  const q = useRecepcionComunicadoQuery(conversacionId, true)
  const filas = q.data ?? []
  const leidos = filas.filter((f) => f.estado === "LEIDO").length

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registro de recepción</DialogTitle>
        </DialogHeader>
        {q.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : q.isError ? (
          <p className="text-sm text-muted-foreground">
            No se pudo cargar el registro.{" "}
            <button type="button" onClick={() => void q.refetch()} className="font-medium text-primary underline">
              Reintentar
            </button>
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {leidos} de {filas.length} {filas.length === 1 ? "destinatario lo leyó" : "destinatarios lo leyeron"}.
            </p>
            <ul className="-mx-1 min-h-0 flex-1 divide-y overflow-y-auto px-1" aria-label="Destinatarios">
              {filas.map((f) => (
                <li key={f.usuarioId} className="flex items-center gap-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{f.nombre}</span>
                    <span className="block text-xs text-muted-foreground">
                      {f.vistoEn
                        ? `Visto el ${format(new Date(f.vistoEn), "dd/MM/yyyy 'a las' hh:mm a")}`
                        : f.estado === "LEIDO"
                          ? "Leído (sin hora registrada)"
                          : f.entregadoEn
                            ? `Entregado el ${format(new Date(f.entregadoEn), "dd/MM/yyyy 'a las' hh:mm a")}`
                            : "Aún no se publica"}
                    </span>
                  </span>
                  <Badge variant="soft" color={f.estado === "LEIDO" ? "success" : "muted"}>
                    {f.estado === "LEIDO" ? "Leído" : "No leído"}
                  </Badge>
                </li>
              ))}
            </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
