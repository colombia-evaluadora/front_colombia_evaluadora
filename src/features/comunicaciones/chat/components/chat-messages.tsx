import { CHAT_FUNCIONES } from "@/features/comunicaciones/chat/lib/funciones-disponibles"
import { Fragment, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PuntoDisponibilidad } from "@/features/comunicaciones/chat/components/disponibilidad"
import { useEstadoPersona } from "@/features/comunicaciones/chat/api/query/use-disponibilidad-query"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowBendUpLeftIcon,
  CheckIcon,
  ChecksIcon,
  DotsThreeVerticalIcon,
  LockIcon,
  PushPinFillIcon,
  TrashIcon,
} from "@/components/ui/icons"

import { BARRA_ACCIONES, MensajeAcciones } from "@/features/comunicaciones/chat/components/mensaje-acciones"
import { cn } from "@/lib/utils"
import type { AutorMensaje, Conversacion, Mensaje } from "@/features/comunicaciones/chat/api/types"
import { estadoLectura, marcaEdicion } from "@/features/comunicaciones/chat/lib/estado-mensaje"
import { AdjuntosMensaje } from "@/features/comunicaciones/chat/components/adjunto-mensaje"
import { adjuntosDe } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { VotacionRapidaCard } from "@/features/comunicaciones/chat/components/votacion-rapida-card"
import { TarjetaBotMensaje } from "@/features/comunicaciones/chat/components/tarjeta-bot"
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
  // Conversación abierta: confirmación de lectura de los mensajes propios (`leidoHasta`).
  conversacion?: Conversacion
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
  conversacion,
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
                    CHAT_FUNCIONES.menciones && m.meMenciona && !m.esPropio && "border-l-3 border-yellow bg-yellow-22/60",
                  )}
                >
                  <MensajeItem
                    mensaje={m}
                    conversacion={conversacion}
                    onResponder={m.eliminado ? undefined : onResponder}
                    onIrAMensaje={onIrAMensaje}
                  />
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

/**
 * En pantallas táctiles no hay hover: la barra de acciones del mensaje se abre con el botón ⋮
 * del encabezado de la burbuja o con una pulsación larga (menú contextual), y se cierra al tocar
 * fuera. Con mouse o teclado sigue saliendo con hover o foco.
 */
function useAccionesTactiles() {
  const [abiertas, setAbiertas] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!abiertas) return
    const cerrar = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAbiertas(false)
    }
    document.addEventListener("pointerdown", cerrar)
    return () => document.removeEventListener("pointerdown", cerrar)
  }, [abiertas])
  return {
    ref,
    abiertas,
    alternar: () => setAbiertas((v) => !v),
    props: {
      "data-acciones": abiertas ? "abiertas" : undefined,
      onContextMenu: (e: MouseEvent) => {
        // Pulsación larga en táctil: abre las acciones en lugar del menú del navegador.
        if (window.matchMedia("(hover: none)").matches) {
          e.preventDefault()
          setAbiertas(true)
        }
      },
    },
  }
}

// Botón ⋮ que solo existe en pantallas táctiles (sin hover).
function BotonAccionesTactil({ abiertas, onClick }: { abiertas: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={abiertas ? "Ocultar acciones del mensaje" : "Acciones del mensaje"}
      aria-expanded={abiertas}
      onClick={onClick}
      className="-my-1 -mr-2 ml-1 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none [@media(hover:hover)]:hidden"
    >
      <DotsThreeVerticalIcon className="size-4.5" />
    </button>
  )
}

const ETIQUETA_LECTURA = { ENVIADO: "Enviado", ENTREGADO: "Entregado", LEIDO: "Leído" } as const

