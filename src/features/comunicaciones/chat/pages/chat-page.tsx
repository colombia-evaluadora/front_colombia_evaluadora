import { cerrarFrase } from "@/lib/frase"
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
import { useAjustesChatQuery } from "@/features/comunicaciones/chat/api/query/use-ajustes-chat-query"
import { puedeSolicitarConfirmacionLectura } from "@/features/comunicaciones/chat/lib/politica-chat"
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
import { ComunicadoArticulo, ComunicadoPanel } from "@/features/comunicaciones/chat/components/comunicado-panel"
import { comunicadoConRespuestas } from "@/features/comunicaciones/chat/lib/destinos-comunicado"
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
import {
  useGuardarBorrador,
  useProgramarMensaje,
} from "@/features/comunicaciones/chat/api/mutations/use-acciones-borrador"
import { fechaProgramada } from "@/features/comunicaciones/chat/lib/programacion"
import { CHAT_FUNCIONES } from "@/features/comunicaciones/chat/lib/funciones-disponibles"
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
import { useRealtimeStatus, useRealtimeTopic } from "@/lib/realtime/use-realtime"
import { useDocumentoVisible } from "@/hooks/use-documento-visible"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { topicoUsuario } from "@/lib/auth-mapper"
import type { NotificacionRow } from "@/features/notificaciones/api/types"
import {
  canalDeDeepLink,
  leerNotificacionesConversacion,
} from "@/features/notificaciones/api/mutations/leer-conversacion"
import type { RealtimeStatus } from "@/lib/realtime/protocol"
import type { VistaChat } from "@/features/comunicaciones/chat/api/schema"
import { motivoSinEscritura } from "@/features/comunicaciones/chat/lib/modo-grupo"
import { useResponderInvitacionEnlazada } from "@/features/comunicaciones/chat/hooks/use-responder-invitacion-enlazada"
import { useSincronizarBot } from "@/features/comunicaciones/chat/api/mutations/use-sincronizar-bot"
import { useDialogosAtajos } from "@/features/comunicaciones/chat/components/dialogos-atajos"
import {
  RespuestaAutomaticaAviso,
  SelectorDisponibilidad,
} from "@/features/comunicaciones/chat/components/disponibilidad"

const CANALES_SIN_COMENTARIOS: CategoriaCanal[] = ["VOTACION", "ENCUESTA", "EXAMEN"]

export function ChatPage() {
  return (
    <NoticeProvider>
      <ChatContent />
    </NoticeProvider>
  )
}

