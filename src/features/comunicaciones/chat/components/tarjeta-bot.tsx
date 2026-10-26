import { useNavigate } from "@tanstack/react-router"
import { format } from "date-fns"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { CalendarIcon, ClockIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { EstadoSolicitudAprobacion, Mensaje, TarjetaBot } from "@/features/comunicaciones/chat/api/types"
import { horaMensaje } from "@/features/comunicaciones/chat/lib/chat-format"
import { safeDeepLink } from "@/features/notificaciones/lib/deep-link"
import { AprobacionBotAcciones } from "@/features/comunicaciones/chat/components/aprobacion-bot"

/** Logo de Colevabot (mismo del ítem de la lista). */
export function AvatarColevabot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-[conic-gradient(var(--red),var(--yellow),var(--green),var(--blue),var(--red))] text-xs font-bold text-white",
        className,
      )}
    >
      C
    </span>
  )
}

/** Solicitud resuelta (diseño 400:47651 / 400:47937): verde si se aprobó, roja si se rechazó. */
const TONO_ESTADO: Partial<Record<EstadoSolicitudAprobacion, { tarjeta: string; texto: string }>> = {
  APROBADA: { tarjeta: "border-green-stroke bg-green-22", texto: "text-green" },
  RECHAZADA: { tarjeta: "border-red-stroke bg-red-22", texto: "text-red" },
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 text-xs">
      {children}
    </span>
  )
}

/**
 * Tarjeta estructurada de Colevabot (diseño 4428:64360): encabezado en mayúsculas, título, campos
 * "Etiqueta: valor" y acciones que abren pantallas de la app. Los enlaces pasan por `safeDeepLink`
 * (solo `/app/...`), igual que los de las notificaciones.
 */
export function TarjetaBotMensaje({ mensaje: m, tarjeta: t }: { mensaje: Mensaje; tarjeta: TarjetaBot }) {
  const navigate = useNavigate()
  const tituloId = `tarjeta-bot-${m.id}`
  const tono = t.aprobacion && !t.aprobacion.resolver ? TONO_ESTADO[t.aprobacion.estado] : undefined
  return (
    <article aria-labelledby={tituloId} className="flex gap-3">
      <AvatarColevabot />
      <div className="min-w-0 max-w-xl flex-1">
        <p className="mb-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{m.autor.nombre} (BOT)</span>{" "}
          <time dateTime={m.fecha}>{horaMensaje(m.fecha)}</time>
        </p>
        <div className="rounded-xl bg-muted/60 p-2">
          <div className={cn("space-y-3 rounded-lg border bg-card p-4 text-sm shadow-xs", tono?.tarjeta)}>
            {t.encabezado && (
              <p className={cn("border-b pb-2 font-medium uppercase", tono?.texto)}>
                {t.encabezado}
              </p>
            )}
            {/* En la resuelta el encabezado ya dice el estado: el título queda solo para lectores de pantalla. */}
            <h3 id={tituloId} className={cn("text-sm font-normal", tono && "sr-only")}>
              {t.titulo}
            </h3>
            {t.aprobacion && (
              <p className="flex flex-wrap gap-2 text-muted-foreground">
                <Chip>
                  <CalendarIcon className="size-3.5" />
                  <time dateTime={m.fecha}>{format(new Date(m.fecha), "dd/MM/yyyy")}</time>
                </Chip>
                <Chip>
                  <ClockIcon className="size-3.5" />
                  {horaMensaje(m.fecha)}
                </Chip>
              </p>
            )}
            {t.descripcion && <p className={tono ? undefined : "text-muted-foreground"}>{t.descripcion}</p>}
            {t.campos.length > 0 && (
              <dl className="space-y-1">
                {t.campos.map((c) => (
                  <div key={c.etiqueta} className="flex flex-wrap gap-x-1">
                    <dt className="font-semibold">{c.etiqueta}:</dt>
                    <dd>{c.valor}</dd>
                  </div>
                ))}
              </dl>
            )}
            {t.aprobacion && <AprobacionBotAcciones aprobacion={t.aprobacion} />}
            {t.acciones.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {t.acciones.map((a, i) => (
                  <Button
                    key={a.url}
                    size="sm"
                    variant={i === 0 ? "fill" : "outline"}
                    onClick={() => void navigate({ href: safeDeepLink(a.url) })}
                  >
                    {a.etiqueta}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
