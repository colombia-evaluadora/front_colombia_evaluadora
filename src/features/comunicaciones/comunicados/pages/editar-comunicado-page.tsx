import { useState } from "react"
import { format } from "date-fns"
import { useNavigate } from "@tanstack/react-router"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { queueNotice } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { InfoIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { comunicadoEditarRoute } from "@/router"
import type { Comunicado } from "@/features/comunicaciones/chat/api/types"
import { textoFallidos } from "@/features/comunicaciones/chat/api/mutations/use-crear-comunicado"
import { useComunicadoQuery } from "@/features/comunicaciones/chat/api/query/use-comunicado-query"
import { AdjuntosComunicadoCampo } from "@/features/comunicaciones/chat/components/adjuntos-comunicado"
import { EstadoComunicadoBadge } from "@/features/comunicaciones/chat/components/comunicado-panel"
import { resumenDestinatarios } from "@/features/comunicaciones/chat/lib/destinos-comunicado"
import { useCorregirComunicado } from "@/features/comunicaciones/comunicados/api/comunicados-gestion"

const MAX_TITULO = 100
const MAX_MENSAJE = 1000
const MIN_MENSAJE = 10
const FORM_ID = "form-modificar-comunicado"

/** El contenido se guarda como HTML en párrafos; el formulario M.1 lo edita como texto plano. */
function htmlATexto(html: string): string {
  const doc = new DOMParser().parseFromString(
    html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>\s*<p[^>]*>/gi, "\n\n"),
    "text/html",
  )
  return (doc.body.textContent ?? "").trim()
}

const fechaHora = (iso: string | null | undefined) => (iso ? format(new Date(iso), "dd/MM/yyyy h:mm a") : "—")

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
  return <FormularioModificar key={c.conversacionId} comunicado={c} />
}

function FormularioModificar({ comunicado: c }: { comunicado: Comunicado }) {
  const navigate = useNavigate()
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
  const errores = [
    ...(tituloLimpio === "" ? ["Escribe el título."] : []),
    ...(mensajeLimpio.length < MIN_MENSAJE ? [`El mensaje debe tener al menos ${MIN_MENSAJE} caracteres.`] : []),
  ]
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
    <div className="flex min-w-0 flex-col gap-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Modificar comunicado</h1>
          {c.estado && <EstadoComunicadoBadge estado={c.estado} />}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" color="neutral" onClick={cancelar} disabled={corregir.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={corregir.isPending} aria-busy={corregir.isPending}>
            Guardar
          </Button>
        </div>
      </header>

      <p className="flex items-start gap-2 rounded-md border border-blue-stroke bg-blue-22 p-3 text-sm">
        <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-blue" />
        Al guardar se avisa a los destinatarios originales autorizados, sin agregar personas nuevas. Un error de
        destinatarios se corrige anulando y publicando otro.
      </p>

      <ErrorNoticeBanner error={corregir.isError ? corregir.error : null} />

      <section aria-labelledby="destinatarios-titulo" className="space-y-2 rounded-lg border p-4 text-sm">
        <h2 id="destinatarios-titulo" className="font-medium">
          Destinatarios (no se modifican después de publicar)
        </h2>
        <dl className="grid gap-2 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Publicado por</dt>
            <dd>{c.publicadoPor}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Fecha y hora de publicación</dt>
            <dd>{fechaHora(c.publicarEn)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Estado</dt>
            <dd>{c.estado && <EstadoComunicadoBadge estado={c.estado} />}</dd>
          </div>
        </dl>
        <p className="text-muted-foreground">
          {[dirigidoA, total != null ? `${total.toLocaleString("es-CO")} destinatarios` : null]
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>
      </section>

      <form
        id={FORM_ID}
        noValidate
        className="space-y-4 rounded-lg border p-4"
        onSubmit={(e) => {
          e.preventDefault()
          setIntentado(true)
          if (errores.length > 0 || corregir.isPending) return
          corregir.mutate(
            { titulo: tituloLimpio, mensaje: mensajeLimpio, archivos, quitarAdjuntos: quitados },
            {
              onSuccess: ({ fallidos }) => {
                const aviso = `Se modificó el comunicado ${tituloLimpio}.`
                const adjuntos = textoFallidos(fallidos)
                queueNotice(adjuntos ? `${aviso} ${adjuntos}` : aviso, adjuntos ? { variant: "warning" } : undefined)
                volver()
              },
            },
          )
        }}
      >
        <h2 className="font-medium">Contenido</h2>
        <div className="space-y-1.5">
          <label htmlFor="modificar-titulo" className="text-sm font-medium">
            Título<span className="text-red"> *</span>
          </label>
          <Input
            id="modificar-titulo"
            value={titulo}
            maxLength={MAX_TITULO}
            aria-invalid={intentado && tituloLimpio === ""}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <p className="text-right text-xs text-muted-foreground">
            {titulo.length} / {MAX_TITULO}
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="modificar-mensaje" className="text-sm font-medium">
            Mensaje<span className="text-red"> *</span>
          </label>
          <Textarea
            id="modificar-mensaje"
            value={mensaje}
            rows={6}
            maxLength={MAX_MENSAJE}
            aria-invalid={intentado && mensajeLimpio.length < MIN_MENSAJE}
            onChange={(e) => setMensaje(e.target.value)}
          />
          <p className="text-right text-xs text-muted-foreground">
            {mensaje.length} / {MAX_MENSAJE}
          </p>
        </div>
        {intentado && errores.length > 0 && (
          <ul role="alert" className="list-inside list-disc text-xs text-red">
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <AdjuntosComunicadoCampo
          archivos={archivos}
          onArchivos={setArchivos}
          guardados={c.adjuntos ?? []}
          quitados={quitados}
          onQuitados={setQuitados}
          deshabilitado={corregir.isPending}
        />
        <p className="text-xs text-muted-foreground">Los adjuntos anteriores se conservan para auditoría.</p>
        <div>
          <p className="text-xs text-muted-foreground">Fecha de actualización</p>
          <p className="text-sm">{fechaHora(c.actualizadoEn)}</p>
        </div>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
      </form>

      <ConfirmDiscardDialog open={salir} onOpenChange={setSalir} onConfirm={volver} />
    </div>
  )
}
