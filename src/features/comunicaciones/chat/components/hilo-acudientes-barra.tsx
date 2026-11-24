import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { XIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { useAppForm } from "@/lib/forms"
import { getErrorMessage } from "@/lib/api-client"
import { useHiloAcudientesQuery } from "@/features/comunicaciones/chat/api/query/use-hilos-acudientes-query"
import { useMiembrosQuery } from "@/features/comunicaciones/chat/api/query/use-miembros-query"
import {
  useQuitarSilencioAcudiente,
  useSilenciarAcudiente,
} from "@/features/comunicaciones/chat/api/mutations/use-hilo-acudientes"
import type { HiloAcudientes, Miembro } from "@/features/comunicaciones/chat/api/types"
import {
  MAX_MOTIVO_SILENCIO,
  lineaEncabezadoHilo,
  silencioSchema,
} from "@/features/comunicaciones/chat/lib/hilo-acudientes"

/**
 * Encabezado del hilo con acudientes (M.2.HIL.1 / W.17.HIL.1): "N acudientes vigentes · Moderador: X",
 * aviso de solo lectura y, para el moderador, el panel de participantes con Silenciar / Quitar
 * silencio (M.2.HIL.3). El asunto ya es el título del encabezado del chat.
 */
export function HiloAcudientesBarra({ conversacionId }: { conversacionId: number }) {
  const hilo = useHiloAcudientesQuery(conversacionId).data
  const [participantes, setParticipantes] = useState(false)
  if (!hilo) return null
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2 text-sm md:px-5">
      <span className="text-muted-foreground">{lineaEncabezadoHilo(hilo)}</span>
      {hilo.soloLectura && (
        <Badge variant="soft" color="neutral">
          Solo lectura
        </Badge>
      )}
      {hilo.esModerador && (
        <Button type="button" size="sm" variant="ghost" color="primary" className="ml-auto" onClick={() => setParticipantes(true)}>
          Participantes
        </Button>
      )}
      {participantes && <ParticipantesHiloDialog hilo={hilo} onClose={() => setParticipantes(false)} />}
    </div>
  )
}

function ParticipantesHiloDialog({ hilo, onClose }: { hilo: HiloAcudientes; onClose: () => void }) {
  const { notify } = useNotify()
  const miembros = useMiembrosQuery(hilo.conversacionId)
  const quitar = useQuitarSilencioAcudiente()
  const [silenciando, setSilenciando] = useState<Miembro | null>(null)
  const acudientes = (miembros.data ?? []).filter((m) => m.id !== hilo.moderador.id)
  const silencio = (id: number) => hilo.silenciados.find((s) => s.usuarioId === id)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Participantes del hilo</DialogTitle>
          <DialogDescription>
            Acudientes vigentes del grupo, calculados por el sistema. No se agregan ni se quitan a mano.
          </DialogDescription>
        </DialogHeader>
        <ErrorNoticeBanner error={quitar.isError ? quitar.error : miembros.isError ? miembros.error : null} />
        <ul className="divide-y">
          {acudientes.map((m) => {
            const s = silencio(m.id)
            return (
              <li key={m.id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{m.nombre}</span>
                  {s && <span className="block truncate text-xs text-muted-foreground">Silenciado: {s.motivo}</span>}
                </span>
                {s ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    color="primary"
                    disabled={quitar.isPending}
                    onClick={() =>
                      quitar.mutate(
                        { conversacionId: hilo.conversacionId, usuarioId: m.id },
                        { onSuccess: () => notify(`${m.nombre} ya puede escribir en el hilo.`) },
                      )
                    }
                  >
                    Quitar silencio
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" color="destructive" onClick={() => setSilenciando(m)}>
                    Silenciar
                  </Button>
                )}
              </li>
            )
          })}
          {miembros.isSuccess && acudientes.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">El hilo no tiene acudientes vigentes.</li>
          )}
        </ul>
      </DialogContent>
      {silenciando && (
        <SilenciarDialog conversacionId={hilo.conversacionId} miembro={silenciando} onClose={() => setSilenciando(null)} />
      )}
    </Dialog>
  )
}

/** Motivo obligatorio del silencio (M.2.HIL.3): el acudiente sigue viendo el hilo. */
function SilenciarDialog({
  conversacionId,
  miembro,
  onClose,
}: {
  conversacionId: number
  miembro: Miembro
  onClose: () => void
}) {
  const { notify } = useNotify()
  const silenciar = useSilenciarAcudiente()
  const form = useAppForm({
    defaultValues: { motivo: "" },
    validators: { onSubmit: silencioSchema },
    onSubmit: async ({ value }) => {
      const ok = await silenciar
        .mutateAsync({ conversacionId, usuarioId: miembro.id, motivo: value.motivo })
        .catch(() => null)
      if (!ok) return
      notify(`Se silenció a ${miembro.nombre} en el hilo.`)
      onClose()
    },
  })
  const id = `silenciar-${miembro.id}`
  return (
    <Dialog open onOpenChange={(o) => !o && !silenciar.isPending && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Silenciar a {miembro.nombre}</DialogTitle>
          <DialogDescription>Podrá leer el hilo, pero no escribir hasta que le quite el silencio.</DialogDescription>
        </DialogHeader>
        <ErrorNoticeBanner
          error={silenciar.isError ? silenciar.error : null}
          fallback={silenciar.isError ? getErrorMessage(silenciar.error) : undefined}
        />
        <form
          id={id}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <form.AppField name="motivo">
            {(f) => <f.TextareaField label="Motivo" required maxLength={MAX_MOTIVO_SILENCIO} rows={3} placeholder="Escriba el motivo" />}
          </form.AppField>
        </form>
        <DialogFooter>
          <Button variant="outline" color="neutral" type="button" onClick={onClose} disabled={silenciar.isPending}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="submit" form={id} color="primary" disabled={silenciar.isPending} aria-busy={silenciar.isPending}>
            Silenciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
