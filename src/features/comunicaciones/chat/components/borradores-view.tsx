import { cerrarFrase } from "@/lib/frase"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type {
  Borrador,
  BorradorActividad,
  Enviado,
  EstadoBorrador,
} from "@/features/comunicaciones/chat/api/types"
import { useBorradoresQuery } from "@/features/comunicaciones/chat/api/query/use-borradores-query"
import {
  useBorradorActividadQuery,
  useBorradoresActividadQuery,
} from "@/features/comunicaciones/chat/api/query/use-borradores-actividad-query"
import {
  useCancelarProgramado,
  useEliminarBorrador,
  useEnviarBorrador,
  useProgramarBorrador,
} from "@/features/comunicaciones/chat/api/mutations/use-acciones-borrador"
import { useEliminarBorradorActividad } from "@/features/comunicaciones/chat/api/mutations/use-borrador-actividad"
import { fechaCorta } from "@/features/comunicaciones/chat/lib/chat-format"
import { fechaProgramada } from "@/features/comunicaciones/chat/lib/programacion"
import {
  CATEGORIA_TIPO_BORRADOR,
  ETIQUETA_TIPO_BORRADOR,
  tituloBorrador,
} from "@/features/comunicaciones/chat/lib/borrador-actividad"
import { ICONO_CATEGORIA } from "@/features/comunicaciones/chat/api/ui-mappings"
import {
  ArrowCounterClockwiseIcon,
  ClockIcon,
  HashIcon,
  PencilSimpleIcon,
  TrashIcon,
  PaperPlaneTiltIcon,
  XIcon,
} from "@/components/ui/icons"
import { EnviadosLista } from "@/features/comunicaciones/chat/components/enviados-lista"
import { VistaEncabezado } from "@/features/comunicaciones/chat/components/vista-encabezado"
import { ProgramarMensajeDialog } from "@/features/comunicaciones/chat/components/programar-mensaje-dialog"
import { CrearComunicadoDialog } from "@/features/comunicaciones/chat/components/crear-comunicado-dialog"
import { EditarActividad } from "@/features/comunicaciones/chat/components/editar-actividad"
import { CrearEleccionDialog } from "@/features/comunicaciones/chat/components/crear-eleccion-dialog"
import { CrearEncuestaDialog } from "@/features/comunicaciones/chat/components/crear-encuesta-dialog"
import { CrearEvaluacionDialog } from "@/features/comunicaciones/chat/components/crear-evaluacion-dialog"

const PESTANAS: Array<{ estado: EstadoBorrador; etiqueta: string; vacio: string }> = [
  {
    estado: "BORRADOR",
    etiqueta: "Borradores",
    vacio: "No tienes borradores. Lo que escribas sin enviar quedará guardado aquí.",
  },
  {
    estado: "PROGRAMADO",
    etiqueta: "Programados",
    vacio: "No tienes mensajes programados. Usa el reloj junto a Enviar para programar uno.",
  },
  {
    estado: "ENVIADO",
    etiqueta: "Enviados",
    vacio: "Aún no has enviado mensajes.",
  },
]

const ETIQUETA_ESTADO: Record<EstadoBorrador, { texto: string; clase: string }> = {
  BORRADOR: { texto: "Borrador", clase: "text-orange" },
  PROGRAMADO: { texto: "Programado", clase: "text-blue" },
  ENVIADO: { texto: "Enviado", clase: "text-green" },
}

// Acción pendiente de confirmar sobre un mensaje o un borrador de actividad.
type Confirmacion =
  | { tipo: "eliminar"; borrador: Borrador }
  | { tipo: "cancelar"; borrador: Borrador }
  | { tipo: "actividad"; borrador: BorradorActividad }

interface BorradoresViewProps {
  onVolver: () => void
  // Abre el canal con el texto del borrador en el editor.
  onEditar: (borrador: Borrador) => void
  // Abre la conversación (y el mensaje) de un enviado.
  onAbrirEnviado: (enviado: Enviado) => void
  // Abre la conversación de una actividad recién publicada desde su borrador.
  onAbrirConversacion?: (conversacionId: number) => void
}

