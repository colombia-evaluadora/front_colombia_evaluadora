import { useState } from "react"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChatCircleTextIcon,
  ClockIcon,
  LockIcon,
  MegaphoneIcon,
  WarningCircleIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { Comunicado, EstadoComunicado } from "@/features/comunicaciones/chat/api/types"
import {
  useAnularComunicado,
  useCancelarComunicado,
} from "@/features/comunicaciones/chat/api/mutations/use-crear-comunicado"
import { useRecepcionComunicadoQuery } from "@/features/comunicaciones/chat/api/query/use-recepcion-comunicado-query"
import { AdjuntosComunicadoLista } from "@/features/comunicaciones/chat/components/adjuntos-comunicado"
import { CLASES_HTML, htmlSeguro } from "@/features/comunicaciones/chat/lib/html-seguro"
import { resumenDestinatarios } from "@/features/comunicaciones/chat/lib/destinos-comunicado"

const ESTADOS: Record<
  EstadoComunicado,
  { etiqueta: string; color: "info" | "success" | "neutral" | "destructive" }
> = {
  PROGRAMADO: { etiqueta: "Programado", color: "info" },
  PUBLICADO: { etiqueta: "Publicado", color: "success" },
  VENCIDO: { etiqueta: "Vencido", color: "neutral" },
  CANCELADO: { etiqueta: "Cancelado", color: "neutral" },
  ANULADO: { etiqueta: "Anulado", color: "destructive" },
}

export function EstadoComunicadoBadge({ estado }: { estado: EstadoComunicado }) {
  const { etiqueta, color } = ESTADOS[estado]
  return (
    <Badge variant="soft" color={color}>
      {etiqueta}
    </Badge>
  )
}

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
  // Los programados solo los ve quien los gestiona hasta la fecha de publicación.
  if (programado && !(c.gestiona ?? c.esCreador)) {
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
  const [dialogo, setDialogo] = useState<"anular" | "cancelar" | null>(null)
  const gestiona = c.gestiona ?? c.esCreador
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
        <div className="flex flex-wrap items-center gap-2">
          {c.importante && (
            <Badge variant="soft" color="destructive">
              <WarningCircleIcon data-icon="inline-start" aria-hidden />
              Importante
            </Badge>
          )}
          {c.estado && <EstadoComunicadoBadge estado={c.estado} />}
          {gestiona && (c.estado === "PUBLICADO" || c.estado === "VENCIDO") && (
            <Button size="sm" variant="outline" color="destructive" onClick={() => setDialogo("anular")}>
              Anular
            </Button>
          )}
          {gestiona && c.estado === "PROGRAMADO" && (
            <Button size="sm" variant="outline" color="destructive" onClick={() => setDialogo("cancelar")}>
              Cancelar
            </Button>
          )}
        </div>
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
          {c.visibleHasta && (
            <div>
              <dt className="inline">Visible hasta: </dt>
              <dd className="inline">{format(new Date(`${c.visibleHasta}T00:00:00`), "dd/MM/yyyy")}</dd>
            </div>
          )}
          {c.motivoAnulacion && (
            <div>
              <dt className="inline">Motivo de la anulación: </dt>
              <dd className="inline">{c.motivoAnulacion}</dd>
            </div>
          )}
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

      {dialogo === "anular" && <AnularDialog comunicado={c} onClose={() => setDialogo(null)} />}
      {dialogo === "cancelar" && <CancelarDialog comunicado={c} onClose={() => setDialogo(null)} />}
      {verRecepcion && (
        <RecepcionDialog conversacionId={c.conversacionId} onClose={() => setVerRecepcion(false)} />
      )}
    </article>
  )
}

const MAX_MOTIVO = 500

/** Anular (M.1.ANU.1): motivo obligatorio; sale de las bandejas y se conserva para auditoría. */
function AnularDialog({ comunicado: c, onClose }: { comunicado: Comunicado; onClose: () => void }) {
  const { notify } = useNotify()
  const anular = useAnularComunicado(c.conversacionId)
  const [motivo, setMotivo] = useState("")
  const [intentado, setIntentado] = useState(false)
  const vacio = motivo.trim() === ""
  const cerrar = () => {
    if (!anular.isPending) onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anular comunicado</DialogTitle>
        </DialogHeader>
        <ErrorNoticeBanner error={anular.isError ? anular.error : null} />
        <p className="text-sm text-muted-foreground">
          Se anulará {c.titulo}. Dejará de mostrarse a los destinatarios y no se puede revertir; los correos ya
          enviados no se retiran.
        </p>
        <div className="space-y-1.5">
          <label htmlFor="motivo-anulacion" className="text-sm font-medium">
            Motivo<span className="text-red"> *</span>
          </label>
          <Textarea
            id="motivo-anulacion"
            value={motivo}
            maxLength={MAX_MOTIVO}
            aria-invalid={intentado && vacio}
            onChange={(e) => setMotivo(e.target.value)}
          />
          {intentado && vacio && (
            <p role="alert" className="text-xs text-red">
              Escribe el motivo de la anulación.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" color="neutral" onClick={cerrar} disabled={anular.isPending}>
            Volver
          </Button>
          <Button
            type="button"
            color="destructive"
            disabled={anular.isPending}
            aria-busy={anular.isPending}
            onClick={() => {
              setIntentado(true)
              if (vacio) return
              anular.mutate(motivo.trim(), {
                onSuccess: () => {
                  notify(`Se anuló el comunicado ${c.titulo}.`)
                  onClose()
                },
              })
            }}
          >
            Anular comunicado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Cancelar un programado (M.1.ANU.2): sin motivo, solo Volver y Cancelar comunicado. */
function CancelarDialog({ comunicado: c, onClose }: { comunicado: Comunicado; onClose: () => void }) {
  const { notify } = useNotify()
  const cancelar = useCancelarComunicado(c.conversacionId)
  const cerrar = () => {
    if (!cancelar.isPending) onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar comunicado programado</DialogTitle>
        </DialogHeader>
        <ErrorNoticeBanner error={cancelar.isError ? cancelar.error : null} />
        <p className="text-sm text-muted-foreground">
          Se cancelará {c.titulo}, programado para el{" "}
          {format(new Date(c.publicarEn), "dd/MM/yyyy 'a las' hh:mm a")}. Pasará a Cancelado (estado final) y no se
          publicará.
        </p>
        <DialogFooter>
          <Button type="button" variant="ghost" color="neutral" onClick={cerrar} disabled={cancelar.isPending}>
            Volver
          </Button>
          <Button
            type="button"
            color="destructive"
            disabled={cancelar.isPending}
            aria-busy={cancelar.isPending}
            onClick={() =>
              cancelar.mutate(undefined, {
                onSuccess: () => {
                  notify(`Se canceló el comunicado ${c.titulo}.`)
                  onClose()
                },
              })
            }
          >
            Cancelar comunicado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
