import { useEffect, useState } from "react"

import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { ChatCircleTextIcon } from "@/components/ui/icons"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { chatRoute } from "@/router"
import { useConversacionesQuery } from "@/features/comunicaciones/chat/api/query/use-conversaciones-query"
import { useMensajesQuery } from "@/features/comunicaciones/chat/api/query/use-mensajes-query"
import { useEnviarMensaje } from "@/features/comunicaciones/chat/api/mutations/use-enviar-mensaje"
import { useMarcarLeido } from "@/features/comunicaciones/chat/api/mutations/use-acciones-conversacion"
import { ChatSidebar } from "@/features/comunicaciones/chat/components/chat-sidebar"
import { ChatHeader } from "@/features/comunicaciones/chat/components/chat-header"
import { ChatMessages } from "@/features/comunicaciones/chat/components/chat-messages"
import { ChatComposer } from "@/features/comunicaciones/chat/components/chat-composer"
import {
  CanalBienvenida,
  EleccionEstado,
  EleccionResultados,
} from "@/features/comunicaciones/chat/components/eleccion-panel"
import { useEleccionQuery } from "@/features/comunicaciones/chat/api/query/use-eleccion-query"
import { useEncuestaQuery } from "@/features/comunicaciones/chat/api/query/use-encuesta-query"
import { useEvaluacionQuery } from "@/features/comunicaciones/chat/api/query/use-evaluacion-query"
import { useComunicadoQuery } from "@/features/comunicaciones/chat/api/query/use-comunicado-query"
import { ComunicadoPanel } from "@/features/comunicaciones/chat/components/comunicado-panel"
import {
  EvaluacionEntregas,
  EvaluacionEstado,
} from "@/features/comunicaciones/chat/components/evaluacion-panel"
import {
  EncuestaEstado,
  EncuestaResultados,
} from "@/features/comunicaciones/chat/components/encuesta-panel"
import { ArchivosView } from "@/features/comunicaciones/chat/components/archivos-view"
import { BorradoresView } from "@/features/comunicaciones/chat/components/borradores-view"
import { useEliminarBorrador } from "@/features/comunicaciones/chat/api/mutations/use-acciones-borrador"
import type { Borrador } from "@/features/comunicaciones/chat/api/types"
import type { VistaChat } from "@/features/comunicaciones/chat/api/schema"

export function ChatPage() {
  return (
    <NoticeProvider>
      <ChatContent />
    </NoticeProvider>
  )
}