// ✓ enviado / ✓✓ gris entregado / ✓✓ azul leído por todos, abajo a la derecha de la burbuja
// (diseño 3731:41577). Con confirmación de lectura (HU 7) el título detalla quién lo leyó.
function ConfirmacionLectura({ mensaje: m, estado }: { mensaje: Mensaje; estado: ReturnType<typeof estadoLectura> }) {
  if (!estado) return null
  const leido = estado === "LEIDO"
  const Icono = estado === "ENVIADO" ? CheckIcon : ChecksIcon
  const c = m.confirmacion
  const detalle = c
    ? [
        `${ETIQUETA_LECTURA[estado]} · leído por ${c.leidos} de ${c.total}`,
        ...c.lectores.map((l) =>
          l.leidoEn
            ? `${l.nombre}: leído ${horaMensaje(l.leidoEn)}`
            : `${l.nombre}: ${l.entregadoEn ? "entregado" : "enviado"}`,
        ),
      ].join("\n")
    : ETIQUETA_LECTURA[estado]
  return (
    <span
      title={detalle}
      data-lectura={estado}
      className={cn("-mr-1 -mb-1 flex items-center justify-end gap-1", leido ? "text-primary" : "text-muted-foreground")}
    >
      {c && <span className="text-[11px]">{ETIQUETA_LECTURA[estado]}</span>}
      <Icono aria-hidden className="size-4" />
      <span className="sr-only">{c ? detalle : ETIQUETA_LECTURA[estado]}</span>
    </span>
  )
}

// Aviso de un mensaje borrado (diseño 4490:66032). Solo un coordinador o rector miembro de la
// conversación recibe el original del servidor (comms-service `puedeVerEliminados`, decisión de
// Natalia) y lo ve debajo del aviso; el autor y los demás, solo "Este mensaje fue eliminado".
function MensajeEliminado({ mensaje: m }: { mensaje: Mensaje }) {
  const adjuntos = adjuntosDe(m)
  const original = m.texto.trim() !== "" || adjuntos.length > 0
  return (
    <div className={cn("w-fit max-w-[85%] md:max-w-[70%]", m.esPropio && "ml-auto")}>
      <article className="rounded-xl bg-orange-22 px-4 py-3 text-sm" aria-label="Mensaje eliminado">
        <header className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          {!m.esPropio && <span className="font-medium text-foreground">{m.autor.nombre}</span>}
          <span>
            Eliminado <time dateTime={m.eliminadoEn ?? m.fecha}>{horaMensaje(m.eliminadoEn ?? m.fecha)}</time>
          </span>
        </header>
        <p className="flex items-center gap-1.5 italic">
          <TrashIcon aria-hidden className="size-4 shrink-0 text-orange" />
          Este mensaje fue eliminado.
        </p>
        {original && (
          <p className="flex items-center gap-1.5 italic">
            <LockIcon aria-hidden className="size-4 shrink-0 text-orange" />
            Visible solo para coordinación y rectoría.
          </p>
        )}
        {original && (
          <div className="mt-2 border-t border-orange-stroke pt-2">
            <p className="mb-1 text-xs text-muted-foreground">Mensaje original</p>
            {m.texto && <TextoFormateado texto={m.texto} menciones={m.menciones} />}
            {adjuntos.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {adjuntos.length === 1 ? "Adjunto" : "Adjuntos"}: {adjuntos.map((a) => a.nombre).join(", ")}
              </p>
            )}
          </div>
        )}
      </article>
    </div>
  )
}

