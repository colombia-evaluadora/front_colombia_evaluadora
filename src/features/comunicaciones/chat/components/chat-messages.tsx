import { Fragment, useEffect, useRef, type ReactNode } from "react"

import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowBendUpLeftIcon,
  CheckCircleIcon,
  FileDownloadOutlinedIcon,
  PushPinFillIcon,
  TrashIcon,
} from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useEliminarAdjunto } from "@/features/comunicaciones/chat/api/mutations/use-acciones-mensaje"
import { MensajeAcciones } from "@/features/comunicaciones/chat/components/mensaje-acciones"
import { cn } from "@/lib/utils"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import { ICONO_ARCHIVO } from "@/features/comunicaciones/chat/api/ui-mappings"
import { VotacionRapidaCard } from "@/features/comunicaciones/chat/components/votacion-rapida-card"
import {
  BotonReaccionar,
  ReaccionesMensaje,
} from "@/features/comunicaciones/chat/components/reacciones-mensaje"
import { TextoFormateado } from "@/features/comunicaciones/chat/components/texto-formateado"
import {
  agruparPorDia,
  horaMensaje,
  iniciales,
} from "@/features/comunicaciones/chat/lib/chat-format"

interface ChatMessagesProps {
  mensajes: Mensaje[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
  // Mensaje elegido en el buscador: se lleva a la vista y se resalta un momento.
  destacado?: { id: number; vez: number }
  nombreConversacion: string
  // Contenido fijo al inicio del historial (p. ej. resultados de una elección).
  antes?: ReactNode
  // Botón "Cargar mensajes anteriores" (historial paginado con `?antes=`).
  anteriores?: ReactNode
  // Primer mensaje sin leer al abrir el canal: lleva el divisor "Mensajes nuevos".
  primerNoLeidoId?: number
  onResponder?: (mensaje: Mensaje) => void
  // Clic en una cita: llevar al mensaje original.
  onIrAMensaje?: (id: number) => void
}

export function ChatMessages({
  mensajes,
  isPending,
  isError,
  onRetry,
  destacado,
  nombreConversacion,
  antes,
  anteriores,
  primerNoLeidoId,
  onResponder,
  onIrAMensaje,
}: ChatMessagesProps) {
  const finRef = useRef<HTMLDivElement>(null)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const visibles = mensajes

  // Al llegar mensajes nuevos se baja al último. Se sigue el id del último y
  // no el largo: cargar historial anterior no debe saltar al final.
  const ultimoId = mensajes.at(-1)?.id
  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" })
  }, [ultimoId])

  useEffect(() => {
    if (!destacado) return
    const el = contenedorRef.current?.querySelector<HTMLElement>(`[data-mensaje-id="${destacado.id}"]`)
    if (!el) return
    el.scrollIntoView({ block: "center", behavior: "smooth" })
    el.dataset.destacado = "true"
    const t = setTimeout(() => delete el.dataset.destacado, 1600)
    return () => clearTimeout(t)
  }, [destacado])

  if (isPending) {
    return (
      <div className="flex-1 space-y-6 p-6" aria-busy>
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="ml-auto h-12 w-1/2" />
        <Skeleton className="h-16 w-3/5" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="grid flex-1 place-items-center p-6 text-center text-sm">
        <div className="space-y-2">
          <p className="text-muted-foreground">No se pudieron cargar los mensajes.</p>
          <button type="button" onClick={onRetry} className="font-medium text-primary underline">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const vacio = (
    <p className="p-6 text-center text-sm text-muted-foreground">
        {`Aún no hay mensajes en ${nombreConversacion}. Escribe el primero.`}
    </p>
  )

  if (visibles.length === 0 && !antes) {
    return <div className="grid flex-1 place-items-center">{vacio}</div>
  }

  return (
    <div
      ref={contenedorRef}
      role="log"
      aria-label={`Mensajes de ${nombreConversacion}`}
      className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5"
    >
      {antes}
      {anteriores}
      {agruparPorDia(visibles).map((grupo) => (
        <section key={grupo.clave} aria-label={grupo.etiqueta}>
          <div className="relative my-4 flex justify-center">
            <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border" />
            <span className="relative rounded-full border bg-card px-3 py-1 text-xs font-medium">
              {grupo.etiqueta}
            </span>
          </div>
          <ul className="space-y-4">
            {grupo.mensajes.map((m) => (
              <Fragment key={m.id}>
                {m.id === primerNoLeidoId && <DivisorNoLeidos />}
                <li
                  data-mensaje-id={m.id}
                  className={cn(
                    "-mx-2 rounded-xl px-2 transition-colors duration-700 data-destacado:bg-primary/15 motion-reduce:transition-none",
                    // Me mencionaron: franja amarilla como en Discord.
                    m.meMenciona && !m.esPropio && "border-l-3 border-yellow bg-yellow-22/60",
                  )}
                >
                  <MensajeItem mensaje={m} onResponder={onResponder} onIrAMensaje={onIrAMensaje} />
                </li>
              </Fragment>
            ))}
          </ul>
        </section>
      ))}
      <div ref={finRef} />
    </div>
  )
}

function DivisorNoLeidos() {
  return (
    <li role="separator" aria-label="Mensajes nuevos" className="relative flex items-center justify-end py-1">
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-red" />
      <span className="relative rounded-sm bg-red px-1.5 text-[10px] font-bold tracking-wide text-red-foreground uppercase">
        Nuevos
      </span>
    </li>
  )
}

// Cita del mensaje respondido; clic = ir al original.
function Cita({ mensaje: m, onIrAMensaje }: { mensaje: Mensaje; onIrAMensaje?: (id: number) => void }) {
  const cita = m.respuestaA
  if (!cita) return null
  return (
    <button
      type="button"
      disabled={cita.eliminado}
      onClick={() => onIrAMensaje?.(cita.id)}
      className="mb-1.5 flex w-full min-w-0 items-center gap-1.5 rounded-md border-l-3 border-primary/50 bg-card/60 px-2 py-1 text-left text-xs hover:bg-card focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-default"
    >
      <ArrowBendUpLeftIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      {cita.eliminado ? (
        <span className="text-muted-foreground italic">Mensaje eliminado</span>
      ) : (
        <span className="min-w-0 truncate">
          <span className="font-semibold">{cita.autor}</span>{" "}
          <span className="text-muted-foreground">{cita.texto}</span>
        </span>
      )}
    </button>
  )
}

function BotonResponder({ mensaje, onResponder }: { mensaje: Mensaje; onResponder?: (m: Mensaje) => void }) {
  if (!onResponder) return null
  return (
    <button
      type="button"
      aria-label="Responder"
      title="Responder"
      onClick={() => onResponder(mensaje)}
      className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      <ArrowBendUpLeftIcon className="size-4.5" />
    </button>
  )
}

function MensajeItem({
  mensaje: m,
  onResponder,
  onIrAMensaje,
}: {
  mensaje: Mensaje
  onResponder?: (m: Mensaje) => void
  onIrAMensaje?: (id: number) => void
}) {
  if (m.sistema) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">{m.autor.nombre}</span> {m.texto}
      </p>
    )
  }

  if (m.votacion) {
    return (
      <div className={cn("flex", m.esPropio && "justify-end")}>
        <VotacionRapidaCard mensaje={m} votacion={m.votacion} />
      </div>
    )
  }

  const meta = (
    <>
      <time dateTime={m.fecha}>{horaMensaje(m.fecha)}</time>
      {m.fijado && (
        <span className="flex items-center gap-0.5 text-primary">
          <PushPinFillIcon aria-hidden className="size-3.5" />
          Fijado
        </span>
      )}
      {m.editado && <span className="ml-auto pl-3">(editado)</span>}
    </>
  )

  if (m.esPropio) {
    return (
      <div className="ml-auto w-fit max-w-[85%] min-w-40 md:max-w-[70%]">
        <article className="group/mensaje relative rounded-xl bg-primary/10 px-4 py-3">
          <MensajeAcciones mensaje={m} extra={<BotonResponder mensaje={m} onResponder={onResponder} />} />
          <header className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="sr-only">Tú, </span>
            {meta}
          </header>
          <Cita mensaje={m} onIrAMensaje={onIrAMensaje} />
          {m.texto && <TextoFormateado texto={m.texto} menciones={m.menciones} />}
          {m.adjunto && <Adjunto mensaje={m} propio />}
        </article>
        <ReaccionesMensaje mensaje={m} />
      </div>
    )
  }

  return (
    <article className="flex max-w-[90%] items-start gap-3 md:max-w-[75%]">
      <Avatar size="lg" className="mt-1">
        <AvatarFallback className="bg-navy-22 text-xs font-semibold text-navy">
          {iniciales(m.autor.nombre)}
        </AvatarFallback>
        {m.autor.enLinea && (
          <AvatarBadge className="bg-green">
            <span className="sr-only">En línea</span>
          </AvatarBadge>
        )}
      </Avatar>
      <div className="min-w-0">
        <div className="group/mensaje relative rounded-xl bg-muted/40 px-4 py-3">
          {/* Los mensajes ajenos solo se pueden reaccionar y responder. */}
          <div className="absolute -top-4 right-2 z-10 flex items-center gap-0.5 rounded-lg border bg-card p-0.5 shadow-sm opacity-0 transition-opacity group-focus-within/mensaje:opacity-100 group-hover/mensaje:opacity-100 has-data-popup-open:opacity-100 max-md:opacity-100">
            <BotonReaccionar mensaje={m} />
            <BotonResponder mensaje={m} onResponder={onResponder} />
          </div>
          <header className="mb-1 flex items-baseline gap-2 text-xs">
            <span className="font-medium">{m.autor.nombre}</span>
            <span className="flex flex-1 items-baseline gap-2 text-muted-foreground">{meta}</span>
          </header>
          <Cita mensaje={m} onIrAMensaje={onIrAMensaje} />
          {m.texto && <TextoFormateado texto={m.texto} menciones={m.menciones} />}
          {m.adjunto && <Adjunto mensaje={m} />}
        </div>
        <ReaccionesMensaje mensaje={m} />
      </div>
    </article>
  )
}

