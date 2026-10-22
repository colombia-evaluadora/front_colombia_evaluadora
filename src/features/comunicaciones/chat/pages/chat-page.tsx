import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { ChatCircleTextIcon } from "@/components/ui/icons"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { chatRoute } from "@/router"
import { useConversacionesQuery } from "@/features/comunicaciones/chat/api/query/use-conversaciones-query"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import {
  hayMensajesAnteriores,
  useCargarMensajesAnteriores,
  useMensajesQuery,
} from "@/features/comunicaciones/chat/api/query/use-mensajes-query"
import { Button } from "@/components/ui/button"
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
import { EvaluacionEstudiante } from "@/features/comunicaciones/chat/components/evaluacion-estudiante"
import { EncuestaParticipante } from "@/features/comunicaciones/chat/components/encuesta-participante"
import { EleccionEstudiante } from "@/features/comunicaciones/chat/components/eleccion-estudiante"
import { useChatAccess } from "@/features/comunicaciones/chat/api/use-chat-access"
import { estadoEleccion } from "@/features/comunicaciones/chat/lib/eleccion"
import { ArchivosView } from "@/features/comunicaciones/chat/components/archivos-view"
import { BorradoresView } from "@/features/comunicaciones/chat/components/borradores-view"
import { useGuardarBorrador } from "@/features/comunicaciones/chat/api/mutations/use-acciones-borrador"
import { useBorradoresQuery } from "@/features/comunicaciones/chat/api/query/use-borradores-query"
import type { Borrador, CategoriaCanal, Mensaje } from "@/features/comunicaciones/chat/api/types"
import { useMiembrosQuery } from "@/features/comunicaciones/chat/api/query/use-miembros-query"
import {
  textoEscribiendo,
  useAvisarEscribiendo,
  useChatTiempoRealCanal,
  useChatTiempoRealUsuario,
} from "@/features/comunicaciones/chat/api/use-chat-tiempo-real"
import { textoPlano } from "@/features/comunicaciones/chat/lib/menciones"
import { realtimeEnabled } from "@/lib/realtime"
import { FijadosBarra } from "@/features/comunicaciones/chat/components/fijados-barra"
import { puedeVerEliminados } from "@/features/comunicaciones/chat/lib/estado-mensaje"
import { useRealtimeStatus } from "@/lib/realtime/use-realtime"
import type { RealtimeStatus } from "@/lib/realtime/protocol"
import type { VistaChat } from "@/features/comunicaciones/chat/api/schema"

const CANALES_SIN_COMENTARIOS: CategoriaCanal[] = ["VOTACION", "ENCUESTA", "EXAMEN"]

export function ChatPage() {
  return (
    <NoticeProvider>
      <ChatContent />
    </NoticeProvider>
  )
}

