import { EditarActividad } from "@/features/comunicaciones/chat/components/editar-actividad"
import { EditarGrupoDialog } from "@/features/comunicaciones/chat/components/editar-grupo-dialog"
import {
  ETIQUETA_EDITAR,
  esActividadEditable,
  esCategoriaActividad,
  gestionaActividad,
} from "@/features/comunicaciones/chat/lib/actividad-editable"
import { CHAT_FUNCIONES, PROXIMAMENTE } from "@/features/comunicaciones/chat/lib/funciones-disponibles"
import { useState, type ReactNode } from "react"
import { VotacionRapidaDialog } from "@/features/comunicaciones/chat/components/votacion-rapida-dialog"
import { useChatAccess } from "@/features/comunicaciones/chat/api/use-chat-access"
import { useCerrarEleccion } from "@/features/comunicaciones/chat/api/mutations/use-crear-eleccion"

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
import type { Conversacion } from "@/features/comunicaciones/chat/api/types"
import { SILENCIOS } from "@/features/comunicaciones/chat/lib/silencios"
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
  BellIcon,
  LightningIcon,
  XSquareIcon,
} from "@/components/ui/icons"

// Los items del menú base van en mayúsculas; el diseño del chat los pide en oración.
const ITEM = "gap-3 py-2.5 text-sm font-normal tracking-normal normal-case [&_svg]:size-5!"


