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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { Conversacion, SilencioDuracion } from "@/features/comunicaciones/chat/api/types"
import {
  useArchivarConversacion,
  useDuplicarConversacion,
  useEliminarConversacion,
  useMarcarLeido,
  useMarcarNoLeido,
  useRenombrarConversacion,
  useSalirConversacion,
  useSilenciarConversacion,
} from "@/features/comunicaciones/chat/api/mutations/use-acciones-conversacion"
import {
  ArchiveIcon,
  UnarchiveIcon,
  CopyIcon,
  PencilSimpleIcon,
  TrashIcon,
  ChatReadIcon,
  DotsThreeVerticalIcon,
  ChatUnreadIcon,
  SignOutIcon,
  BellSlashIcon,
  LightningIcon,
} from "@/components/ui/icons"

// Los items del menú base van en mayúsculas; el diseño del chat los pide en oración.
const ITEM = "gap-3 py-2.5 text-sm font-normal tracking-normal normal-case [&_svg]:size-5!"

const SILENCIOS: Array<{ valor: SilencioDuracion; etiqueta: string; aviso: string }> = [
  { valor: "8H", etiqueta: "8 horas", aviso: "Notificaciones silenciadas por 8 horas." },
  { valor: "1S", etiqueta: "1 semana", aviso: "Notificaciones silenciadas por 1 semana." },
  { valor: "SIEMPRE", etiqueta: "Siempre", aviso: "Notificaciones silenciadas." },
]

type Dialogo = "renombrar" | "eliminar" | "salir" | null

interface ConversacionAccionesProps {
  conversacion: Conversacion
  // "fila": editar, eliminar y menú en la lista; "encabezado": solo el menú.
  variante: "fila" | "encabezado"
  activa?: boolean
  // La conversación deja de estar disponible en la vista actual.
  onSalida: () => void
  className?: string
}