function ChatContent() {
  const { canal, vista, mensaje: mensajeEnlazado } = chatRoute.useSearch()
  const navigate = chatRoute.useNavigate()
  const { notify } = useNotify()
  const [busqueda, setBusqueda] = useState("")
  // `vez` permite volver a saltar al mismo mensaje.
  const [destacado, setDestacado] = useState<{ id: number; vez: number }>()
  // Borrador abierto desde "Borradores y enviados"; al enviarlo se elimina.
  const [borrador, setBorrador] = useState<Borrador | null>(null)
  // Mensaje al que se está respondiendo desde el compositor.
  const [respondiendo, setRespondiendo] = useState<Mensaje | null>(null)
  // Foto de los no leídos al abrir el canal: fija el divisor "Nuevos" aunque
  // luego se marque como leído o lleguen mensajes en vivo.
  const [marca, setMarca] = useState<{ conversacionId: number; noLeidos: number; id?: number | null }>()

  const conversacionesQuery = useConversacionesQuery()
  // Los foros tienen su pantalla (`/app/comunicaciones/foros`): el chat no los lista.
  const conversaciones = (conversacionesQuery.data ?? []).filter((c) => c.tipo !== "FORO")
  const queryClient = useQueryClient()
  const { data: borradores = [] } = useBorradoresQuery()
  const activa = vista ? undefined : conversaciones.find((c) => c.id === canal)
  // Borrador del canal abierto: el elegido en "Borradores" o el que quedó guardado.
  const borradorActivo = activa
    ? borrador?.conversacionId === activa.id
      ? borrador
      : borradores.find((b) => b.conversacionId === activa.id && b.estado === "BORRADOR")
    : undefined
  const panelAbierto = !!activa || !!vista
  const mensajesQuery = useMensajesQuery(activa?.id)
  const esEleccion = activa?.categoria === "VOTACION"
  const eleccionQuery = useEleccionQuery(esEleccion ? activa.id : undefined)
  const eleccion = eleccionQuery.data
  const { esEstudiante, puedeMencionarMasivo, perfil } = useChatAccess()
  // El estudiante vota mientras la elección sigue abierta; al cerrar ve los resultados.
  // Vota quien no la creó (estudiante o funcionario habilitado); el servidor valida el censo.
  const votaEstudiante = !!eleccion && !eleccion.esCreador && estadoEleccion(eleccion) !== "FINALIZADA"
  const esEncuesta = activa?.categoria === "ENCUESTA"
  const encuestaQuery = useEncuestaQuery(esEncuesta ? activa.id : undefined)
  const encuesta = encuestaQuery.data
  const esEvaluacion = activa?.categoria === "EXAMEN"
  const evaluacionQuery = useEvaluacionQuery(esEvaluacion ? activa.id : undefined)
  const evaluacion = evaluacionQuery.data
  const esComunicado = activa?.categoria === "ANUNCIO"
  const comunicadoQuery = useComunicadoQuery(esComunicado ? activa.id : undefined)
  // Elecciones, encuestas y exámenes son canales sin comentarios para todos.
  // En el comunicado el estudiante solo lee; no escribe.
  const soloLectura =
    !!activa &&
    (CANALES_SIN_COMENTARIOS.includes(activa.categoria) ||
      (esEstudiante && activa.categoria === "ANUNCIO"))

  // Tiempo real: bandeja personal, presencia y eventos del canal abierto.
  // Si lo quitan (o se borra) la conversación abierta, se vuelve a la lista con un aviso.
  useChatTiempoRealUsuario((e) => {
    if (e.id === canal) navigate({ search: (prev) => ({ ...prev, canal: undefined, mensaje: undefined }) })
    const nombre = e.nombre ?? "una conversación"
    notify(e.motivo === "QUITADO" ? `Te quitaron de ${nombre}.` : `${nombre} ya no está disponible.`, {
      variant: "warning",
    })
  })
  const escribiendo = useChatTiempoRealCanal(activa?.id, puedeVerEliminados(activa, perfil))
  const avisarEscribiendo = useAvisarEscribiendo(activa?.id)
  const miembrosQuery = useMiembrosQuery(activa && !soloLectura ? activa.id : undefined)

  if (activa && marca?.conversacionId !== activa.id) {
    setMarca({ conversacionId: activa.id, noLeidos: activa.noLeidos })
  } else if (activa && marca && marca.id === undefined && mensajesQuery.data) {
    const ajenos = mensajesQuery.data.filter((m) => !m.esPropio && !m.sistema)
    const id = marca.noLeidos > 0 ? (ajenos.at(-marca.noLeidos) ?? ajenos[0])?.id ?? null : null
    setMarca({ ...marca, id })
  }

  const enviar = useEnviarMensaje()
  // Mismo `CLIENT_MESSAGE_ID` mientras se reintenta el mismo texto en el mismo
  // canal (envío fallido → reintento): el backend no lo duplica.
  const intento = useRef<{ clave: string; id: string } | null>(null)
  const idDeIntento = (clave: string) => {
    if (intento.current?.clave !== clave) intento.current = { clave, id: crypto.randomUUID() }
    return intento.current.id
  }
  const cargarAnteriores = useCargarMensajesAnteriores()
  // Canales cuyo historial anterior ya se agotó.
  const [agotados, setAgotados] = useState<Set<number>>(() => new Set())
  const marcarLeido = useMarcarLeido()
  const guardarBorrador = useGuardarBorrador()

  const seleccionar = (id: number | undefined) => {
    setBusqueda("")
    setDestacado(undefined)
    setBorrador(null)
    setRespondiendo(null)
    navigate({ search: (prev) => ({ ...prev, canal: id, vista: undefined, mensaje: undefined }) })
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

  // Deep link de una notificación: saltar al mensaje cuando el historial cargó.
  const historialListo = !!mensajesQuery.data
  useEffect(() => {
    if (!mensajeEnlazado || !historialListo) return
    setDestacado((d) => ({ id: mensajeEnlazado, vez: (d?.vez ?? 0) + 1 }))
    navigate({ search: (prev) => ({ ...prev, mensaje: undefined }), replace: true })
  }, [mensajeEnlazado, historialListo, navigate])

  const irAMensaje = (id: number) => setDestacado((d) => ({ id, vez: (d?.vez ?? 0) + 1 }))

  const onError = (error: unknown) => notify(getErrorMessage(error), { variant: "error" })

  return (
    <div className="flex h-[calc(100dvh-4.5rem)] min-h-[32rem] flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex h-16 shrink-0 items-center border-b bg-chat-panel px-5">
        <h1 className="text-2xl font-bold">Chat</h1>
        {realtimeEnabled && <EstadoConexion />}
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
            <BorradoresView
              onVolver={() => seleccionar(undefined)}
              onEditar={editarBorrador}
              onAbrirEnviado={(e) =>
                navigate({
                  search: (prev) => ({ ...prev, canal: e.conversacionId, vista: undefined, mensaje: e.mensajeId ?? undefined }),
                })
              }
            />
          ) : activa ? (
            <>
              <ChatHeader
                conversacion={activa}
                mensajes={mensajesQuery.data ?? []}
                busqueda={busqueda}
                onBusqueda={setBusqueda}
                onIrAMensaje={irAMensaje}
                onVolver={() => seleccionar(undefined)}
              />
              {!esComunicado && <FijadosBarra mensajes={mensajesQuery.data ?? []} onIr={irAMensaje} />}
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
                destacado={destacado}
                nombreConversacion={activa.nombre}
                conversacion={activa}
                primerNoLeidoId={marca?.conversacionId === activa.id ? (marca.id ?? undefined) : undefined}
                onResponder={soloLectura ? undefined : setRespondiendo}
                onIrAMensaje={irAMensaje}
                anteriores={
                  hayMensajesAnteriores(mensajesQuery.data, agotados.has(activa.id)) && (
                    <div className="mb-2 flex justify-center">
                      <Button
                        variant="ghost"
                        color="neutral"
                        size="sm"
                        disabled={cargarAnteriores.isPending}
                        onClick={() =>
                          cargarAnteriores.mutate(activa.id, {
                            onSuccess: ({ agotado }) => {
                              if (agotado) setAgotados((prev) => new Set(prev).add(activa.id))
                            },
                            onError,
                          })
                        }
                      >
                        {cargarAnteriores.isPending ? "Cargando…" : "Cargar mensajes anteriores"}
                      </Button>
                    </div>
                  )
                }
                antes={
                  activa.categoria === "GENERAL" && activa.creadoPor ? (
                    <CanalBienvenida
                      key={activa.id}
                      tipo={activa.tipo === "GRUPO" ? "grupo" : "foro"}
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
                      {esEstudiante ? (
                        <EvaluacionEstudiante evaluacion={evaluacion} isPending={evaluacionQuery.isPending} />
                      ) : (
                        <EvaluacionEntregas evaluacion={evaluacion} isPending={evaluacionQuery.isPending} />
                      )}
                    </>
                  ) : esEncuesta ? (
                    <>
                      {encuesta && <CanalBienvenida key={encuesta.conversacionId} canal={encuesta} />}
                      {/* Quien la creó ve los resultados; las personas asignadas la responden. */}
                      {encuesta && !encuesta.esCreador ? (
                        <EncuestaParticipante encuesta={encuesta} isPending={encuestaQuery.isPending} />
                      ) : (
                        <EncuestaResultados encuesta={encuesta} isPending={encuestaQuery.isPending} />
                      )}
                    </>
                  ) : (
                    esEleccion && (
                      <>
                        {eleccion && <CanalBienvenida key={eleccion.conversacionId} canal={eleccion} />}
                        {votaEstudiante ? (
                          <EleccionEstudiante eleccion={eleccion} isPending={eleccionQuery.isPending} />
                        ) : (
                          <EleccionResultados
                            eleccion={eleccion}
                            isPending={eleccionQuery.isPending}
                            actualizadoEn={eleccionQuery.dataUpdatedAt}
                          />
                        )}
                      </>
                    )
                  )
                }
              />
              <Escribiendo nombres={escribiendo} />
              {soloLectura ? (
                <p className="shrink-0 border-t px-5 py-4 text-center text-sm text-muted-foreground">
                  En este foro no se pueden enviar mensajes.
                </p>
              ) : (
              <ChatComposer
                key={`${activa.id}-${borradorActivo?.id ?? "nuevo"}`}
                textoInicial={borradorActivo?.texto ?? ""}
                onGuardarBorrador={(texto) => guardarBorrador.mutate({ conversacionId: activa.id, texto })}
                destino={activa.tipo === "CANAL" ? `#${activa.nombre}` : activa.nombre}
                enviando={enviar.isPending}
                miembros={miembrosQuery.data ?? []}
                permitirMasivas={puedeMencionarMasivo && activa.tipo === "CANAL"}
                respondiendoA={
                  respondiendo && {
                    autor: respondiendo.esPropio ? "ti" : respondiendo.autor.nombre,
                    texto: textoPlano(respondiendo.texto, respondiendo.menciones).slice(0, 120),
                  }
                }
                onCancelarRespuesta={() => setRespondiendo(null)}
                onEscribiendo={avisarEscribiendo}
                onEnviar={(texto, archivo) =>
                  enviar
                    .mutateAsync({
                      conversacionId: activa.id,
                      texto,
                      archivo,
                      respuestaA: respondiendo?.id,
                      clientMessageId: idDeIntento(`${activa.id}|${respondiendo?.id ?? ""}|${texto}|${archivo?.name ?? ""}`),
                    })
                    .then(() => {
                      intento.current = null
                      setRespondiendo(null)
                      // El servidor pasa el borrador del canal a "Enviados".
                      if (borradorActivo) {
                        setBorrador(null)
                        void queryClient.invalidateQueries({ queryKey: chatKeys.borradores })
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
                  Selecciona un foro, un grupo o un mensaje directo de la lista para ver y responder
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

const ESTADO_CONEXION: Record<RealtimeStatus, { texto: string; color: string } | null> = {
  idle: null,
  // Conectado (o conectando por primera vez) no se muestra nada: solo se avisa cuando algo falla.
  open: null,
  connecting: null,
  reconnecting: { texto: "Reconectando…", color: "bg-yellow" },
  offline: { texto: "Sin conexión: se actualizará al volver la red", color: "bg-muted-foreground" },
  forbidden: { texto: "Actualización en vivo no disponible", color: "bg-red" },
}

// Indicador discreto del socket de tiempo real junto al título.
function EstadoConexion() {
  const estado = ESTADO_CONEXION[useRealtimeStatus()]
  if (!estado) return null
  return (
    <span role="status" className="ml-3 flex items-center gap-1.5 text-xs text-muted-foreground">
      <span aria-hidden className={cn("size-2 rounded-full", estado.color)} />
      {estado.texto}
    </span>
  )
}

/**
 * "Escribiendo…" (diseño 3729:39466): burbuja con tres puntos bajo el último mensaje y el nombre.
 * La región `aria-live` se mantiene montada para que el lector de pantalla anuncie el cambio.
 */
function Escribiendo({ nombres }: { nombres: string[] }) {
  const texto = textoEscribiendo(nombres)
  return (
    <div aria-live="polite" className="flex h-7 shrink-0 items-center gap-2 px-3 text-xs text-muted-foreground md:px-5">
      {texto && (
        <>
          <span aria-hidden className="flex h-6 items-center gap-1 rounded-lg bg-muted/60 px-2.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-none"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
          <span className="truncate">{texto}</span>
        </>
      )}
    </div>
  )
}