// TODO: descargar con el file-service cuando el backend entregue el id del archivo.
function Adjunto({ mensaje: m, propio = false }: { mensaje: Mensaje; propio?: boolean }) {
  const { notify } = useNotify()
  const eliminar = useEliminarAdjunto()
  const adjunto = m.adjunto
  if (!adjunto) return null

  if (adjunto.eliminadoEn) {
    return (
      <p className="mt-3 -mx-4 -mb-3 flex items-center gap-2 rounded-b-xl border-t bg-green-22 px-4 py-2 text-xs text-green">
        <CheckCircleIcon aria-hidden className="size-5" />
        <span className="font-medium">Archivo eliminado</span>
        <time dateTime={adjunto.eliminadoEn}>{horaMensaje(adjunto.eliminadoEn)}</time>
      </p>
    )
  }

  const { Icono, color } = ICONO_ARCHIVO[adjunto.formato]
  return (
    <div className="mt-3 flex w-full max-w-sm items-center gap-3 rounded-lg border bg-card px-3 py-3 shadow-xs">
      <Icono aria-hidden className={cn("size-8 shrink-0", color)} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{adjunto.nombre}</span>
      <button
        type="button"
        disabled
        aria-label={`Descargar ${adjunto.nombre}`}
        title="La descarga estará disponible cuando se conecte el servicio de archivos"
        className="grid size-8 shrink-0 place-items-center rounded-full text-foreground disabled:opacity-60"
      >
        <FileDownloadOutlinedIcon className="size-5" />
      </button>
      {propio && (
        <button
          type="button"
          aria-label={`Eliminar ${adjunto.nombre}`}
          title="Eliminar archivo"
          disabled={eliminar.isPending}
          onClick={() =>
            eliminar.mutate(m.id, {
              onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
            })
          }
          className="-ml-2 grid size-8 shrink-0 place-items-center rounded-full text-foreground hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"
        >
          <TrashIcon className="size-5" />
        </button>
      )}
    </div>
  )
}