export function ConversacionAcciones({
  conversacion: c,
  variante,
  activa = false,
  onSalida,
  className,
}: ConversacionAccionesProps) {
  const { notify } = useNotify()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [nombre, setNombre] = useState(c.nombre)

  const silenciar = useSilenciarConversacion()
  const marcarLeido = useMarcarLeido()
  const marcarNoLeido = useMarcarNoLeido()
  const duplicar = useDuplicarConversacion()
  const archivar = useArchivarConversacion()
  const renombrar = useRenombrarConversacion()
  const eliminar = useEliminarConversacion()
  const salir = useSalirConversacion()

  const esCanal = c.tipo === "CANAL"
  const onError = (error: unknown) => notify(getErrorMessage(error), { variant: "error" })
  const cerrar = () => setDialogo(null)

  const abrirRenombrar = () => {
    setNombre(c.nombre)
    setDialogo("renombrar")
  }

  const botonFila = cn(
    "grid size-7 place-items-center rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
    activa ? "hover:bg-white/20" : "hover:bg-muted",
  )

  return (
    <div className={cn("flex items-center", className)}>
      {variante === "fila" && esCanal && (
        <>
          <button
            type="button"
            aria-label={`Editar ${c.nombre}`}
            title="Editar"
            onClick={abrirRenombrar}
            className={botonFila}
          >
            <PencilSimpleIcon className="size-4.5" />
          </button>
          <button
            type="button"
            aria-label={`Eliminar ${c.nombre}`}
            title="Eliminar"
            onClick={() => setDialogo("eliminar")}
            className={botonFila}
          >
            <TrashIcon className="size-4.5" />
          </button>
        </>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Opciones de ${c.nombre}`}
          className={cn(
            variante === "fila"
              ? botonFila
              : "grid size-9 shrink-0 place-items-center rounded-full hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none data-popup-open:bg-muted/60",
          )}
        >
          <DotsThreeVerticalIcon className={variante === "fila" ? "size-4.5" : "size-5"} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={variante === "fila" ? "start" : "end"} className="w-60">
          {esCanal && (
            <DropdownMenuItem
              className={ITEM}
              onClick={() =>
                notify("La votación rápida estará disponible cuando se conecte el servicio.", {
                  variant: "info",
                })
              }
            >
              <LightningIcon />
              Votación rápida
            </DropdownMenuItem>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={ITEM}>
              <BellSlashIcon />
              Silenciar notificaciones
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-36">
              {SILENCIOS.map((s) => (
                <DropdownMenuItem
                  key={s.valor}
                  className={ITEM}
                  onClick={() =>
                    silenciar.mutate(
                      { id: c.id, duracion: s.valor },
                      { onSuccess: () => notify(s.aviso), onError },
                    )
                  }
                >
                  {s.etiqueta}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {c.noLeidos > 0 ? (
            <DropdownMenuItem
              className={ITEM}
              onClick={() => marcarLeido.mutate(c.id, { onError })}
            >
              <ChatReadIcon />
              Marcar como leído
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className={ITEM}
              onClick={() =>
                marcarNoLeido.mutate(c.id, {
                  onSuccess: () => {
                    notify(`${c.nombre} quedó como no leído.`)
                    if (activa) onSalida()
                  },
                  onError,
                })
              }
            >
              <ChatUnreadIcon />
              Marcar como no leído
            </DropdownMenuItem>
          )}
          {esCanal && (
            <DropdownMenuItem
              className={ITEM}
              onClick={() =>
                duplicar.mutate(c.id, {
                  onSuccess: (copia) => notify(`Se creó ${copia.nombre}.`),
                  onError,
                })
              }
            >
              <CopyIcon />
              Duplicar
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className={ITEM}
            onClick={() =>
              archivar.mutate(
                { id: c.id, archivar: !c.archivada },
                {
                  onSuccess: () =>
                    notify(
                      c.archivada
                        ? `${c.nombre} volvió a tus conversaciones.`
                        : `${c.nombre} se movió a Archivados.`,
                    ),
                  onError,
                },
              )
            }
          >
            {c.archivada ? <UnarchiveIcon /> : <ArchiveIcon />}
            {c.archivada ? "Desarchivar" : "Archivar"}
          </DropdownMenuItem>
          {esCanal && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className={ITEM} onClick={() => setDialogo("salir")}>
                <SignOutIcon />
                Salir de grupo
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogo === "renombrar"} onOpenChange={(open) => !open && cerrar()}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const limpio = nombre.trim()
              if (!limpio || renombrar.isPending) return
              renombrar.mutate(
                { id: c.id, nombre: limpio },
                {
                  onSuccess: () => {
                    notify("Canal actualizado.")
                    cerrar()
                  },
                  onError,
                },
              )
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>Editar canal</DialogTitle>
              <DialogDescription>El nuevo nombre lo verán todos los miembros.</DialogDescription>
            </DialogHeader>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">Nombre del canal</span>
              <Input
                autoFocus
                value={nombre}
                maxLength={80}
                onChange={(e) => setNombre(e.target.value)}
              />
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="fill"
                color="neutral"
                onClick={cerrar}
                disabled={renombrar.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!nombre.trim() || renombrar.isPending}
                aria-busy={renombrar.isPending}
              >
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Confirmacion
        open={dialogo === "eliminar"}
        onClose={cerrar}
        titulo={`¿Eliminar ${c.nombre}?`}
        accion="Eliminar canal"
        pendiente={eliminar.isPending}
        onConfirmar={() =>
          eliminar.mutate(c.id, {
            onSuccess: () => {
              notify(`Se eliminó ${c.nombre}.`)
              cerrar()
              if (activa) onSalida()
            },
            onError,
          })
        }
      >
        Se borrarán el canal y sus mensajes para todos los miembros. Esta acción no se puede
        deshacer.
      </Confirmacion>

      <Confirmacion
        open={dialogo === "salir"}
        onClose={cerrar}
        titulo={`¿Salir de ${c.nombre}?`}
        accion="Salir de grupo"
        pendiente={salir.isPending}
        onConfirmar={() =>
          salir.mutate(c.id, {
            onSuccess: () => {
              notify(`Saliste de ${c.nombre}.`)
              cerrar()
              if (activa) onSalida()
            },
            onError,
          })
        }
      >
        Dejarás de recibir sus mensajes. Para volver, un administrador del canal tendrá que
        agregarte de nuevo.
      </Confirmacion>
    </div>
  )
}

function Confirmacion({
  open,
  onClose,
  titulo,
  accion,
  pendiente,
  onConfirmar,
  children,
}: {
  open: boolean
  onClose: () => void
  titulo: string
  accion: string
  pendiente: boolean
  onConfirmar: () => void
  children: ReactNode
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !pendiente && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{children}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="fill" color="neutral" disabled={pendiente}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            color="destructive"
            disabled={pendiente}
            aria-busy={pendiente}
            onClick={onConfirmar}
          >
            {accion}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
