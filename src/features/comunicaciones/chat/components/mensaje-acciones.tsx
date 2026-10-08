import { useState, type ReactNode } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PencilSimpleIcon, PushPinFillIcon, PushPinIcon, TrashIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import {
  useEditarMensaje,
  useEliminarMensaje,
  useFijarMensaje,
} from "@/features/comunicaciones/chat/api/mutations/use-acciones-mensaje"
import { ChatComposer } from "@/features/comunicaciones/chat/components/chat-composer"
import { TextoFormateado } from "@/features/comunicaciones/chat/components/texto-formateado"
import { horaMensaje } from "@/features/comunicaciones/chat/lib/chat-format"

// Barra flotante de un mensaje propio: editar, fijar y eliminar.
export function MensajeAcciones({ mensaje: m }: { mensaje: Mensaje }) {
  const { notify } = useNotify()
  const [editando, setEditando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const editar = useEditarMensaje()
  const fijar = useFijarMensaje()
  const eliminar = useEliminarMensaje()
  const onError = (error: unknown) => notify(getErrorMessage(error), { variant: "error" })

  return (
    <>
      <div className="absolute -top-4 right-2 z-10 flex items-center gap-0.5 rounded-lg border bg-card p-0.5 shadow-sm opacity-0 transition-opacity group-focus-within/mensaje:opacity-100 group-hover/mensaje:opacity-100 max-md:opacity-100">
        <Accion etiqueta="Editar mensaje" onClick={() => setEditando(true)}>
          <PencilSimpleIcon className="size-4.5" />
        </Accion>
        <Accion
          etiqueta={m.fijado ? "Desfijar mensaje" : "Fijar mensaje"}
          pulsado={m.fijado}
          disabled={fijar.isPending}
          onClick={() =>
            fijar.mutate(
              { id: m.id, fijado: !m.fijado },
              { onSuccess: () => notify(m.fijado ? "Mensaje desfijado." : "Mensaje fijado."), onError },
            )
          }
        >
          {m.fijado ? <PushPinFillIcon className="size-4.5" /> : <PushPinIcon className="size-4.5" />}
        </Accion>
        <Accion etiqueta="Eliminar mensaje" onClick={() => setEliminando(true)}>
          <TrashIcon className="size-4.5" />
        </Accion>
      </div>

      <Dialog open={editando} onOpenChange={(open) => !editar.isPending && setEditando(open)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edita el mensaje</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border p-3">
            <div className="w-fit max-w-full rounded-xl bg-primary/10 px-4 py-3">
              <p className="mb-1 text-xs text-muted-foreground">
                <time dateTime={m.fecha}>{horaMensaje(m.fecha)}</time>
              </p>
              <TextoFormateado texto={m.texto} />
            </div>
          </div>
          <ChatComposer
            variante="edicion"
            autoFocus
            destino=""
            textoInicial={m.texto}
            enviando={editar.isPending}
            className="border-t-0 p-0 md:p-0"
            onEnviar={(texto) =>
              editar.mutateAsync({ id: m.id, texto }).then(
                () => {
                  notify("Mensaje editado.")
                  setEditando(false)
                },
                (error) => {
                  onError(error)
                  throw error
                },
              )
            }
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={eliminando} onOpenChange={(o) => !o && !eliminar.isPending && setEliminando(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este mensaje?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará para todos los miembros
              {m.adjunto && !m.adjunto.eliminadoEn ? ", junto con el archivo adjunto" : ""}. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="fill" color="neutral" disabled={eliminar.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              color="destructive"
              disabled={eliminar.isPending}
              aria-busy={eliminar.isPending}
              onClick={() =>
                eliminar.mutate(m.id, {
                  onSuccess: () => {
                    notify("Mensaje eliminado.")
                    setEliminando(false)
                  },
                  onError,
                })
              }
            >
              Eliminar mensaje
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function Accion({
  etiqueta,
  onClick,
  pulsado,
  disabled,
  children,
}: {
  etiqueta: string
  onClick: () => void
  pulsado?: boolean
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      aria-pressed={pulsado}
      title={etiqueta}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50 aria-pressed:text-primary"
    >
      {children}
    </button>
  )
}
