import { useEffect, useRef, type ReactNode } from "react"

import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
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
  busqueda: string
  nombreConversacion: string
  // Contenido fijo al inicio del historial (p. ej. resultados de una elección).
  antes?: ReactNode
}

export function ChatMessages({
  mensajes,
  isPending,
  isError,
  onRetry,
  busqueda,
  nombreConversacion,
  antes,
}: ChatMessagesProps) {
  const finRef = useRef<HTMLDivElement>(null)
  const texto = busqueda.trim().toLowerCase()
  const visibles = texto
    ? mensajes.filter((m) => m.texto.toLowerCase().includes(texto))
    : mensajes

  // Al llegar mensajes nuevos se baja al último, salvo mientras se busca.
  useEffect(() => {
    if (!texto) finRef.current?.scrollIntoView({ block: "end" })
  }, [mensajes.length, texto])

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
        {texto
          ? `Ningún mensaje coincide con «${busqueda.trim()}».`
          : `Aún no hay mensajes en ${nombreConversacion}. Escribe el primero.`}
    </p>
  )

  if (visibles.length === 0 && !antes) {
    return <div className="grid flex-1 place-items-center">{vacio}</div>
  }

  return (
    <div
      role="log"
      aria-label={`Mensajes de ${nombreConversacion}`}
      className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5"
    >
      {antes}
      {visibles.length === 0 && vacio}
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
              <li key={m.id}>
                <MensajeItem mensaje={m} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div ref={finRef} />
    </div>
  )
}

function MensajeItem({ mensaje: m }: { mensaje: Mensaje }) {
  if (m.sistema) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">{m.autor.nombre}</span> {m.texto}
      </p>
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
      <article className="group/mensaje relative ml-auto w-fit max-w-[85%] min-w-40 rounded-xl bg-primary/10 px-4 py-3 md:max-w-[70%]">
        <MensajeAcciones mensaje={m} />
        <header className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="sr-only">Tú, </span>
          {meta}
        </header>
        {m.texto && <TextoFormateado texto={m.texto} />}
        {m.adjunto && <Adjunto mensaje={m} propio />}
      </article>
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
      <div className="min-w-0 rounded-xl bg-muted/40 px-4 py-3">
        <header className="mb-1 flex items-baseline gap-2 text-xs">
          <span className="font-medium">{m.autor.nombre}</span>
          <span className="flex flex-1 items-baseline gap-2 text-muted-foreground">{meta}</span>
        </header>
        {m.texto && <TextoFormateado texto={m.texto} />}
        {m.adjunto && <Adjunto mensaje={m} />}
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