export function BorradoresView({
  onVolver,
  onEditar,
  onAbrirEnviado,
  onAbrirConversacion,
}: BorradoresViewProps) {
  const { notify } = useNotify()
  const { data = [], isPending, isError, refetch } = useBorradoresQuery()
  const actividadesQuery = useBorradoresActividadQuery()
  const actividades = [...(actividadesQuery.data ?? [])].sort((a, b) =>
    b.fecha.localeCompare(a.fecha),
  )
  const [pestana, setPestana] = useState<EstadoBorrador>("BORRADOR")
  const [confirmar, setConfirmar] = useState<Confirmacion | null>(null)
  // Programar un borrador o editar uno programado.
  const [programando, setProgramando] = useState<Borrador | null>(null)
  const [retomando, setRetomando] = useState<BorradorActividad | null>(null)
  const enviar = useEnviarBorrador()
  const eliminar = useEliminarBorrador()
  const cancelar = useCancelarProgramado()
  const programar = useProgramarBorrador()
  const eliminarActividad = useEliminarBorradorActividad()
  const confirmando = eliminar.isPending || cancelar.isPending || eliminarActividad.isPending

  const onError = (error: unknown) => notify(getErrorMessage(error), { variant: "error" })
  const lista = data
    .filter((b) => b.estado === pestana)
    .sort((a, b) =>
      // Programados: el próximo a salir primero; lo demás, lo más reciente primero.
      pestana === "PROGRAMADO" ? a.fecha.localeCompare(b.fecha) : b.fecha.localeCompare(a.fecha),
    )
  const actual = PESTANAS.find((p) => p.estado === pestana)
  const conActividades = pestana === "BORRADOR" && actividades.length > 0

  const ejecutarConfirmacion = () => {
    if (!confirmar) return
    const cerrar = () => setConfirmar(null)
    if (confirmar.tipo === "actividad") {
      eliminarActividad.mutate(confirmar.borrador.id, {
        onSuccess: () => {
          notify("Borrador eliminado.")
          cerrar()
        },
        onError,
      })
    } else if (confirmar.tipo === "cancelar") {
      cancelar.mutate(confirmar.borrador.id, {
        onSuccess: () => {
          notify(
            `Se canceló el envío a #${confirmar.borrador.conversacionNombre}; quedó en Borradores.`,
          )
          cerrar()
        },
        onError,
      })
    } else {
      const programado = confirmar.borrador.estado === "PROGRAMADO"
      eliminar.mutate(confirmar.borrador.id, {
        onSuccess: () => {
          notify(programado ? "Mensaje programado eliminado." : "Borrador eliminado.")
          cerrar()
        },
        onError,
      })
    }
  }

  return (
    <>
      <VistaEncabezado titulo="Borradores y enviados" onVolver={onVolver} />

      <div
        role="tablist"
        aria-label="Estado de los mensajes"
        className="flex shrink-0 gap-6 border-b px-3 md:px-5"
      >
        {PESTANAS.map((p) => {
          const total =
            data.filter((b) => b.estado === p.estado).length +
            (p.estado === "BORRADOR" ? actividades.length : 0)
          const activa = p.estado === pestana
          return (
            <button
              key={p.estado}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => setPestana(p.estado)}
              className={cn(
                "-mb-px flex h-11 items-center gap-1.5 border-b-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                activa
                  ? "border-primary font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {p.etiqueta}
              {total > 0 && p.estado !== "ENVIADO" && (
                <span className="text-xs text-muted-foreground tabular-nums">{total}</span>
              )}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        aria-label={actual?.etiqueta}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5"
      >
        {pestana === "ENVIADO" ? (
          <EnviadosLista onAbrir={onAbrirEnviado} />
        ) : isPending ? (
          <div className="space-y-2" aria-busy>
            {Array.from({ length: 2 }, (_, i) => (
              <Skeleton key={i} className="h-17 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-10 text-center text-sm">
            <p className="text-muted-foreground">No se pudieron cargar los mensajes.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 font-medium text-primary underline"
            >
              Reintentar
            </button>
          </div>
        ) : lista.length === 0 && !conActividades ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{actual?.vacio}</p>
        ) : (
          <div className="space-y-5">
            {lista.length > 0 && (
              <section
                aria-label={pestana === "BORRADOR" ? "Mensajes" : undefined}
                className="space-y-2"
              >
                {conActividades && (
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase">
                    Mensajes
                  </h3>
                )}
                <ul className="space-y-2">
                  {lista.map((b) => (
                    <li key={b.id}>
                      <TarjetaBorrador
                        borrador={b}
                        enviando={enviar.isPending && enviar.variables === b.id}
                        onEditar={() =>
                          b.estado === "PROGRAMADO" ? setProgramando(b) : onEditar(b)
                        }
                        onProgramar={() => setProgramando(b)}
                        onEnviar={() =>
                          enviar.mutate(b.id, {
                            onSuccess: () => notify(`Mensaje enviado a #${b.conversacionNombre}.`),
                            onError,
                          })
                        }
                        onCancelar={() => setConfirmar({ tipo: "cancelar", borrador: b })}
                        onEliminar={() => setConfirmar({ tipo: "eliminar", borrador: b })}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {conActividades && (
              <section aria-label="Actividades" className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase">
                  Actividades
                </h3>
                <ul className="space-y-2">
                  {actividades.map((a) => (
                    <li key={a.id}>
                      <TarjetaBorradorActividad
                        borrador={a}
                        onRetomar={() => setRetomando(a)}
                        onEliminar={() => setConfirmar({ tipo: "actividad", borrador: a })}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      {programando && (
        <ProgramarMensajeDialog
          key={programando.id}
          open
          onOpenChange={(o) => !o && !programar.isPending && setProgramando(null)}
          destino={`#${programando.conversacionNombre}`}
          textoInicial={programando.estado === "PROGRAMADO" ? programando.texto : undefined}
          programadoPara={programando.programadoPara}
          guardando={programar.isPending}
          error={programar.isError ? getErrorMessage(programar.error) : null}
          onConfirmar={(v) =>
            programar.mutate(
              { id: programando.id, ...v },
              {
                onSuccess: (b) => {
                  notify(
                    cerrarFrase(`Mensaje programado para el ${fechaProgramada(b.programadoPara ?? b.fecha)}`),
                  )
                  programar.reset()
                  setProgramando(null)
                },
              },
            )
          }
        />
      )}

      {retomando && (
        <RetomarBorradorActividad
          key={retomando.id}
          borrador={retomando}
          onCerrar={() => setRetomando(null)}
          onPublicada={(id) => {
            setRetomando(null)
            onAbrirConversacion?.(id)
          }}
          onError={onError}
        />
      )}

      <AlertDialog
        open={!!confirmar}
        onOpenChange={(open) => !open && !confirmando && setConfirmar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{textoConfirmacion(confirmar).titulo}</AlertDialogTitle>
            <AlertDialogDescription>
              {textoConfirmacion(confirmar).descripcion}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="fill" color="neutral" disabled={confirmando}>
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              color={confirmar?.tipo === "cancelar" ? "primary" : "destructive"}
              disabled={confirmando}
              aria-busy={confirmando}
              onClick={ejecutarConfirmacion}
            >
              {textoConfirmacion(confirmar).accion}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function textoConfirmacion(c: Confirmacion | null) {
  if (c?.tipo === "actividad") {
    const tipo = ETIQUETA_TIPO_BORRADOR[c.borrador.tipo].toLowerCase()
    return {
      titulo: "¿Eliminar este borrador?",
      descripcion: `Se perderá lo que avanzaste en el borrador de ${tipo} «${tituloBorrador(c.borrador.titulo)}». Esta acción no se puede deshacer.`,
      accion: "Eliminar borrador",
    }
  }
  if (c?.tipo === "cancelar") {
    return {
      titulo: "¿Cancelar el envío programado?",
      descripcion: `El mensaje para #${c.borrador.conversacionNombre} no se enviará y volverá a tus borradores.`,
      accion: "Cancelar envío",
    }
  }
  const programado = c?.borrador.estado === "PROGRAMADO"
  return {
    titulo: programado ? "¿Eliminar este mensaje programado?" : "¿Eliminar este borrador?",
    descripcion: `Se perderá el texto que escribiste para #${c?.borrador.conversacionNombre ?? ""}. Esta acción no se puede deshacer.`,
    accion: programado ? "Eliminar mensaje" : "Eliminar borrador",
  }
}

function TarjetaBorrador({
  borrador: b,
  enviando,
  onEditar,
  onProgramar,
  onEnviar,
  onCancelar,
  onEliminar,
}: {
  borrador: Borrador
  enviando: boolean
  onEditar: () => void
  onProgramar: () => void
  onEnviar: () => void
  onCancelar: () => void
  onEliminar: () => void
}) {
  const estado = ETIQUETA_ESTADO[b.estado]
  const editable = b.estado !== "ENVIADO"
  const programado = b.estado === "PROGRAMADO"
  return (
    <article className="group/borrador relative flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:border-primary/40">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-md bg-muted/50">
        {programado ? (
          <ClockIcon className="size-5 text-blue" />
        ) : (
          <HashIcon className="size-5 text-muted-foreground" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium"># {b.conversacionNombre}</h3>
        <p className="truncate text-xs text-muted-foreground">{b.texto}</p>
      </div>
      <p className="shrink-0 self-start text-xs text-muted-foreground">
        {programado ? (
          <time dateTime={b.programadoPara ?? b.fecha}>
            Se envía el {fechaProgramada(b.programadoPara ?? b.fecha)}
          </time>
        ) : (
          <time dateTime={b.fecha}>{fechaCorta(b.fecha)}</time>
        )}{" "}
        <span className={cn("font-medium", estado.clase)}>{estado.texto}</span>
      </p>

      {editable && (
        // Aparecen al pasar el mouse o con foco, sobre la fecha (como en la lista de chats).
        <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-0.5 rounded-lg border bg-card p-0.5 shadow-sm opacity-0 transition-opacity group-focus-within/borrador:opacity-100 group-hover/borrador:opacity-100 max-md:static max-md:translate-y-0 max-md:opacity-100">
          <AccionBoton etiqueta="Editar" onClick={onEditar}>
            <PencilSimpleIcon className="size-4.5" />
          </AccionBoton>
          {!programado && (
            <AccionBoton etiqueta="Programar envío" onClick={onProgramar}>
              <ClockIcon className="size-4.5" />
            </AccionBoton>
          )}
          <AccionBoton etiqueta="Enviar ahora" onClick={onEnviar} disabled={enviando}>
            <PaperPlaneTiltIcon className="size-4.5" />
          </AccionBoton>
          {programado && (
            <AccionBoton etiqueta="Cancelar envío" onClick={onCancelar}>
              <XIcon className="size-4.5" />
            </AccionBoton>
          )}
          <AccionBoton etiqueta="Eliminar" onClick={onEliminar}>
            <TrashIcon className="size-4.5" />
          </AccionBoton>
        </div>
      )}
    </article>
  )
}

function TarjetaBorradorActividad({
  borrador: b,
  onRetomar,
  onEliminar,
}: {
  borrador: BorradorActividad
  onRetomar: () => void
  onEliminar: () => void
}) {
  const Icono = ICONO_CATEGORIA[CATEGORIA_TIPO_BORRADOR[b.tipo]]
  const titulo = tituloBorrador(b.titulo)
  return (
    <article className="group/borrador relative flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:border-primary/40">
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-md bg-muted/50">
        <Icono className="size-5 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium">{titulo}</h3>
        <p className="truncate text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
            {ETIQUETA_TIPO_BORRADOR[b.tipo]}
          </span>{" "}
          {b.conversacionId ? "Cambios sin guardar" : "Sin publicar"}
        </p>
      </div>
      <p className="shrink-0 self-start text-xs text-muted-foreground">
        <time dateTime={b.fecha}>{fechaCorta(b.fecha)}</time>{" "}
        <span className="font-medium text-red">Borrador</span>
      </p>
      <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-0.5 rounded-lg border bg-card p-0.5 shadow-sm opacity-0 transition-opacity group-focus-within/borrador:opacity-100 group-hover/borrador:opacity-100 max-md:static max-md:translate-y-0 max-md:opacity-100">
        <AccionBoton etiqueta={`Retomar ${titulo}`} onClick={onRetomar}>
          <ArrowCounterClockwiseIcon className="size-4.5" />
        </AccionBoton>
        <AccionBoton etiqueta={`Eliminar ${titulo}`} onClick={onEliminar}>
          <TrashIcon className="size-4.5" />
        </AccionBoton>
      </div>
    </article>
  )
}

/** Trae el borrador completo (con `datos`) y abre el diálogo de su actividad con lo guardado. */
function RetomarBorradorActividad({
  borrador,
  onCerrar,
  onPublicada,
  onError,
}: {
  borrador: BorradorActividad
  onCerrar: () => void
  onPublicada: (conversacionId: number) => void
  onError: (error: unknown) => void
}) {
  const { data, isError, error } = useBorradorActividadQuery(borrador.id)
  const [avisado, setAvisado] = useState(false)
  // Solo si no se pudo abrir: con el diálogo abierto, un error posterior no lo cierra.
  if (isError && !data && !avisado) {
    setAvisado(true)
    onError(error)
    onCerrar()
  }
  if (!data) return null
  // Cambios sin guardar de una actividad publicada: se retoman en su diálogo de edición.
  if (data.conversacionId) {
    return (
      <EditarActividad
        open
        conversacion={{ id: data.conversacionId, categoria: CATEGORIA_TIPO_BORRADOR[data.tipo] }}
        borradorId={data.id}
        onClose={onCerrar}
      />
    )
  }
  const props = { open: true, onClose: onCerrar, borrador: { id: data.id, datos: data.datos } }
  switch (data.tipo) {
    case "COMUNICADO":
      return <CrearComunicadoDialog {...props} onCreado={onPublicada} />
    case "ENCUESTA":
      return <CrearEncuestaDialog {...props} onCreada={onPublicada} />
    case "ELECCION":
      return <CrearEleccionDialog {...props} onCreada={onPublicada} />
    case "EVALUACION":
      return <CrearEvaluacionDialog {...props} onCreada={onPublicada} />
  }
}

function AccionBoton({
  etiqueta,
  onClick,
  disabled,
  children,
}: {
  etiqueta: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"
    >
      {children}
    </button>
  )
}
