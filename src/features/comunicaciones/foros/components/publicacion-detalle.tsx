import { useEffect, useState } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  ArrowBendUpLeftIcon,
  ArrowLeftIcon,
  BellIcon,
  BellSlashIcon,
  CheckCircleIcon,
  FileIcon,
  HashIcon,
  LockIcon,
  PencilIcon,
  PushPinIcon,
} from "@/components/ui/icons"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { OnlineOnlyTooltip } from "@/components/offline/online-only-tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { cn } from "@/lib/utils"
import type { Mensaje, Miembro } from "@/features/comunicaciones/chat/api/types"
import { ChatComposer } from "@/features/comunicaciones/chat/components/chat-composer"
import { TextoFormateado } from "@/features/comunicaciones/chat/components/texto-formateado"
import { fechaCorta, iniciales } from "@/features/comunicaciones/chat/lib/chat-format"
import { decodificarMenciones, mencionadosEn, textoPlano } from "@/features/comunicaciones/chat/lib/menciones"
import {
  useAccionPublicacion,
  useEditarPublicacion,
  useEditarRespuesta,
  useEliminarPublicacion,
  useEliminarRespuesta,
  useResponder,
} from "@/features/comunicaciones/foros/api/mutations/use-acciones-foro"
import { usePublicacionQuery, useRespuestasQuery } from "@/features/comunicaciones/foros/api/query/use-foros-query"
import { MAX_ETIQUETAS, MAX_TITULO } from "@/features/comunicaciones/foros/api/schema"
import type { Foro, NodoRespuesta, Publicacion } from "@/features/comunicaciones/foros/api/types"
import { EtiquetaChip, SelectorEtiquetas } from "@/features/comunicaciones/foros/components/etiqueta-chip"
import { ReaccionesForo } from "@/features/comunicaciones/foros/components/reacciones-foro"
import {
  PROFUNDIDAD_MAXIMA,
  arbolRespuestas,
  etiquetasDisponibles,
  puedeResolver,
  puedeResponderEn,
  textoRespuestas,
} from "@/features/comunicaciones/foros/lib/foros"

interface Props {
  publicacionId: number
  foro: Foro
  miembros: readonly Miembro[]
  permitirMasivas: boolean
  // Deep link `?mensaje=`: se desplaza a la respuesta y la resalta.
  mensajeDestacado?: number
  onVolver: () => void
}

export function PublicacionDetalle({ publicacionId, foro, miembros, permitirMasivas, mensajeDestacado, onVolver }: Props) {
  const publicacionQuery = usePublicacionQuery(publicacionId)
  const respuestasQuery = useRespuestasQuery(publicacionId)
  const p = publicacionQuery.data

  if (publicacionQuery.isPending) {
    return <p className="p-6 text-sm text-muted-foreground">Cargando la publicación…</p>
  }
  if (!p) {
    return (
      <div className="space-y-3 p-6">
        <p role="alert" className="text-sm text-red">
          {publicacionQuery.isError ? getErrorMessage(publicacionQuery.error) : "La publicación ya no existe."}
        </p>
        <Button variant="outline" size="sm" onClick={onVolver}>
          Volver al foro
        </Button>
      </div>
    )
  }
  return (
    <Detalle
      p={p}
      respuestas={respuestasQuery.data ?? []}
      cargandoRespuestas={respuestasQuery.isPending}
      foro={foro}
      miembros={miembros}
      permitirMasivas={permitirMasivas}
      mensajeDestacado={mensajeDestacado}
      onVolver={onVolver}
    />
  )
}

