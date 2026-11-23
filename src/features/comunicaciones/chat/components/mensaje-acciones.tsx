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
import { DotsThreeVerticalIcon, EyeSlashIcon, InfoIcon, PencilSimpleIcon, PushPinFillIcon, PushPinIcon, TrashIcon, XIcon } from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  useHiloAcudientesQuery,
  useResumenHilo,
} from "@/features/comunicaciones/chat/api/query/use-hilos-acudientes-query"
import { useOcultarMensajeHilo } from "@/features/comunicaciones/chat/api/mutations/use-hilo-acudientes"

/**
 * "Eliminar de mi bandeja" de un mensaje, propio o ajeno (M.2.RET.2): botón de la barra de acciones
 * y su diálogo. Sigue disponible pasados los 15 minutos del retiro.
 */
export function BotonEliminarDeBandeja({ mensaje: m }: { mensaje: Mensaje }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <Accion etiqueta="Eliminar de mi bandeja" onClick={() => setAbierto(true)}>
        <EyeSlashIcon className="size-4.5" />
      </Accion>
      <EliminarMensajeDeBandeja mensaje={m} open={abierto} onClose={() => setAbierto(false)} />
    </>
  )
}

/** Diálogo "Eliminar de mi bandeja" de un mensaje (lo comparten la barra y el menú ⁞ del propio). */
function EliminarMensajeDeBandeja({ mensaje: m, open, onClose }: { mensaje: Mensaje; open: boolean; onClose: () => void }) {
  const { notify } = useNotify()
  const ocultar = useOcultarMensaje()
  return (
    <EliminarDeBandejaDialog
      open={open}
      pendiente={ocultar.isPending}
      error={ocultar.isError ? ocultar.error : null}
      onClose={() => {
        ocultar.reset()
        onClose()
      }}
      onConfirmar={() =>
        ocultar.mutate(m.id, {
          onSuccess: () => {
            notify("El mensaje se eliminó de tu bandeja.")
            onClose()
          },
        })
      }
    />
  )
}

// Ítems del menú ⁞ en oración (el menú base va en mayúsculas), como el de la conversación.
const ITEM = "gap-3 py-2.5 text-sm font-normal tracking-normal normal-case [&_svg]:size-5!"

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
  const [ocultando, setOcultando] = useState(false)
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
        {/* Menú ⁞ del mensaje propio (M.2.BAN.3): primero retirar y eliminar (rojo) con la nota
            fija de los 15 minutos; editar y fijar debajo de un separador. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Opciones del mensaje"
            title="Opciones del mensaje"
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none data-popup-open:bg-muted/60"
          >
            <DotsThreeVerticalIcon className="size-4.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {retirable && (
              <DropdownMenuItem className={`${ITEM} text-red`} onClick={() => setEliminando(true)}>
                <TrashIcon />
                Retirar para todos
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className={`${ITEM} text-red`} onClick={() => setOcultando(true)}>
              <EyeSlashIcon />
              Eliminar de mi bandeja
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className={ITEM} onClick={() => setEditando(true)}>
              <PencilSimpleIcon />
              Editar mensaje
            </DropdownMenuItem>
            <DropdownMenuItem
              className={ITEM}
              disabled={fijar.isPending}
              onClick={() =>
                fijar.mutate(
                  { id: m.id, fijado: !m.fijado },
                  { onSuccess: () => notify(m.fijado ? "Mensaje desfijado." : "Mensaje fijado."), onError },
                )
              }
            >
              {m.fijado ? <PushPinFillIcon /> : <PushPinIcon />}
              {m.fijado ? "Desfijar mensaje" : "Fijar mensaje"}
            </DropdownMenuItem>
            <p className="flex items-start gap-2 border-t px-3 pt-2 pb-1.5 text-xs text-muted-foreground">
              <InfoIcon aria-hidden className="mt-px size-4 shrink-0" />
              Retirar para todos solo en los primeros 15 minutos.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <EliminarMensajeDeBandeja mensaje={m} open={ocultando} onClose={() => setOcultando(false)} />

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
                El mensaje y sus adjuntos dejarán de verse para todos los participantes y el hilo dirá{" "}
                <em>Mensaje retirado por el remitente</em>.
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
            <AlertDialogCancel variant="outline" color="neutral" disabled={eliminar.isPending}><XIcon data-icon="inline-start" />Cancelar</AlertDialogCancel>
            <AlertDialogAction
              color="destructive"
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

/**
 * Menú ⁞ de un mensaje ajeno en un hilo con acudientes, solo para su moderador (M.2.HIL.3): "Ocultar
 * mensaje". Queda "Mensaje oculto por el moderador" para todos; el original se conserva para auditoría.
 */
export function MenuModeradorHilo({ mensaje: m }: { mensaje: Mensaje }) {
  const resumen = useResumenHilo(m.conversacionId)
  const hilo = useHiloAcudientesQuery(resumen ? m.conversacionId : undefined).data
  const { notify } = useNotify()
  const ocultar = useOcultarMensajeHilo()
  const [confirmando, setConfirmando] = useState(false)
  if (!hilo?.esModerador || m.ocultoPorModerador) return null
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Opciones del mensaje"
          title="Opciones del mensaje"
          className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none data-popup-open:bg-muted/60"
        >
          <DotsThreeVerticalIcon className="size-4.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem className={`${ITEM} text-red`} onClick={() => setConfirmando(true)}>
            <EyeSlashIcon />
            Ocultar mensaje
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmando} onOpenChange={(o) => !ocultar.isPending && setConfirmando(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Ocultar este mensaje?</AlertDialogTitle>
            <AlertDialogDescription>
              Los participantes verán «Mensaje oculto por el moderador». El original se conserva para auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" color="neutral" disabled={ocultar.isPending}><XIcon data-icon="inline-start" />Cancelar</AlertDialogCancel>
            <AlertDialogAction
              color="destructive"
              disabled={ocultar.isPending}
              onClick={() =>
                ocultar.mutate(
                  { conversacionId: m.conversacionId, mensajeId: m.id },
                  {
                    onSuccess: () => {
                      notify("El mensaje quedó oculto.")
                      setConfirmando(false)
                    },
                    onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
                  },
                )
              }
            >
              Ocultar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
