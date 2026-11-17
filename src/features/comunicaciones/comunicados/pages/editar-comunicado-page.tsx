import { useState } from "react"
import { format } from "date-fns"
import { useNavigate } from "@tanstack/react-router"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, NoticeProvider, queueNotice, useNotify } from "@/components/notice/notice-context"
import {
  TableScreen,
  TableScreenBody,
  TableScreenFooter,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon, InfoIcon, LockIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { minLength, required } from "@/lib/forms/messages"
import { comunicadoEditarRoute } from "@/router"
import type { Comunicado } from "@/features/comunicaciones/chat/api/types"
import { textoFallidos } from "@/features/comunicaciones/chat/api/mutations/use-crear-comunicado"
import { useComunicadoQuery } from "@/features/comunicaciones/chat/api/query/use-comunicado-query"
import { EstadoComunicadoBadge } from "@/features/comunicaciones/chat/components/comunicado-panel"
import { resumenDestinatarios } from "@/features/comunicaciones/chat/lib/destinos-comunicado"
import { useCorregirComunicado } from "@/features/comunicaciones/comunicados/api/comunicados-gestion"
import { AdjuntosCarga } from "@/features/comunicaciones/comunicados/components/adjuntos-carga"
import { Panel } from "@/features/comunicaciones/comunicados/components/panel-plegable"
import {
  enfocarPrimerError,
  ERRORES_MENSAJE,
  type ErroresCampos,
} from "@/features/comunicaciones/comunicados/lib/conjunto"

const MAX_TITULO = 100
const MAX_MENSAJE = 1000
const MIN_MENSAJE = 10
const FORM_ID = "form-modificar-comunicado"
const CAMPO = { titulo: "modificar-titulo", mensaje: "modificar-mensaje" } as const

/** El contenido se guarda como HTML en párrafos; el formulario M.1 lo edita como texto plano. */
function htmlATexto(html: string): string {
  const doc = new DOMParser().parseFromString(
    html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>\s*<p[^>]*>/gi, "\n\n"),
    "text/html",
  )
  return (doc.body.textContent ?? "").trim()
}

const fechaHora = (iso: string | null | undefined) => (iso ? format(new Date(iso), "dd/MM/yyyy H:mm") : "—")

/** Dato de solo lectura como campo deshabilitado con candado (prototipo M.1.EDI.1). */
function CampoBloqueado({ id, etiqueta, valor }: { id: string; etiqueta: string; valor: string }) {
  return (
    <Field variant="outlined" className="min-w-0">
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <div className="relative">
        <Input id={id} value={valor} disabled readOnly className="pr-9" />
        <LockIcon aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </Field>
  )
}

/**
 * "Modificar comunicado" (Guía M.1.EDI.1): corrección del autor. Solo cambian título, mensaje y
 * adjuntos; los destinatarios quedan en solo lectura (un error de destinatarios se corrige anulando y
 * publicando otro) y la fecha de actualización la registra el sistema. Al guardar, comms-service avisa
 * a los destinatarios originales autorizados, sin agregar personas nuevas.
 */
export function EditarComunicadoPage() {
  const { id } = comunicadoEditarRoute.useParams()
  const q = useComunicadoQuery(Number(id))

  if (q.isPending) return <Spinner className="m-6" />
  if (q.isError || !q.data) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        {q.isError ? getErrorMessage(q.error) : "El comunicado no existe."}
      </p>
    )
  }
  const c = q.data
  if (!c.esCreador || (c.estado !== "PUBLICADO" && c.estado !== "PROGRAMADO")) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Solo quien publicó el comunicado puede modificarlo mientras esté publicado o programado.
      </p>
    )
  }
  // Los valores iniciales se leen una vez: la key reinicia el formulario si cambia de comunicado.
  // Con el proveedor, el aviso de campos faltantes sale arriba de la pantalla (como en planeador).
  return (
    <NoticeProvider>
      <FormularioModificar key={c.conversacionId} comunicado={c} />
    </NoticeProvider>
  )
}