function MensajeItem({
  mensaje: m,
  conversacion,
  onResponder,
  onIrAMensaje,
}: {
  mensaje: Mensaje
  conversacion?: Conversacion
  onResponder?: (m: Mensaje) => void
  onIrAMensaje?: (id: number) => void
}) {
  const tactil = useAccionesTactiles()

  if (m.sistema) {
    // Los avisos viejos traen el nombre dentro del texto ("Ana Ana se ha unido…"):
    // se quita para no repetirlo. Los nuevos ya llegan sin él (comms-service).
    const nombre = m.autor?.nombre ?? ""
    const texto = nombre && m.texto?.startsWith(`${nombre} `) ? m.texto.slice(nombre.length + 1) : m.texto
    return (
      <p className="text-center text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">{m.autor.nombre}</span> {texto}
      </p>
    )
  }

  if (m.eliminado) return <MensajeEliminado mensaje={m} />

  // Colevabot: tarjeta estructurada, sin acciones de mensaje (no se responde ni se edita).
  if (m.bot) return <TarjetaBotMensaje mensaje={m} tarjeta={m.bot} />

  if (m.votacion) {
    return (
      <div className={cn("flex", m.esPropio && "justify-end")}>
        <VotacionRapidaCard mensaje={m} votacion={m.votacion} />
      </div>
    )
  }

  // "Editado 7:33 AM" como prefijo de la hora (diseño 4487:67998).
  const edicion = marcaEdicion(m)
  const meta = (
    <>
      {edicion ? (
        <span>
          {edicion} · <time dateTime={m.fecha}>{horaMensaje(m.fecha)}</time>
        </span>
      ) : (
        <time dateTime={m.fecha}>{horaMensaje(m.fecha)}</time>
      )}
      {m.fijado && (
        <span className="flex items-center gap-0.5 text-primary">
          <PushPinFillIcon aria-hidden className="size-3.5" />
          Fijado
        </span>
      )}
    </>
  )

  if (m.esPropio) {
    return (
      <div className="ml-auto w-fit max-w-[85%] min-w-40 md:max-w-[70%]">
        <article
          ref={tactil.ref}
          {...tactil.props}
          className="group/mensaje relative rounded-xl bg-primary/10 px-4 py-3"
        >
          <MensajeAcciones mensaje={m} extra={<BotonResponder mensaje={m} onResponder={onResponder} />} />
          <header className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="sr-only">Tú, </span>
            {meta}
            <span className="flex-1" />
            <BotonAccionesTactil abiertas={tactil.abiertas} onClick={tactil.alternar} />
          </header>
          <Cita mensaje={m} onIrAMensaje={onIrAMensaje} />
          {m.texto && <TextoFormateado texto={m.texto} menciones={m.menciones} />}
          <AdjuntosMensaje mensaje={m} propio />
          <ConfirmacionLectura mensaje={m} estado={estadoLectura(m, conversacion)} />
        </article>
        {CHAT_FUNCIONES.reacciones && <ReaccionesMensaje mensaje={m} />}
      </div>
    )
  }

  return (
    <article className="flex max-w-[90%] items-start gap-3 md:max-w-[75%]">
      <Avatar size="lg" className="mt-1">
        <AvatarFallback className="bg-navy-22 text-xs font-semibold text-navy">
          {iniciales(m.autor.nombre)}
        </AvatarFallback>
        <PuntoAutor autor={m.autor} />
      </Avatar>
      <div className="min-w-0">
        <div
          ref={tactil.ref}
          {...tactil.props}
          className="group/mensaje relative rounded-xl bg-muted/40 px-4 py-3"
        >
          {/* Los mensajes ajenos solo se pueden reaccionar y responder. */}
          {(CHAT_FUNCIONES.reacciones || onResponder) && (
            <div className={BARRA_ACCIONES}>
              {CHAT_FUNCIONES.reacciones && <BotonReaccionar mensaje={m} />}
              <BotonResponder mensaje={m} onResponder={onResponder} />
            </div>
          )}
          <header className="mb-1 flex items-baseline gap-2 text-xs">
            <span className="font-medium">{m.autor.nombre}</span>
            <span className="flex flex-1 items-baseline gap-2 text-muted-foreground">{meta}</span>
            {onResponder && <BotonAccionesTactil abiertas={tactil.abiertas} onClick={tactil.alternar} />}
          </header>
          <Cita mensaje={m} onIrAMensaje={onIrAMensaje} />
          {m.texto && <TextoFormateado texto={m.texto} menciones={m.menciones} />}
          <AdjuntosMensaje mensaje={m} />
        </div>
        {CHAT_FUNCIONES.reacciones && <ReaccionesMensaje mensaje={m} />}
      </div>
    </article>
  )
}

/** Disponibilidad del autor de un mensaje ajeno (socket o, si no, la que trajo el historial). */
function PuntoAutor({ autor }: { autor: AutorMensaje }) {
  return <PuntoDisponibilidad estado={useEstadoPersona(autor.id, autor)} />
}
