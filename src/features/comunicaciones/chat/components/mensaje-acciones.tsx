import { CHAT_FUNCIONES } from "@/features/comunicaciones/chat/lib/funciones-disponibles"
import { useEffect, useState, type ReactNode } from "react"

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
import { EyeSlashIcon, PencilSimpleIcon, PushPinFillIcon, PushPinIcon, TrashIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import type { Mensaje } from "@/features/comunicaciones/chat/api/types"
import {
  useEditarMensaje,
  useEliminarMensaje,
  useFijarMensaje,
  useOcultarMensaje,
} from "@/features/comunicaciones/chat/api/mutations/use-acciones-mensaje"
import { ChatComposer } from "@/features/comunicaciones/chat/components/chat-composer"
import { BotonReaccionar } from "@/features/comunicaciones/chat/components/reacciones-mensaje"
import { AdjuntosMensaje } from "@/features/comunicaciones/chat/components/adjunto-mensaje"
import { decodificarMenciones, mencionadosEn } from "@/features/comunicaciones/chat/lib/menciones"
import { useMiembrosQuery } from "@/features/comunicaciones/chat/api/query/use-miembros-query"
import { useChatAccess } from "@/features/comunicaciones/chat/api/use-chat-access"
import { adjuntosVigentes } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { restanteRetiro } from "@/features/comunicaciones/chat/lib/limites-mensaje"
import { EliminarDeBandejaDialog } from "@/features/comunicaciones/chat/components/eliminar-de-bandeja-dialog"

/**
 * "Eliminar de mi bandeja" de un mensaje, propio o ajeno (M.2.RET.2): botón de la barra de acciones
 * y su diálogo. Sigue disponible pasados los 15 minutos del retiro.
 */
export function BotonEliminarDeBandeja({ mensaje: m }: { mensaje: Mensaje }) {
  const { notify } = useNotify()
  const [abierto, setAbierto] = useState(false)
  const ocultar = useOcultarMensaje()
  return (
    <>
      <Accion etiqueta="Eliminar de mi bandeja" onClick={() => setAbierto(true)}>
        <EyeSlashIcon className="size-4.5" />
      </Accion>
      <EliminarDeBandejaDialog
        open={abierto}
        pendiente={ocultar.isPending}
        error={ocultar.isError ? ocultar.error : null}
        onClose={() => {
          ocultar.reset()
          setAbierto(false)
        }}
        onConfirmar={() =>
          ocultar.mutate(m.id, {
            onSuccess: () => {
              notify("El mensaje se eliminó de tu bandeja.")
              setAbierto(false)
            },
          })
        }
      />
    </>
  )
}

/**
 * Barra flotante de acciones de un mensaje: con mouse sale al pasar por encima (`hover:` de
 * Tailwind v4 solo aplica en dispositivos con hover) y con teclado al tener foco; en táctil, con el
 * botón ⋮ o la pulsación larga (`data-acciones="abiertas"` en la burbuja, ver `chat-messages`).
 * Oculta no recibe toques: antes quedaba siempre visible en móvil y tapaba el texto.
 */
export const BARRA_ACCIONES =
  "pointer-events-none absolute -top-4 right-2 z-10 flex items-center gap-0.5 rounded-lg border bg-card p-0.5 opacity-0 shadow-sm transition-opacity group-focus-within/mensaje:pointer-events-auto group-focus-within/mensaje:opacity-100 group-hover/mensaje:pointer-events-auto group-hover/mensaje:opacity-100 group-data-[acciones=abiertas]/mensaje:pointer-events-auto group-data-[acciones=abiertas]/mensaje:opacity-100 has-data-popup-open:pointer-events-auto has-data-popup-open:opacity-100"

// Barra flotante de un mensaje propio: reaccionar, responder (`extra`), editar, fijar y eliminar.
export function MensajeAcciones({ mensaje: m, extra }: { mensaje: Mensaje; extra?: ReactNode }) {
  const { notify } = useNotify()
  const [editando, setEditando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const editar = useEditarMensaje()
  const fijar = useFijarMensaje()
  const eliminar = useEliminarMensaje()
  const onError = (error: unknown) => notify(getErrorMessage(error), { variant: "error" })
  // Solo se piden al abrir la edición (para el autocompletado de menciones).
  const miembros = useMiembrosQuery(editando ? m.conversacionId : undefined)
  const { puedeMencionarMasivo } = useChatAccess()
  // Pasados los 15 minutos desaparece "Retirar para todos". Es solo reflejo: valida el servidor.
  const [retirable, setRetirable] = useState(() => restanteRetiro(m.fecha, Date.now()) > 0)
  useEffect(() => {
    const resta = restanteRetiro(m.fecha, Date.now())
    if (resta <= 0) return
    const t = setTimeout(() => setRetirable(false), resta)
    return () => clearTimeout(t)
  }, [m.fecha])

  return (
    <>
      <div className={BARRA_ACCIONES}>
        {CHAT_FUNCIONES.reacciones && <BotonReaccionar mensaje={m} />}
        {extra}
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
        {retirable && (
          <Accion
            etiqueta="Retirar para todos"
            titulo="Retirar para todos solo en los primeros 15 minutos."
            onClick={() => setEliminando(true)}
          >
            <TrashIcon className="size-4.5" />
          </Accion>
        )}
        <BotonEliminarDeBandeja mensaje={m} />
      </div>

      <Dialog open={editando} onOpenChange={(open) => !editar.isPending && setEditando(open)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edita el mensaje</DialogTitle>
          </DialogHeader>
          {/* Sin burbuja de vista previa: el texto ya está en el editor. Los adjuntos (que la
              edición no cambia) se listan aparte, con quitar según las reglas del autor. */}
          {adjuntosVigentes(m).length > 0 && (
            <section aria-labelledby={`adjuntos-edicion-${m.id}`} className="rounded-xl border p-3">
              <h3 id={`adjuntos-edicion-${m.id}`} className="text-xs font-medium text-muted-foreground">
                Adjuntos
              </h3>
              <AdjuntosMensaje mensaje={m} propio className="mt-2" />
            </section>
          )}
          <ChatComposer
            variante="edicion"
            autoFocus
            destino=""
            textoInicial={decodificarMenciones(m.texto, m.menciones)}
            mencionesIniciales={mencionadosEn(m.texto, m.menciones)}
            miembros={miembros.data ?? []}
            permitirMasivas={puedeMencionarMasivo}
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
            <AlertDialogTitle>Retirar para todos</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                El mensaje y sus adjuntos dejarán de verse para todos los participantes y el hilo dirá Mensaje
                retirado por el remitente.
              </span>
              <span className="block">
                Solo puede retirarlo durante los primeros 15 minutos desde su envío. Después solo podrá
                eliminarlo de su bandeja.
              </span>
              <span className="block">No deshace lecturas, capturas, archivos descargados ni correos ya entregados.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Textos literales de M.2.RET.1. */}
          <AlertDialogFooter>
            <AlertDialogCancel variant="fill" color="neutral" disabled={eliminar.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={eliminar.isPending}
              aria-busy={eliminar.isPending}
              onClick={() =>
                eliminar.mutate(m.id, {
                  onSuccess: () => {
                    notify("Mensaje retirado.")
                    setEliminando(false)
                  },
                  onError,
                })
              }
            >
              Retirar para todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function Accion({
  etiqueta,
  titulo,
  onClick,
  pulsado,
  disabled,
  children,
}: {
  etiqueta: string
  // Ayuda del tooltip cuando no basta la etiqueta (M.2.BAN.3).
  titulo?: string
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
      title={titulo ?? etiqueta}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50 aria-pressed:text-primary"
    >
      {children}
    </button>
  )
}