function FormularioModificar({ comunicado: c }: { comunicado: Comunicado }) {
  const navigate = useNavigate()
  const { notify } = useNotify()
  const corregir = useCorregirComunicado(c.conversacionId)
  const inicialMensaje = htmlATexto(c.contenidoHtml)
  const [titulo, setTitulo] = useState(c.titulo)
  const [mensaje, setMensaje] = useState(inicialMensaje)
  const [archivos, setArchivos] = useState<File[]>([])
  const [quitados, setQuitados] = useState<number[]>([])
  const [intentado, setIntentado] = useState(false)
  const [salir, setSalir] = useState(false)

  const tituloLimpio = titulo.trim()
  const mensajeLimpio = mensaje.trim()
  // Errores por id de control en orden visual; se pintan tras el primer intento y se apagan al corregir.
  const errores: ErroresCampos = {}
  if (tituloLimpio === "") errores[CAMPO.titulo] = required("El título")
  if (mensajeLimpio.length < MIN_MENSAJE) {
    errores[CAMPO.mensaje] = mensajeLimpio ? minLength(MIN_MENSAJE, "El mensaje") : required("El mensaje")
  }
  const visibles: ErroresCampos = intentado ? errores : {}
  const sucio =
    titulo !== c.titulo || mensaje !== inicialMensaje || archivos.length > 0 || quitados.length > 0
  const volver = () => void navigate({ to: paths.app.comunicacionesComunicados.getHref() })
  const cancelar = () => {
    if (corregir.isPending) return
    if (sucio) setSalir(true)
    else volver()
  }
  const dirigidoA = resumenDestinatarios(c.audiencia, c.destinos)
  const total = c.totalDestinatarios

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate">Comunicados institucionales › Modificar comunicado</span>
            {c.estado && (
              <span className="shrink-0 text-sm font-normal">
                <EstadoComunicadoBadge estado={c.estado} />
              </span>
            )}
          </span>
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody className="rounded-b-none border-b-0" contentClassName="flex flex-col gap-4">

      <p className="flex items-start gap-2 rounded-lg bg-blue-22 p-3 text-sm">
        <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-blue" />
        Al guardar se avisa a los destinatarios originales autorizados, sin agregar personas nuevas. Un error de
        destinatarios se corrige anulando y publicando otro.
      </p>

      <NoticeOutlet />
      <ErrorNoticeBanner error={corregir.isError ? corregir.error : null} />

      <div className="overflow-hidden rounded-lg border">
      <Panel titulo="Destinatarios (no se modifican después de publicar)">
        <div className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <CampoBloqueado
              id="modificar-publicado-por"
              etiqueta="Publicado por"
              valor={c.publicadoPorRol ? `${c.publicadoPor} (${c.publicadoPorRol})` : c.publicadoPor}
            />
            <CampoBloqueado
              id="modificar-fecha-publicacion"
              etiqueta="Fecha y hora de publicación"
              valor={fechaHora(c.publicarEn)}
            />
            <div className="min-w-0 space-y-1">
              <p className="text-xs text-muted-foreground">Estado</p>
              <div className="flex min-h-9 items-center">{c.estado && <EstadoComunicadoBadge estado={c.estado} />}</div>
            </div>
          </div>
          {/* comms-service no devuelve el resumen por conjunto: se arma con los destinos guardados. */}
          <p className="text-sm break-words text-muted-foreground">
            {[dirigidoA, total != null ? `${total.toLocaleString("es-CO")} destinatarios` : null]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>
      </Panel>

      <form
        id={FORM_ID}
        noValidate
        className="contents"
        onSubmit={(e) => {
          e.preventDefault()
          setIntentado(true)
          if (corregir.isPending) return
          if (Object.keys(errores).length > 0) {
            notify(ERRORES_MENSAJE, { variant: "error" })
            enfocarPrimerError(errores)
            return
          }
          corregir.mutate(
            { titulo: tituloLimpio, mensaje: mensajeLimpio, archivos, quitarAdjuntos: quitados },
            {
              onSuccess: ({ fallidos }) => {
                const aviso = `Se modificó el comunicado ${tituloLimpio}.`
                const adjuntos = textoFallidos(fallidos)
                queueNotice(adjuntos ? `${aviso} ${adjuntos}` : aviso, adjuntos ? { variant: "warning" } : undefined)
                // Tras guardar se vuelve al detalle del comunicado modificado.
                void navigate({ to: paths.app.comunicacionesComunicadoDetalle.getHref(c.conversacionId) })
              },
            },
          )
        }}
      >
        <Panel titulo="Contenido">
        <div className="space-y-4">
        <Field variant="outlined" data-invalid={visibles[CAMPO.titulo] ? true : undefined}>
          <FieldLabel htmlFor={CAMPO.titulo}>
            Título<span className="text-red"> *</span>
          </FieldLabel>
          <Input
            id={CAMPO.titulo}
            placeholder="Agregar"
            value={titulo}
            maxLength={MAX_TITULO}
            aria-invalid={!!visibles[CAMPO.titulo]}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <CharacterCounter value={titulo} max={MAX_TITULO} />
          {visibles[CAMPO.titulo] && <FieldError>{visibles[CAMPO.titulo]}</FieldError>}
        </Field>
        <Field
          variant="outlined"
          data-invalid={visibles[CAMPO.mensaje] ? true : undefined}
        >
          <FieldLabel htmlFor={CAMPO.mensaje}>
            Mensaje<span className="text-red"> *</span>
          </FieldLabel>
          <Textarea
            id={CAMPO.mensaje}
            placeholder="Agregar"
            className={TEXTAREA_OUTLINED}
            value={mensaje}
            rows={6}
            maxLength={MAX_MENSAJE}
            aria-invalid={!!visibles[CAMPO.mensaje]}
            onChange={(e) => setMensaje(e.target.value)}
          />
          <CharacterCounter value={mensaje} max={MAX_MENSAJE} />
          {visibles[CAMPO.mensaje] && <FieldError>{visibles[CAMPO.mensaje]}</FieldError>}
        </Field>
        <AdjuntosCarga
          archivos={archivos}
          onArchivos={setArchivos}
          guardados={c.adjuntos ?? []}
          quitados={quitados}
          onQuitados={setQuitados}
          deshabilitado={corregir.isPending}
        />
        <p className="text-xs text-muted-foreground">Los adjuntos anteriores se conservan para auditoría.</p>
        <CampoBloqueado
          id="modificar-actualizado"
          etiqueta="Fecha de actualización"
          valor={c.actualizadoEn ? fechaHora(c.actualizadoEn) : "Se registra al guardar"}
        />
        </div>
        </Panel>
      </form>
      </div>
      </TableScreenBody>
      <TableScreenFooter>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        <div className="flex gap-2">
          <Button variant="ghost" color="neutral" onClick={cancelar} disabled={corregir.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={corregir.isPending} aria-busy={corregir.isPending}>
            <FloppyDiskIcon data-icon="inline-start" aria-hidden />
            Guardar
          </Button>
        </div>
      </TableScreenFooter>

      <ConfirmDiscardDialog open={salir} onOpenChange={setSalir} onConfirm={volver} />
    </TableScreen>
  )
}
