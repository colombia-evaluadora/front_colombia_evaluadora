import { useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { ArrowRightIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { Mensaje, TarjetaBot } from "@/features/comunicaciones/chat/api/types"
import { horaMensaje } from "@/features/comunicaciones/chat/lib/chat-format"
import { safeDeepLink } from "@/features/notificaciones/lib/deep-link"

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

/**
 * Tarjeta estructurada de Colevabot (diseño 4428:64360): encabezado en mayúsculas, título, campos
 * "Etiqueta: valor" y acciones que abren pantallas de la app. Los enlaces pasan por `safeDeepLink`
 * (solo `/app/...`), igual que los de las notificaciones.
 */
export function TarjetaBotMensaje({ mensaje: m, tarjeta: t }: { mensaje: Mensaje; tarjeta: TarjetaBot }) {
  const navigate = useNavigate()
  const tituloId = `tarjeta-bot-${m.id}`
  return (
    <article aria-labelledby={tituloId} className="flex gap-3">
      <AvatarColevabot />
      <div className="min-w-0 max-w-xl flex-1">
        <p className="mb-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{m.autor.nombre} (BOT)</span>{" "}
          <time dateTime={m.fecha}>{horaMensaje(m.fecha)}</time>
        </p>
        <div className="rounded-xl bg-muted/60 p-2">
          <div className="space-y-3 rounded-lg border bg-card p-4 text-sm shadow-xs">
            {t.encabezado && (
              <p className="border-b pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t.encabezado}
              </p>
            )}
            <h3 id={tituloId} className="text-[15px] font-semibold">
              {t.titulo}
            </h3>
            {t.descripcion && <p className="text-muted-foreground">{t.descripcion}</p>}
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
                    <ArrowRightIcon data-icon="inline-end" />
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
