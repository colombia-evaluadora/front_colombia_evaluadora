import { Button } from "@/components/ui/button"
import { UsersThreeIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { ArchivoImage } from "@/features/files/components/archivo-image"
import type { Invitacion } from "@/features/comunicaciones/chat/api/types"
import {
  useAceptarInvitacion,
  useInvitacionesQuery,
  useRechazarInvitacion,
} from "@/features/comunicaciones/chat/api/query/use-invitaciones-query"
import { formatoMiembros } from "@/features/comunicaciones/chat/lib/chat-format"

/**
 * "Invitaciones" del chat: los grupos a los que invitaron al usuario (acudientes). No ve sus
 * mensajes ni cuenta como miembro hasta aceptar; puede rechazar. Llega en vivo
 * (`invitaciones.actualizadas`) y desde la campana (CHAT_GRUPO_INVITACION).
 */
export function InvitacionesSeccion({
  destacada,
  onAceptada,
}: {
  // `?invitacion=<id>` del deep link: se resalta.
  destacada?: number
  onAceptada: (conversacionId: number) => void
}) {
  const { data: invitaciones = [] } = useInvitacionesQuery()
  if (invitaciones.length === 0) return null
  return (
    <section aria-labelledby="chat-invitaciones" className="border-b px-3 pt-1 pb-3">
      <h2 id="chat-invitaciones" className="flex items-center gap-2 px-1 py-2 text-sm font-semibold">
        Invitaciones
        <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
          {invitaciones.length}
        </span>
      </h2>
      <ul className="space-y-2">
        {invitaciones.map((i) => (
          <TarjetaInvitacion
            key={i.conversacionId}
            invitacion={i}
            destacada={i.conversacionId === destacada}
            onAceptada={onAceptada}
          />
        ))}
      </ul>
    </section>
  )
}

function TarjetaInvitacion({
  invitacion: i,
  destacada,
  onAceptada,
}: {
  invitacion: Invitacion
  destacada: boolean
  onAceptada: (conversacionId: number) => void
}) {
  const { notify } = useNotify()
  // Avisos y navegación en el hook: aceptar/rechazar desmonta esta tarjeta (ver
  // `useAceptarInvitacion`), y los callbacks de `mutate` ya no correrían.
  const aceptar = useAceptarInvitacion({
    onAceptada: (c) => {
      notify(`Te uniste a ${c.nombre}.`)
      onAceptada(c.id)
    },
  })
  const rechazar = useRechazarInvitacion({
    onRechazada: () => notify(`Rechazaste la invitación a ${i.nombre}.`),
  })
  const ocupado = aceptar.isPending || rechazar.isPending
  const onError = (e: unknown) => notify(getErrorMessage(e), { variant: "error" })

  return (
    <li
      aria-label={`Invitación a ${i.nombre}`}
      className={cn("rounded-lg border bg-card p-3", destacada && "border-primary ring-1 ring-primary")}
    >
      <div className="flex items-start gap-3">
        <ArchivoImage
          archivoId={i.imagenArchivoId}
          alt={`Imagen de ${i.nombre}`}
          className="size-10 shrink-0 rounded-full object-cover"
          fallback={
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy-22 text-navy">
              <UsersThreeIcon aria-hidden className="size-5" />
            </span>
          }
        />
        <div className="min-w-0 flex-1 text-sm">
          <p className="truncate font-medium">{i.nombre}</p>
          <p className="text-xs text-muted-foreground">
            {i.invitadoPor ? `${i.invitadoPor} te invitó · ` : ""}
            {formatoMiembros(i.totalMiembros)} miembros
          </p>
          {i.descripcion && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.descripcion}</p>}
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="fill"
          color="neutral"
          disabled={ocupado}
          aria-busy={rechazar.isPending}
          onClick={() =>
rechazar.mutate(i.conversacionId, { onError })
          }
        >
          Rechazar
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={ocupado}
          aria-busy={aceptar.isPending}
          onClick={() =>
aceptar.mutate(i.conversacionId, { onError })
          }
        >
          Aceptar
        </Button>
      </div>
    </li>
  )
}