function Detalle({
  p,
  respuestas,
  cargandoRespuestas,
  foro,
  miembros,
  permitirMasivas,
  mensajeDestacado,
  onVolver,
}: Omit<Props, "publicacionId"> & { p: Publicacion; respuestas: Mensaje[]; cargandoRespuestas: boolean }) {
  const { notify } = useNotify()
  const so = useOnlineOnly()
  const accion = useAccionPublicacion()
  const eliminar = useEliminarPublicacion()
  const responder = useResponder()
  const [respondiendo, setRespondiendo] = useState<Mensaje | null>(null)
  const [editando, setEditando] = useState(false)
  const [moviendo, setMoviendo] = useState(false)
  const moderador = foro.puedeModerar
  const resolver = puedeResolver(p, moderador)
  const responde = puedeResponderEn(p, foro)
  const arbol = arbolRespuestas(respuestas)

  const onError = (error: unknown) => notify(getErrorMessage(error), { variant: "error" })
  const ejecutar = (a: Parameters<typeof accion.mutate>[0]["accion"], exito: string) =>
    accion.mutate({ id: p.id, accion: a }, { onSuccess: () => notify(exito), onError })

  // Deep link: espera a que la respuesta esté pintada y la lleva a la vista.
  useEffect(() => {
    if (!mensajeDestacado || cargandoRespuestas) return
    document.getElementById(`foro-mensaje-${mensajeDestacado}`)?.scrollIntoView({ block: "center" })
  }, [mensajeDestacado, cargandoRespuestas])

  const acciones = so.disabled || accion.isPending

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <article aria-labelledby="foro-publicacion-titulo" className="space-y-4 border-b p-4 md:p-6">
          <Button variant="ghost" size="xs" onClick={onVolver}>
            <ArrowLeftIcon data-icon="inline-start" />
            Volver a las publicaciones
          </Button>

          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {p.fijada && (
                <Badge variant="soft" color="primary">
                  <PushPinIcon data-icon="inline-start" />
                  Fijada
                </Badge>
              )}
              {p.resuelta && (
                <Badge variant="soft" color="success">
                  <CheckCircleIcon data-icon="inline-start" />
                  Resuelta
                </Badge>
              )}
              {p.cerrada && (
                <Badge variant="soft" color="neutral">
                  <LockIcon data-icon="inline-start" />
                  Cerrada
                </Badge>
              )}
              {p.etiquetas.map((e) => (
                <EtiquetaChip key={e.id} etiqueta={e} />
              ))}
            </div>
            <h2 id="foro-publicacion-titulo" className="text-xl font-bold wrap-break-word">
              {p.titulo}
            </h2>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Avatar size="sm">
                <AvatarFallback className="bg-navy-22 text-[0.65rem] font-semibold text-navy">
                  {iniciales(p.autor.nombre)}
                </AvatarFallback>
              </Avatar>
              <span>
                {p.autor.nombre} · <time dateTime={p.fecha}>{fechaCorta(p.fecha)}</time>
                {p.mensaje?.editado && " · editada"}
              </span>
            </p>
          </header>

          {p.mensaje && (
            <div className="space-y-3">
              <TextoFormateado texto={p.mensaje.texto} menciones={p.mensaje.menciones} />
              <Adjunto mensaje={p.mensaje} />
              <ReaccionesForo mensaje={p.mensaje} disabled={so.disabled} />
            </div>
          )}

          <div role="toolbar" aria-label="Acciones de la publicación" className="flex flex-wrap gap-2">
            <OnlineOnlyTooltip tooltip={so.tooltip}>
              <Button
                variant="outline"
                color="neutral"
                size="xs"
                disabled={acciones}
                aria-pressed={p.siguiendo}
                onClick={() =>
                  ejecutar(
                    { tipo: "seguir", valor: !p.siguiendo },
                    p.siguiendo ? "Dejaste de seguir la publicación." : "Ahora sigues la publicación.",
                  )
                }
              >
                {p.siguiendo ? <BellSlashIcon data-icon="inline-start" /> : <BellIcon data-icon="inline-start" />}
                {p.siguiendo ? "Dejar de seguir" : "Seguir"}
              </Button>
            </OnlineOnlyTooltip>
            {resolver && (
              <OnlineOnlyTooltip tooltip={so.tooltip}>
                <Button
                  variant="outline"
                  color={p.resuelta ? "neutral" : "success"}
                  size="xs"
                  disabled={acciones}
                  onClick={() =>
                    ejecutar(
                      { tipo: "resolver", valor: !p.resuelta },
                      p.resuelta ? "La publicación quedó sin resolver." : "Marcaste la publicación como resuelta.",
                    )
                  }
                >
                  <CheckCircleIcon data-icon="inline-start" />
                  {p.resuelta ? "Quitar resuelta" : "Marcar resuelta"}
                </Button>
              </OnlineOnlyTooltip>
            )}
            {p.esPropia && (
              <OnlineOnlyTooltip tooltip={so.tooltip}>
                <Button variant="outline" color="neutral" size="xs" disabled={so.disabled} onClick={() => setEditando(true)}>
                  <PencilIcon data-icon="inline-start" />
                  Editar
                </Button>
              </OnlineOnlyTooltip>
            )}
            {(p.esPropia || moderador) && (
              <OnlineOnlyTooltip tooltip={so.tooltip}>
                <Button variant="outline" color="neutral" size="xs" disabled={so.disabled} onClick={() => setMoviendo(true)}>
                  <HashIcon data-icon="inline-start" />
                  Etiquetas
                </Button>
              </OnlineOnlyTooltip>
            )}
            {moderador && (
              <>
                <OnlineOnlyTooltip tooltip={so.tooltip}>
                  <Button
                    variant="outline"
                    color="neutral"
                    size="xs"
                    disabled={acciones}
                    onClick={() =>
                      ejecutar({ tipo: "fijar", valor: !p.fijada }, p.fijada ? "Se desfijó la publicación." : "Se fijó la publicación.")
                    }
                  >
                    <PushPinIcon data-icon="inline-start" />
                    {p.fijada ? "Desfijar" : "Fijar"}
                  </Button>
                </OnlineOnlyTooltip>
                <OnlineOnlyTooltip tooltip={so.tooltip}>
                  <Button
                    variant="outline"
                    color="neutral"
                    size="xs"
                    disabled={acciones}
                    onClick={() =>
                      ejecutar(
                        { tipo: "cerrar", valor: !p.cerrada },
                        p.cerrada ? "Se reabrió la publicación." : "Se cerró la publicación.",
                      )
                    }
                  >
                    <LockIcon data-icon="inline-start" />
                    {p.cerrada ? "Reabrir" : "Cerrar"}
                  </Button>
                </OnlineOnlyTooltip>
              </>
            )}
            {(p.esPropia || moderador) && (
              <ConfirmRemoveButton
                label="Eliminar"
                size="xs"
                title="¿Eliminar la publicación?"
                description="Se quitan la publicación y sus respuestas del foro. Moderación conserva el registro."
                disabled={so.disabled || eliminar.isPending}
                onConfirm={() =>
                  eliminar.mutateAsync(p.id).then(
                    () => {
                      notify("Se eliminó la publicación.")
                      onVolver()
                    },
                    (error) => {
                      onError(error)
                      return false
                    },
                  )
                }
              />
            )}
          </div>
        </article>

        <section aria-labelledby="foro-respuestas" className="space-y-3 p-4 md:p-6">
          <h3 id="foro-respuestas" className="text-sm font-semibold text-muted-foreground">
            {textoRespuestas(respuestas.length)}
          </h3>
          {cargandoRespuestas ? (
            <p className="text-sm text-muted-foreground">Cargando respuestas…</p>
          ) : (
            <ul className="space-y-3">
              {arbol.map((nodo) => (
                <RespuestaItem
                  key={nodo.mensaje.id}
                  nodo={nodo}
                  profundidad={0}
                  publicacion={p}
                  foro={foro}
                  miembros={miembros}
                  permitirMasivas={permitirMasivas}
                  destacado={mensajeDestacado}
                  puedeResponder={responde}
                  onResponder={setRespondiendo}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {responde ? (
        <OnlineOnlyTooltip tooltip={so.tooltip}>
          <div className={cn("shrink-0 border-t", so.disabled && "pointer-events-none opacity-60")} aria-disabled={so.disabled}>
            <ChatComposer
              destino={p.titulo}
              enviando={responder.isPending}
              miembros={miembros}
              permitirMasivas={permitirMasivas}
              respondiendoA={
                respondiendo
                  ? { autor: respondiendo.autor.nombre, texto: textoPlano(respondiendo.texto, respondiendo.menciones) }
                  : null
              }
              onCancelarRespuesta={() => setRespondiendo(null)}
              onEnviar={(texto, archivo) =>
                responder
                  .mutateAsync({ publicacionId: p.id, texto, archivo, respuestaA: respondiendo?.id ?? null })
                  .then(
                    () => setRespondiendo(null),
                    (error) => {
                      onError(error)
                      throw error
                    },
                  )
              }
            />
          </div>
        </OnlineOnlyTooltip>
      ) : (
        <p className="shrink-0 border-t px-4 py-3 text-sm text-muted-foreground">
          {p.cerrada ? "La publicación está cerrada: no admite respuestas nuevas." : "Tu perfil no puede responder en este foro."}
        </p>
      )}

      <EditarPublicacionDialog
        publicacion={p}
        open={editando}
        onClose={() => setEditando(false)}
        miembros={miembros}
        permitirMasivas={permitirMasivas}
      />
      <MoverEtiquetasDialog publicacion={p} foro={foro} open={moviendo} onClose={() => setMoviendo(false)} />
    </div>
  )
}

function Adjunto({ mensaje: m }: { mensaje: Mensaje }) {
  if (!m.adjunto) return null
  return (
    <p className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <FileIcon aria-hidden className="size-4 text-muted-foreground" />
      {m.adjunto.eliminadoEn ? <span className="text-muted-foreground">Archivo eliminado</span> : m.adjunto.nombre}
    </p>
  )
}

function RespuestaItem({
  nodo,
  profundidad,
  publicacion: p,
  foro,
  miembros,
  permitirMasivas,
  destacado,
  puedeResponder,
  onResponder,
}: {
  nodo: NodoRespuesta
  profundidad: number
  publicacion: Publicacion
  foro: Foro
  miembros: readonly Miembro[]
  permitirMasivas: boolean
  destacado?: number
  puedeResponder: boolean
  onResponder: (m: Mensaje) => void
}) {
  const { notify } = useNotify()
  const so = useOnlineOnly()
  const accion = useAccionPublicacion()
  const editar = useEditarRespuesta()
  const eliminar = useEliminarRespuesta()
  const [editando, setEditando] = useState(false)
  const m = nodo.mensaje
  const esSolucion = p.solucionId === m.id
  const onError = (error: unknown) => notify(getErrorMessage(error), { variant: "error" })

  return (
    <li>
      <div
        id={`foro-mensaje-${m.id}`}
        className={cn(
          "rounded-lg border bg-card p-3",
          esSolucion && "border-green-stroke bg-green-22",
          destacado === m.id && "ring-2 ring-primary",
          m.meMenciona && !esSolucion && "border-yellow-stroke",
        )}
      >
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">{m.autor.nombre}</span>
          <time dateTime={m.fecha} className="text-xs text-muted-foreground">
            {fechaCorta(m.fecha)}
          </time>
          {m.editado && <span className="text-xs text-muted-foreground">(editado)</span>}
          {esSolucion && (
            <Badge variant="soft" color="success">
              <CheckCircleIcon data-icon="inline-start" />
              Solución
            </Badge>
          )}
        </p>
        {m.respuestaA && profundidad >= PROFUNDIDAD_MAXIMA && (
          <p className="mt-1 border-l-2 pl-2 text-xs text-muted-foreground">
            En respuesta a {m.respuestaA.autor}
          </p>
        )}
        {editando ? (
          <ChatComposer
            variante="edicion"
            autoFocus
            destino=""
            textoInicial={decodificarMenciones(m.texto, m.menciones)}
            mencionesIniciales={mencionadosEn(m.texto, m.menciones)}
            miembros={miembros}
            permitirMasivas={permitirMasivas}
            enviando={editar.isPending}
            className="mt-2 rounded-lg border"
            onEnviar={(texto) =>
              editar.mutateAsync({ id: m.id, texto }).then(
                () => {
                  notify("Respuesta editada.")
                  setEditando(false)
                },
                (error) => {
                  onError(error)
                  throw error
                },
              )
            }
          />
        ) : (
          <div className="mt-1.5 space-y-2">
            <TextoFormateado texto={m.texto} menciones={m.menciones} />
            <Adjunto mensaje={m} />
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ReaccionesForo mensaje={m} disabled={so.disabled} />
          {puedeResponder && (
            <Button variant="ghost" size="xs" disabled={so.disabled} onClick={() => onResponder(m)}>
              <ArrowBendUpLeftIcon data-icon="inline-start" />
              Responder
            </Button>
          )}
          {puedeResolver(p, foro.puedeModerar) && (
            <Button
              variant="ghost"
              size="xs"
              color={esSolucion ? "neutral" : "success"}
              disabled={so.disabled || accion.isPending}
              onClick={() =>
                accion.mutate(
                  { id: p.id, accion: esSolucion ? { tipo: "resolver", valor: false } : { tipo: "resolver", valor: true, solucionId: m.id } },
                  {
                    onSuccess: () => notify(esSolucion ? "Se quitó la solución." : "Marcaste la solución."),
                    onError,
                  },
                )
              }
            >
              <CheckCircleIcon data-icon="inline-start" />
              {esSolucion ? "Quitar solución" : "Es la solución"}
            </Button>
          )}
          {m.esPropio && !editando && (
            <Button variant="ghost" size="xs" disabled={so.disabled} onClick={() => setEditando(true)}>
              <PencilIcon data-icon="inline-start" />
              Editar
            </Button>
          )}
          {editando && (
            <Button variant="ghost" size="xs" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          )}
          {(m.esPropio || foro.puedeModerar) && (
            <ConfirmRemoveButton
              label="Eliminar"
              size="xs"
              title="¿Eliminar la respuesta?"
              description="La respuesta deja de verse en la publicación."
              disabled={so.disabled || eliminar.isPending}
              onConfirm={() =>
                eliminar.mutateAsync({ id: m.id, publicacionId: p.id }).then(
                  () => notify("Se eliminó la respuesta."),
                  (error) => {
                    onError(error)
                    return false
                  },
                )
              }
            />
          )}
        </div>
      </div>
      {nodo.hijas.length > 0 && (
        <ul
          aria-label={`Respuestas a ${m.autor.nombre}`}
          className={cn("mt-3 space-y-3", profundidad < PROFUNDIDAD_MAXIMA && "ml-4 border-l pl-4 md:ml-6")}
        >
          {nodo.hijas.map((h) => (
            <RespuestaItem
              key={h.mensaje.id}
              nodo={h}
              profundidad={profundidad + 1}
              publicacion={p}
              foro={foro}
              miembros={miembros}
              permitirMasivas={permitirMasivas}
              destacado={destacado}
              puedeResponder={puedeResponder}
              onResponder={onResponder}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

function EditarPublicacionDialog({
  publicacion: p,
  open,
  onClose,
  miembros,
  permitirMasivas,
}: {
  publicacion: Publicacion
  open: boolean
  onClose: () => void
  miembros: readonly Miembro[]
  permitirMasivas: boolean
}) {
  const { notify } = useNotify()
  const editar = useEditarPublicacion()
  const [titulo, setTitulo] = useState(p.titulo)
  const cuerpo = p.mensaje
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !editar.isPending && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edita la publicación</DialogTitle>
        </DialogHeader>
        <label className="space-y-1.5 text-sm font-medium">
          Título
          <Input value={titulo} maxLength={MAX_TITULO} onChange={(e) => setTitulo(e.target.value)} />
        </label>
        {cuerpo && (
          <ChatComposer
            variante="edicion"
            destino=""
            textoInicial={decodificarMenciones(cuerpo.texto, cuerpo.menciones)}
            mencionesIniciales={mencionadosEn(cuerpo.texto, cuerpo.menciones)}
            miembros={miembros}
            permitirMasivas={permitirMasivas}
            enviando={editar.isPending}
            className="rounded-lg border"
            onEnviar={(texto) =>
              editar.mutateAsync({ id: p.id, titulo: titulo.trim(), texto }).then(
                () => {
                  notify("Publicación editada.")
                  onClose()
                },
                (error) => {
                  notify(getErrorMessage(error), { variant: "error" })
                  throw error
                },
              )
            }
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function MoverEtiquetasDialog({
  publicacion: p,
  foro,
  open,
  onClose,
}: {
  publicacion: Publicacion
  foro: Foro
  open: boolean
  onClose: () => void
}) {
  const { notify } = useNotify()
  const accion = useAccionPublicacion()
  const [ids, setIds] = useState<number[]>(() => p.etiquetas.map((e) => e.id))
  // Quien no modera conserva las etiquetas de moderación que ya tenía.
  const fijas = foro.puedeModerar ? [] : p.etiquetas.filter((e) => e.soloModeradores).map((e) => e.id)
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !accion.isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Etiquetas de la publicación</DialogTitle>
        </DialogHeader>
        <SelectorEtiquetas
          etiquetas={etiquetasDisponibles(foro.etiquetas, foro.puedeModerar)}
          value={ids.filter((id) => !fijas.includes(id))}
          onChange={(v) => setIds([...fijas, ...v])}
          max={MAX_ETIQUETAS - fijas.length}
        />
        <DialogFooter>
          <Button
            disabled={accion.isPending}
            aria-busy={accion.isPending}
            onClick={() =>
              accion.mutate(
                { id: p.id, accion: { tipo: "etiquetas", etiquetas: ids } },
                {
                  onSuccess: () => {
                    notify("Se actualizaron las etiquetas.")
                    onClose()
                  },
                  onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
                },
              )
            }
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