function ChatContent() {
  const { canal, vista } = chatRoute.useSearch()
  const navigate = chatRoute.useNavigate()
  const { notify } = useNotify()
  const [busqueda, setBusqueda] = useState("")
  // Borrador abierto desde "Borradores y enviados"; al enviarlo se elimina.
  const [borrador, setBorrador] = useState<Borrador | null>(null)

  const conversacionesQuery = useConversacionesQuery()
  const conversaciones = conversacionesQuery.data ?? []
  const activa = vista ? undefined : conversaciones.find((c) => c.id === canal)
  const panelAbierto = !!activa || !!vista
  const mensajesQuery = useMensajesQuery(activa?.id)
  const esEleccion = activa?.categoria === "VOTACION"
  const eleccionQuery = useEleccionQuery(esEleccion ? activa.id : undefined)
  const eleccion = eleccionQuery.data
  const esEncuesta = activa?.categoria === "ENCUESTA"
  const encuestaQuery = useEncuestaQuery(esEncuesta ? activa.id : undefined)
  const encuesta = encuestaQuery.data
  const esEvaluacion = activa?.categoria === "EXAMEN"
  const evaluacionQuery = useEvaluacionQuery(esEvaluacion ? activa.id : undefined)
  const evaluacion = evaluacionQuery.data
  const esComunicado = activa?.categoria === "ANUNCIO"
  const comunicadoQuery = useComunicadoQuery(esComunicado ? activa.id : undefined)
  // Sin comentarios habilitados el canal de la elección es solo lectura.
  const sinComentarios = esEleccion && eleccion && !eleccion.permitirComentarios

  const enviar = useEnviarMensaje()
  const marcarLeido = useMarcarLeido()
  const eliminarBorrador = useEliminarBorrador()

  const seleccionar = (id: number | undefined) => {
    setBusqueda("")
    setBorrador(null)
    navigate({ search: (prev) => ({ ...prev, canal: id, vista: undefined }) })
  }

  const abrirVista = (v: VistaChat) => {
    setBorrador(null)
    navigate({ search: (prev) => ({ ...prev, canal: undefined, vista: v }) })
  }

  const editarBorrador = (b: Borrador) => {
    seleccionar(b.conversacionId)
    setBorrador(b)
  }

  // Abrir una conversación con pendientes la marca como leída.
  const pendientes = activa?.noLeidos ?? 0
  const { mutate: leer } = marcarLeido
  useEffect(() => {
    if (activa?.id && pendientes > 0) leer(activa.id)
  }, [activa?.id, pendientes, leer])

  const onError = (error: unknown) => notify(getErrorMessage(error), { variant: "error" })

  return (
    <div className="flex h-[calc(100dvh-4.5rem)] min-h-[32rem] flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex h-16 shrink-0 items-center border-b bg-chat-panel px-5">
        <h1 className="text-2xl font-bold">Chat</h1>
      </div>
      <NoticeOutlet className="mx-4 my-3 md:mx-5" />

      <div className="flex min-h-0 flex-1">
        <ChatSidebar
          conversaciones={conversaciones}
          isPending={conversacionesQuery.isPending}
          isError={conversacionesQuery.isError}
          onRetry={() => void conversacionesQuery.refetch()}
          activaId={activa?.id}
          vista={vista}
          onVista={abrirVista}
          onSeleccionar={seleccionar}
          className={cn("w-full md:w-72 md:shrink-0", panelAbierto && "max-md:hidden")}
        />

        <main className={cn("flex min-w-0 flex-1 flex-col bg-card", !panelAbierto && "max-md:hidden")}>
          {vista === "archivos" ? (
            <ArchivosView onVolver={() => seleccionar(undefined)} />
          ) : vista === "borradores" ? (
            <BorradoresView onVolver={() => seleccionar(undefined)} onEditar={editarBorrador} />
          ) : activa ? (
            <>
              <ChatHeader
                conversacion={activa}
                busqueda={busqueda}
                onBusqueda={setBusqueda}
                onVolver={() => seleccionar(undefined)}
              />
              {eleccion && <EleccionEstado eleccion={eleccion} />}
              {encuesta && <EncuestaEstado encuesta={encuesta} />}
              {evaluacion && <EvaluacionEstado evaluacion={evaluacion} />}
              {esComunicado ? (
                <ComunicadoPanel
                  comunicado={comunicadoQuery.data}
                  isPending={comunicadoQuery.isPending}
                  isError={comunicadoQuery.isError}
                  onRetry={() => void comunicadoQuery.refetch()}
                />
              ) : (
              <>
              <ChatMessages
                mensajes={mensajesQuery.data ?? []}
                isPending={mensajesQuery.isPending}
                isError={mensajesQuery.isError}
                onRetry={() => void mensajesQuery.refetch()}
                busqueda={busqueda}
                nombreConversacion={activa.nombre}
                antes={
                  activa.categoria === "GENERAL" && activa.creadoPor ? (
                    <CanalBienvenida
                      key={activa.id}
                      canal={{
                        conversacionId: activa.id,
                        nombre: activa.nombre,
                        creadoPor: activa.creadoPor,
                        esCreador: !!activa.esCreador,
                      }}
                    />
                  ) : esEvaluacion ? (
                    <>
                      {evaluacion && <CanalBienvenida key={evaluacion.conversacionId} canal={evaluacion} />}
                      <EvaluacionEntregas evaluacion={evaluacion} isPending={evaluacionQuery.isPending} />
                    </>
                  ) : esEncuesta ? (
                    <>
                      {encuesta && <CanalBienvenida key={encuesta.conversacionId} canal={encuesta} />}
                      <EncuestaResultados encuesta={encuesta} isPending={encuestaQuery.isPending} />
                    </>
                  ) : (
                    esEleccion && (
                      <>
                        {eleccion && <CanalBienvenida key={eleccion.conversacionId} canal={eleccion} />}
                        <EleccionResultados
                          eleccion={eleccion}
                          isPending={eleccionQuery.isPending}
                          actualizadoEn={eleccionQuery.dataUpdatedAt}
                        />
                      </>
                    )
                  )
                }
              />
              {sinComentarios ? (
                <p className="shrink-0 border-t px-5 py-4 text-center text-sm text-muted-foreground">
                  Los comentarios están desactivados en esta elección.
                </p>
              ) : (
              <ChatComposer
                key={`${activa.id}-${borrador?.id ?? "nuevo"}`}
                textoInicial={borrador?.conversacionId === activa.id ? borrador.texto : ""}
                destino={activa.tipo === "CANAL" ? `#${activa.nombre}` : activa.nombre}
                enviando={enviar.isPending}
                onEnviar={(texto, archivo) =>
                  enviar
                    .mutateAsync({ conversacionId: activa.id, texto, archivo })
                    .then(() => {
                      if (borrador?.conversacionId === activa.id) {
                        eliminarBorrador.mutate(borrador.id)
                        setBorrador(null)
                      }
                    })
                    .catch((error) => {
                    onError(error)
                    throw error
                  })
                }
              />
              )}
              </>
              )}
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-6 text-center">
              <div className="max-w-xs space-y-2">
                <ChatCircleTextIcon aria-hidden className="mx-auto size-10 text-muted-foreground" />
                <p className="font-medium">Elige una conversación</p>
                <p className="text-sm text-muted-foreground">
                  Selecciona un canal o un mensaje directo de la lista para ver y responder
                  mensajes.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