function ChatContent() {
  const { canal, vista, mensaje: mensajeEnlazado, invitacion, accion } = chatRoute.useSearch()
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
  // Colevabot: su conversación y el resumen de lo pendiente (una vez al abrir el chat).
  useSincronizarBot(conversacionesQuery.isSuccess)
  const conversaciones = conversacionesQuery.data ?? []
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
  const comunicado = comunicadoQuery.data
  // Comunicado con "Permitir respuestas" ya publicado: la tarjeta encabeza la conversación.
  const conRespuestas = esComunicado && comunicadoConRespuestas(comunicado)
  // Elecciones, encuestas y exámenes son canales sin comentarios para todos, salvo la elección con
  // "Permitir comentarios". En el comunicado responde quien lo recibe solo si quien lo publicó lo
  // permitió (comms-service responde 403 igual si lo intenta).
  // Elección cerrada (a mano o por fecha): nadie escribe, aunque tuviera "Permitir comentarios"
  // (Natalia). comms-service responde 403 igual (ChatService#exigirComentarios).
  const eleccionCerrada = !!eleccion && estadoEleccion(eleccion) === "FINALIZADA"
  const comentariosEleccion = esEleccion && !!eleccion?.permiteComentarios && !eleccionCerrada
  const soloLectura =
    !!activa &&
    ((CANALES_SIN_COMENTARIOS.includes(activa.categoria) && !comentariosEleccion) ||
      (activa.categoria === "ANUNCIO" && !conRespuestas) ||
      // Colevabot solo publica tarjetas: su DM no tiene compositor (diseño 4428:64360).
      activa.esBot)
  // Grupo en Solo lectura o Moderado: quien no puede escribir ve la explicación (comms-service
  // responde 403 igual si lo intenta).
  const sinEscritura = activa ? motivoSinEscritura(activa, perfil) : null

  // Botón Aceptar / Rechazar del push: responde la invitación al abrir y limpia la URL.
  useResponderInvitacionEnlazada(invitacion, accion, {
    onAceptada: (id) => navigate({ search: (prev) => ({ ...prev, invitacion: undefined, accion: undefined, canal: id }), replace: true }),
    onFin: () => navigate({ search: (prev) => ({ ...prev, accion: undefined }), replace: true }),
  })

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
  // Atajos "/" del compositor (crear actividades y votación rápida).
  const atajos = useDialogosAtajos({ conversacion: activa, onCreado: (id) => seleccionar(id) })

  if (activa && marca?.conversacionId !== activa.id) {
    setMarca({ conversacionId: activa.id, noLeidos: activa.noLeidos })
  } else if (activa && marca && marca.id === undefined && mensajesQuery.data) {
    const ajenos = mensajesQuery.data.filter((m) => !m.esPropio && !m.sistema)
    const id = marca.noLeidos > 0 ? (ajenos.at(-marca.noLeidos) ?? ajenos[0])?.id ?? null : null
    setMarca({ ...marca, id })
  }

  const enviar = useEnviarMensaje()
  // Confirmación de lectura del próximo mensaje (HU 7): el ajuste por defecto del usuario o lo que
  // elija en el compositor para esta conversación. Un estudiante no la pide si hay directivos.
  const ajustesChat = useAjustesChatQuery()
  const [confirmar, setConfirmar] = useState<{ conversacionId: number; activa: boolean } | null>(null)
  const confirmarActiva =
    confirmar && confirmar.conversacionId === activa?.id
      ? confirmar.activa
      : (ajustesChat.data?.confirmacionLecturaSolicitar ?? false)
  const puedePedirConfirmacion =
    !!activa && !activa.esBot && puedeSolicitarConfirmacionLectura(perfil, (miembrosQuery.data ?? []).map((m) => m.perfil))
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
  const programarMensaje = useProgramarMensaje()

  // `mensaje`: abrir en ese mensaje (resultado del historial filtrado).
  const seleccionar = (id: number | undefined, mensaje?: number) => {
    setBusqueda("")
    setDestacado(undefined)
    setBorrador(null)
    setRespondiendo(null)
    navigate({ search: (prev) => ({ ...prev, canal: id, vista: undefined, mensaje }) })
  }

  const abrirVista = (v: VistaChat) => {
    setBorrador(null)
    navigate({ search: (prev) => ({ ...prev, canal: undefined, vista: v }) })
  }

  const editarBorrador = (b: Borrador) => {
    seleccionar(b.conversacionId)
    setBorrador(b)
  }

  // Abrir una conversación con pendientes la marca como leída, y también los mensajes que llegan
  // mientras está abierta, pero solo con la pestaña visible: si el usuario está en otra pestaña o
  // con la ventana minimizada no los vio, quedan sin leer (contador y campana) hasta que vuelva.
  const visible = useDocumentoVisible()
  const pendientes = activa?.noLeidos ?? 0
  const { mutate: leer } = marcarLeido
  const vistoAntes = useRef<{ id?: number; visible: boolean }>({ visible })
  useEffect(() => {
    const antes = vistoAntes.current
    vistoAntes.current = { id: activa?.id, visible }
    if (!activa?.id || pendientes === 0 || !visible) return
    // Divisor "Nuevos": la foto se toma al abrir. Si ya estaba abierta y a la vista, lo que llega
    // en vivo se está viendo y el divisor deja de tener sentido; si vuelve a la pestaña con
    // mensajes sin leer, el divisor pasa al primero de ellos.
    if (antes.id === activa.id) {
      const id = activa.id
      const volvio = !antes.visible
      setMarca((m) =>
        m?.conversacionId !== id ? m : volvio ? { conversacionId: id, noLeidos: pendientes } : { ...m, id: null },
      )
    }
    leer(activa.id)
  }, [activa?.id, pendientes, visible, leer])

  // Aviso de la campana por un mensaje de la conversación abierta y a la vista: notification-service
  // lo crea ~1 s después del mensaje (outbox), cuando la conversación ya se leyó; queda leído en el acto.
  const { user } = useAuth()
  useRealtimeTopic(user && !user.offline ? topicoUsuario(user) : null, (e) => {
    if (e.event !== "notification.created" || !activa?.id || document.visibilityState !== "visible") return
    if (canalDeDeepLink((e.data as NotificacionRow | undefined)?.deep_link) === activa.id) {
      void leerNotificacionesConversacion(activa.id)
    }
  })

  // Deep link de una notificación o resultado del historial: saltar al mensaje cuando el
  // historial cargó. Si es más viejo que lo cargado, se piden páginas anteriores hasta llegar.
  const historial = mensajesQuery.data
  const activaId = activa?.id
  const historialAgotado = activaId != null && agotados.has(activaId)
  const { mutate: cargarMas, isPending: cargandoMas } = cargarAnteriores
  useEffect(() => {
    if (!mensajeEnlazado || !historial || activaId == null || cargandoMas) return
    const primero = historial[0]?.id
    const falta = !historial.some((m) => m.id === mensajeEnlazado) && primero != null && mensajeEnlazado < primero
    if (falta && !historialAgotado) {
      const agotar = () => setAgotados((prev) => new Set(prev).add(activaId))
      cargarMas(activaId, { onSuccess: ({ agotado }) => agotado && agotar(), onError: agotar })
      return
    }
    setDestacado((d) => ({ id: mensajeEnlazado, vez: (d?.vez ?? 0) + 1 }))
    navigate({ search: (prev) => ({ ...prev, mensaje: undefined }), replace: true })
  }, [mensajeEnlazado, historial, activaId, historialAgotado, cargandoMas, cargarMas, navigate])

  const irAMensaje = (id: number) => setDestacado((d) => ({ id, vez: (d?.vez ?? 0) + 1 }))

  const onError = (error: unknown) => notify(getErrorMessage(error), { variant: "error" })

  return (
    <div className="flex h-[calc(100dvh-4.5rem)] min-h-[32rem] flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex h-16 shrink-0 items-center border-b bg-chat-panel px-5">
        <h1 className="text-2xl font-bold">Chat</h1>
        {realtimeEnabled && <EstadoConexion />}
        <SelectorDisponibilidad className="ml-auto" />
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
          onAbrirMensaje={seleccionar}
          invitacionDestacada={invitacion}
          className={cn("w-full md:w-72 md:shrink-0", panelAbierto && "max-md:hidden")}
        />

        <main className={cn("flex min-w-0 flex-1 flex-col bg-card", !panelAbierto && "max-md:hidden")}>
          {vista === "archivos" ? (
            <ArchivosView onVolver={() => seleccionar(undefined)} />
          ) : vista === "borradores" ? (
            <BorradoresView
              onVolver={() => seleccionar(undefined)}
              onEditar={editarBorrador}
              onAbrirConversacion={(id) => seleccionar(id)}
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
              {esComunicado && !conRespuestas ? (
                <ComunicadoPanel
                  comunicado={comunicadoQuery.data}
                  isPending={comunicadoQuery.isPending}
                  isError={comunicadoQuery.isError}
                  onRetry={() => void comunicadoQuery.refetch()}
                />
              ) : (
              <>
              <ChatMessages
                mensajes={
                  // El mensaje de apertura del comunicado ya es la tarjeta de arriba.
                  conRespuestas
                    ? (mensajesQuery.data ?? []).filter((m) => m.id !== comunicado?.mensajeId)
                    : (mensajesQuery.data ?? [])
                }
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
                  conRespuestas && comunicado ? (
                    <div className="mb-4">
                      <ComunicadoArticulo comunicado={comunicado} />
                    </div>
                  ) : activa.categoria === "GENERAL" && activa.creadoPor ? (
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
                      {evaluacion && <CanalBienvenida key={evaluacion.conversacionId} tipo="evaluacion" canal={evaluacion} />}
                      {esEstudiante ? (
                        <EvaluacionEstudiante evaluacion={evaluacion} isPending={evaluacionQuery.isPending} />
                      ) : (
                        <EvaluacionEntregas evaluacion={evaluacion} isPending={evaluacionQuery.isPending} />
                      )}
                    </>
                  ) : esEncuesta ? (
                    <>
                      {encuesta && <CanalBienvenida key={encuesta.conversacionId} tipo="encuesta" canal={encuesta} />}
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
                        {eleccion && (
                          <CanalBienvenida
                            key={eleccion.conversacionId}
                            tipo="eleccion"
                            canal={eleccion}
                            soloTitulo={votaEstudiante}
                          />
                        )}
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
              {atajos.dialogos}
              <Escribiendo nombres={escribiendo} />
              {activa.tipo === "DIRECTO" && <RespuestaAutomaticaAviso conversacionId={activa.id} />}
              {/*
                Card "Elecciones" (ajuste de Maldonado): la elección sin comentarios no lleva caja de
                texto ni aviso de reemplazo (Figma 3837:43815, 4189:67308, 7127:76707). Con
                "Permitir · Comentarios" el composer sí aparece (4195:69012).
              */}
              {esEleccion && eleccionCerrada && eleccion?.permiteComentarios ? (
                <p role="status" className="shrink-0 border-t px-5 py-4 text-center text-sm text-muted-foreground">
                  La elección cerró: ya no se pueden enviar mensajes.
                </p>
              ) : activa.esBot || (soloLectura && esEleccion) ? null : soloLectura ? (
                <p className="shrink-0 border-t px-5 py-4 text-center text-sm text-muted-foreground">
                  En este foro no se pueden enviar mensajes.
                </p>
              ) : sinEscritura ? (
                <p role="status" className="shrink-0 border-t px-5 py-4 text-center text-sm text-muted-foreground">
                  {sinEscritura}
                </p>
              ) : (
              <ChatComposer
                key={`${activa.id}-${borradorActivo?.id ?? "nuevo"}`}
                textoInicial={borradorActivo?.texto ?? ""}
                onGuardarBorrador={(texto) => guardarBorrador.mutate({ conversacionId: activa.id, texto })}
                onProgramar={
                  CHAT_FUNCIONES.borradores
                    ? (texto, programadoPara) =>
                        programarMensaje
                          .mutateAsync({ conversacionId: activa.id, texto, programadoPara })
                          .then((b) => {
                            // El borrador del canal pasó a ser el programado.
                            setBorrador(null)
                            notify(cerrarFrase(`Mensaje programado para el ${fechaProgramada(b.programadoPara ?? b.fecha)}`))
                          })
                    : undefined
                }
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
                onAtajo={atajos.acciones}
                confirmacionLectura={
                  puedePedirConfirmacion
                    ? { activa: confirmarActiva, onCambiar: (v) => setConfirmar({ conversacionId: activa.id, activa: v }) }
                    : undefined
                }
                onEnviar={(texto, archivos) =>
                  enviar
                    .mutateAsync({
                      conversacionId: activa.id,
                      texto,
                      archivos,
                      respuestaA: respondiendo?.id,
                      solicitaConfirmacion: puedePedirConfirmacion ? confirmarActiva : undefined,
                      clientMessageId: idDeIntento(
                        `${activa.id}|${respondiendo?.id ?? ""}|${texto}|${archivos.map((a) => a.name).join("/")}`,
                      ),
                    })
                    .then(() => {
                      intento.current = null
                      setConfirmar(null)
                      setRespondiendo(null)
                      // Quien responde ya leyó lo anterior: el divisor "Nuevos" sobra.
                      setMarca((m) => (m?.conversacionId === activa.id && m.id ? { ...m, id: null } : m))
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