type Dialogo = "renombrar" | "editarActividad" | "eliminar" | "salir" | "votacion" | "cerrarEleccion" | null

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
  const cerrarEleccion = useCerrarEleccion()

  const { puedeGestionar, perfil } = useChatAccess()
  // Foros (CANAL) y grupos se administran igual: solo quien administra (`esAdmin`). El canal de una
  // actividad lo gestiona además su creador (mientras siga dentro) y los directivos miembros.
  const esCanal = c.tipo === "CANAL" || c.tipo === "GRUPO"
  const gestionaCanal =
    esCanal && (esCategoriaActividad(c.categoria) ? gestionaActividad(c, perfil) : (c.esAdmin ?? puedeGestionar))
  const destinoSalir = c.tipo === "GRUPO" ? "del grupo" : "del foro"
  const onError = (error: unknown) => notify(getErrorMessage(error), { variant: "error" })
  const cerrar = () => setDialogo(null)

  // Elección, encuesta, evaluación o comunicado propios: el lápiz abre "Editar …" con todos sus
  // datos; un grupo, "Editar grupo" (descripción, imagen y quién escribe); un foro solo se renombra.
  const actividadEditable = esActividadEditable(c, perfil)
  const abrirRenombrar = () => {
    if (actividadEditable) {
      setDialogo("editarActividad")
      return
    }
    setNombre(c.nombre)
    setDialogo("renombrar")
  }

  const botonFila = cn(
    "grid size-7 place-items-center rounded-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
    activa ? "hover:bg-white/20" : "hover:bg-muted",
  )

  return (
    <div className={cn("flex items-center", className)}>
      {variante === "fila" && gestionaCanal && (
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
          {gestionaCanal && (
            <DropdownMenuItem
              className={ITEM}
              disabled={!CHAT_FUNCIONES.votacionRapida}
              onClick={() => setDialogo("votacion")}
            >
              <LightningIcon />
              <span className="flex-1">Votación rápida</span>
              {!CHAT_FUNCIONES.votacionRapida && <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-muted-foreground normal-case">{PROXIMAMENTE}</span>}
            </DropdownMenuItem>
          )}
          {actividadEditable && (
            <DropdownMenuItem className={ITEM} onClick={() => setDialogo("editarActividad")}>
              <PencilSimpleIcon />
              {ETIQUETA_EDITAR[c.categoria as keyof typeof ETIQUETA_EDITAR]}
            </DropdownMenuItem>
          )}
          {/* Solo quien gestiona la elección puede cerrarla, y solo mientras sigue abierta. */}
          {c.categoria === "VOTACION" && gestionaCanal && c.actividadAbierta && (
            <DropdownMenuItem className={ITEM} onClick={() => setDialogo("cerrarEleccion")}>
              <XSquareIcon />
              Cerrar proceso electoral
            </DropdownMenuItem>
          )}
          {/* Toggle según el estado real: comms-service solo devuelve `silenciadoHasta` mientras
              el silencio está vigente. Silenciada: "Activar notificaciones" (DURACION NINGUNA) y
              "Cambiar silencio" para otra duración. */}
          {c.silenciadoHasta && (
            <DropdownMenuItem
              className={ITEM}
              disabled={!CHAT_FUNCIONES.activarNotificaciones || silenciar.isPending}
              onClick={() =>
                silenciar.mutate(
                  { id: c.id, duracion: "NINGUNA" },
                  { onSuccess: () => notify(`Notificaciones activadas en ${c.nombre}.`), onError },
                )
              }
            >
              <BellIcon />
              <span className="flex-1">Activar notificaciones</span>
              {!CHAT_FUNCIONES.activarNotificaciones && <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-muted-foreground normal-case">{PROXIMAMENTE}</span>}
            </DropdownMenuItem>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className={ITEM}>
              <BellSlashIcon />
              {c.silenciadoHasta ? "Cambiar silencio" : "Silenciar notificaciones"}
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
          {gestionaCanal && (
            <DropdownMenuItem
              className={ITEM}
              disabled={!CHAT_FUNCIONES.duplicar}
              onClick={() =>
                duplicar.mutate(c.id, {
                  onSuccess: (copia) => notify(`Se creó ${copia.nombre}.`),
                  onError,
                })
              }
            >
              <CopyIcon />
              <span className="flex-1">Duplicar</span>
              {!CHAT_FUNCIONES.duplicar && <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-muted-foreground normal-case">{PROXIMAMENTE}</span>}
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
                Salir {destinoSalir}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {gestionaCanal && (
        <VotacionRapidaDialog
          conversacionId={c.id}
          open={dialogo === "votacion"}
          onClose={cerrar}
        />
      )}

      <Confirmacion
        open={dialogo === "cerrarEleccion"}
        onClose={cerrar}
        titulo="Cerrar proceso electoral"
        accion="Cerrar votación"
        colorAccion="primary"
        pendiente={cerrarEleccion.isPending}
        onConfirmar={() =>
          cerrarEleccion.mutate(c.id, {
            onSuccess: () => {
              notify("Cerraste la votación. Ya no se reciben más votos.")
              cerrar()
            },
            onError,
          })
        }
      >
        <strong className="block font-semibold text-foreground">
          ¿Deseas finalizar manualmente este proceso electoral?
        </strong>
        Al cerrar la votación, los participantes ya no podrán votar y los resultados quedarán
        disponibles según la configuración definida.
      </Confirmacion>

      <EditarActividad conversacion={c} open={dialogo === "editarActividad"} onClose={cerrar} />

      {/* Grupo: nombre, descripción, imagen y quién escribe; foro: solo el nombre. */}
      {c.tipo === "GRUPO" && (
        <EditarGrupoDialog conversacion={c} open={dialogo === "renombrar"} onClose={cerrar} />
      )}

      <Dialog open={dialogo === "renombrar" && c.tipo !== "GRUPO"} onOpenChange={(open) => !open && cerrar()}>
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
                    notify(c.tipo === "GRUPO" ? "Grupo actualizado." : "Foro actualizado.")
                    cerrar()
                  },
                  onError,
                },
              )
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>{c.tipo === "GRUPO" ? "Editar grupo" : "Editar foro"}</DialogTitle>
              <DialogDescription>El nuevo nombre lo verán todos los miembros.</DialogDescription>
            </DialogHeader>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">{c.tipo === "GRUPO" ? "Nombre del grupo" : "Nombre del foro"}</span>
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
        accion={c.tipo === "GRUPO" ? "Eliminar grupo" : "Eliminar foro"}
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
        Se borrarán {c.tipo === "GRUPO" ? "el grupo" : "el foro"} y sus mensajes para todos los miembros. Esta acción no se puede
        deshacer.
      </Confirmacion>

      <Confirmacion
        open={dialogo === "salir"}
        onClose={cerrar}
        titulo={`¿Salir de ${c.nombre}?`}
        accion={`Salir ${destinoSalir}`}
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
        {/* Un grupo no tiene sucesión (decisión de Natalia, comms-service `salir`): si sale quien lo
            creó, el grupo sigue pero nadie puede agregar ni quitar participantes. */}
        {c.tipo === "GRUPO" && c.esAdmin
          ? "Eres quien creó el grupo. Si sales, el grupo seguirá y sus miembros podrán seguir conversando, pero quedará sin administrador: nadie podrá agregar ni quitar participantes, y tú no podrás volver."
          : c.tipo === "GRUPO"
            ? "Dejarás de recibir sus mensajes. Para volver, quien creó el grupo tendrá que agregarte de nuevo."
            : "Dejarás de recibir sus mensajes. Para volver, un administrador tendrá que agregarte de nuevo. Si eres el último administrador, la persona más antigua del foro pasará a administrarlo."}
      </Confirmacion>
    </div>
  )
}

function Confirmacion({
  open,
  onClose,
  titulo,
  accion,
  colorAccion = "destructive",
  pendiente,
  onConfirmar,
  children,
}: {
  open: boolean
  onClose: () => void
  titulo: string
  accion: string
  colorAccion?: "destructive" | "primary"
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
            color={colorAccion}
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
