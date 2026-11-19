import { useRef, useState } from "react"
import { useStore } from "@tanstack/react-form"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { PaperclipIcon, XIcon } from "@/components/ui/icons"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { useNotify } from "@/components/notice/notice-context"
import { toFieldErrors, useAppForm, useFieldContext } from "@/lib/forms"
import type { Persona } from "@/features/comunicaciones/chat/api/types"
import { usePersonasQuery } from "@/features/comunicaciones/chat/api/query/use-personas-query"
import { useCrearDirecto } from "@/features/comunicaciones/chat/api/mutations/use-acciones-miembro"
import { useCrearCanal } from "@/features/comunicaciones/chat/api/mutations/use-acciones-conversacion"
import { useEnviarMensaje } from "@/features/comunicaciones/chat/api/mutations/use-enviar-mensaje"
import {
  useEnviarPorSeparado,
  type ResultadoPorSeparado,
} from "@/features/comunicaciones/chat/api/mutations/use-enviar-por-separado"
import { useChatAccess } from "@/features/comunicaciones/chat/api/use-chat-access"
import { SelectorPersonas } from "@/features/comunicaciones/chat/components/crear-chat-dialog"
import {
  ACEPTA_DOCUMENTOS,
  ACEPTA_MULTIMEDIA,
  MAX_ADJUNTO_MENSAJE_MB,
  MAX_ADJUNTOS,
  agregarAdjuntos,
  pesoLegible,
} from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import { MAX_ASUNTO, MAX_MENSAJE } from "@/features/comunicaciones/chat/lib/asunto"
import {
  MODOS_NUEVO_MENSAJE,
  mensajeErrorNuevo,
  nuevoMensajeSchema,
  type ModoNuevoMensaje,
  type ValoresNuevoMensaje,
} from "@/features/comunicaciones/chat/lib/nuevo-mensaje"

const FORM_ID = "nuevo-mensaje"
// El nombre del grupo (único campo obligatorio de comms-service para un GRUPO) sale del asunto.
const MAX_NOMBRE_GRUPO = 80

interface NuevoMensajeDialogProps {
  open: boolean
  onClose: () => void
  /** Conversación creada (individual o grupal): la página la abre. */
  onCreado: (id: number) => void
  /** Modo con el que abre ("Crear grupo" → GRUPAL). */
  modoInicial?: ModoNuevoMensaje
  /** Destinatario elegido antes de abrir (buscador de personas de la bandeja). */
  paraInicial?: Persona[]
}

/**
 * "Nuevo mensaje" (diseño Comunicaciones §4.3, M.2.NUE.1/2/3): Para (solo personas a quienes se
 * puede escribir), modo Individual / Enviar por separado / Grupal, asunto (≤120), mensaje (≤5000) y
 * hasta 3 adjuntos (no en Enviar por separado). Reemplaza "Nuevo mensaje directo" y "Crear grupo".
 * El cuerpo se monta solo abierto para que cada apertura empiece limpia.
 */
export function NuevoMensajeDialog(props: NuevoMensajeDialogProps) {
  if (!props.open) return null
  return <NuevoMensajeContenido {...props} />
}

function NuevoMensajeContenido({ onClose, onCreado, modoInicial = "INDIVIDUAL", paraInicial = [] }: NuevoMensajeDialogProps) {
  const { notify } = useNotify()
  const { puedeGestionar, reglaDirectoCon } = useChatAccess()
  const cuerpoRef = useRef<HTMLDivElement>(null)
  const archivoRef = useRef<HTMLInputElement>(null)
  const [archivos, setArchivos] = useState<File[]>([])
  const [errorAdjuntos, setErrorAdjuntos] = useState<string | null>(null)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [resumen, setResumen] = useState<{ resultado: ResultadoPorSeparado; para: Persona[] } | null>(null)

  const crearDirecto = useCrearDirecto()
  const crearGrupo = useCrearCanal()
  const enviarMensaje = useEnviarMensaje()
  const porSeparado = useEnviarPorSeparado()
  const pendiente = crearDirecto.isPending || crearGrupo.isPending || enviarMensaje.isPending || porSeparado.isPending

  // El primer mensaje va al hilo recién creado; si falla, el hilo ya existe y se abre igual.
  const enviarPrimerMensaje = async (conversacionId: number, texto: string) => {
    try {
      await enviarMensaje.mutateAsync({ conversacionId, texto, archivos })
    } catch (error) {
      notify(mensajeErrorNuevo(error), { variant: "error" })
    }
    onClose()
    onCreado(conversacionId)
  }

  const enviar = async ({ para, modo, asunto, mensaje }: ValoresNuevoMensaje) => {
    setErrorEnvio(null)
    const a = asunto.trim()
    const texto = mensaje.trim()
    try {
      if (modo === "SEPARADO") {
        const resultado = await porSeparado.mutateAsync({ destinatarios: para.map((p) => p.id), asunto: a, mensaje: texto })
        setResumen({ resultado, para })
        return
      }
      if (modo === "INDIVIDUAL") {
        const directo = await crearDirecto.mutateAsync({ personaId: para[0].id, asunto: a })
        await enviarPrimerMensaje(directo.id, texto)
        return
      }
      const grupo = await crearGrupo.mutateAsync({
        nombre: a.slice(0, MAX_NOMBRE_GRUPO),
        asunto: a,
        categoria: "GENERAL",
        tipo: "GRUPO",
        miembros: para.map((p) => p.id),
      })
      notify(`Se creó el grupo ${a}.`)
      await enviarPrimerMensaje(grupo.id, texto)
    } catch (error) {
      setErrorEnvio(mensajeErrorNuevo(error))
    }
  }

  const form = useAppForm({
    defaultValues: { para: paraInicial, modo: modoInicial, asunto: "", mensaje: "" } as ValoresNuevoMensaje,
    validators: { onSubmit: nuevoMensajeSchema },
    onSubmit: ({ value }) => enviar(value),
    onSubmitInvalid: () => irAlPrimerError(),
  })
  const modo = useStore(form.store, (s) => s.values.modo)
  const sucio = useStore(form.store, (s) => s.isDirty) || archivos.length > 0
  const conAdjuntos = modo !== "SEPARADO"

  // Patrón del repo (crear-evaluacion-dialog): foco y scroll al primer campo en rojo.
  const irAlPrimerError = () =>
    requestAnimationFrame(() => {
      const el = cuerpoRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')
      if (!el) return
      el.scrollIntoView({ block: "center", behavior: "smooth" })
      const foco = el.matches("input, textarea, button") ? el : el.querySelector<HTMLElement>("input, textarea, button")
      foco?.focus({ preventScroll: true })
    })

  // Con cambios pide confirmar; mientras envía no se cierra.
  const [descartar, setDescartar] = useState(false)
  const cerrar = () => {
    if (pendiente) return
    if (sucio) setDescartar(true)
    else onClose()
  }

  const elegirArchivos = (lista: FileList | null) => {
    const { archivos: siguientes, error } = agregarAdjuntos(archivos, Array.from(lista ?? []))
    setArchivos(siguientes)
    setErrorAdjuntos(error)
  }

  if (resumen) {
    return <ResumenPorSeparado resumen={resumen} onCerrar={onClose} />
  }

  return (
    <Dialog open onOpenChange={(o) => !o && cerrar()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>Nuevo mensaje</DialogTitle>
        </DialogHeader>
        <ErrorNoticeBanner error={errorEnvio} fallback={errorEnvio ?? undefined} />

        <form
          id={FORM_ID}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <div ref={cuerpoRef} className="space-y-5">
            <form.AppField name="para">
              {() => (
                <CampoPara
                  paraGrupo={modo === "GRUPAL"}
                  permitido={(p) => modo === "GRUPAL" || reglaDirectoCon(p.perfil) !== "PROHIBIDO"}
                />
              )}
            </form.AppField>

            <form.AppField
              name="modo"
              listeners={{
                // Sin adjuntos al enviar por separado (comms-service no los acepta).
                onChange: ({ value }) => {
                  if (value === "SEPARADO") {
                    setArchivos([])
                    setErrorAdjuntos(null)
                  }
                },
              }}
            >
              {(field) => (
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-sm font-medium">Modo</legend>
                  <RadioGroup
                    value={field.state.value}
                    onValueChange={(v) => {
                      field.handleChange(v as ModoNuevoMensaje)
                      // El conteo de destinatarios depende del modo.
                      void form.validateField("para", "change")
                    }}
                    className="flex flex-wrap gap-x-6 gap-y-2"
                    disabled={pendiente}
                  >
                    {MODOS_NUEVO_MENSAJE.map((m) => (
                      <label key={m.valor} className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value={m.valor} disabled={m.valor === "GRUPAL" && !puedeGestionar} />
                        {m.etiqueta}
                      </label>
                    ))}
                  </RadioGroup>
                </fieldset>
              )}
            </form.AppField>

            <form.AppField name="asunto">
              {(f) => <f.TextField label="Asunto" required maxLength={MAX_ASUNTO} showCounter placeholder="Escriba el asunto" />}
            </form.AppField>

            <form.AppField name="mensaje">
              {(f) => (
                <f.TextareaField label="Mensaje" required maxLength={MAX_MENSAJE} rows={5} placeholder="Escriba su mensaje" />
              )}
            </form.AppField>

            {conAdjuntos && (
              <section aria-labelledby="nuevo-mensaje-adjuntos" className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 id="nuevo-mensaje-adjuntos" className="text-sm font-medium">
                    Adjuntos
                  </h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    color="primary"
                    disabled={pendiente || archivos.length >= MAX_ADJUNTOS}
                    onClick={() => archivoRef.current?.click()}
                  >
                    <PaperclipIcon data-icon="inline-start" />
                    Cargar archivos
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {archivos.length} de {MAX_ADJUNTOS} · {MAX_ADJUNTO_MENSAJE_MB} MB cada uno
                  </span>
                  <input
                    ref={archivoRef}
                    type="file"
                    multiple
                    hidden
                    accept={`${ACEPTA_DOCUMENTOS},${ACEPTA_MULTIMEDIA}`}
                    onChange={(e) => {
                      elegirArchivos(e.target.files)
                      e.target.value = ""
                    }}
                  />
                </div>
                {errorAdjuntos && (
                  <p role="alert" className="text-sm text-red">
                    {errorAdjuntos}
                  </p>
                )}
                {archivos.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {archivos.map((a, i) => (
                      <li key={`${a.name}-${a.size}`} className="flex max-w-full items-center gap-2 rounded-lg border px-2 py-1 text-sm">
                        <span className="truncate">{a.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{pesoLegible(a.size)}</span>
                        <button
                          type="button"
                          aria-label={`Quitar ${a.name}`}
                          disabled={pendiente}
                          onClick={() => {
                            setArchivos(archivos.filter((_, j) => j !== i))
                            setErrorAdjuntos(null)
                          }}
                          className="grid size-6 place-items-center rounded text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        >
                          <XIcon className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="fill" color="neutral" onClick={cerrar} disabled={pendiente}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pendiente} aria-busy={pendiente}>
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDiscardDialog open={descartar} onOpenChange={setDescartar} onConfirm={onClose} />
    </Dialog>
  )
}

/** "* Para" con el selector de personas existente (chips) y la regla de a quién se escribe. */
function CampoPara({ paraGrupo, permitido }: { paraGrupo: boolean; permitido: (p: Persona) => boolean }) {
  const field = useFieldContext<Persona[]>()
  const valor = useStore(field.store, (s) => s.value)
  const meta = useStore(field.store, (s) => s.meta)
  const intentos = useStore(field.form.store, (s) => s.submissionAttempts)
  const invalido = (meta.isTouched || intentos > 0) && !meta.isValid
  const [consulta, setConsulta] = useState("")
  const personas = usePersonasQuery(true, consulta, { paraGrupo })
  const delServidor = !personas.isPlaceholderData && consulta.trim().length >= 2
  return (
    <Field variant="outlined" data-invalid={invalido}>
      <FieldLabel className="z-10 bg-popover">Para*</FieldLabel>
      <SelectorPersonas
        personas={(personas.data ?? []).filter(permitido)}
        cargando={personas.isPending}
        delServidor={delServidor}
        onConsulta={setConsulta}
        value={valor}
        onChange={(v) => {
          field.handleChange(v)
          field.handleBlur()
        }}
        paraGrupo={paraGrupo}
        autoFocus={valor.length === 0}
      />
      {invalido ? (
        <FieldError errors={toFieldErrors(meta.errors)} />
      ) : (
        <FieldDescription>Solo aparecen las personas a quienes puede escribir.</FieldDescription>
      )}
    </Field>
  )
}

/** Resultado de "Enviar por separado": enviados y rechazados con su motivo. */
function ResumenPorSeparado({
  resumen: { resultado, para },
  onCerrar,
}: {
  resumen: { resultado: ResultadoPorSeparado; para: Persona[] }
  onCerrar: () => void
}) {
  const nombre = (id: number) => para.find((p) => p.id === id)?.nombre ?? `Persona ${id}`
  const enviados = resultado.conversaciones.length
  return (
    <Dialog open onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mensajes enviados por separado</DialogTitle>
          <DialogDescription>
            {enviados === 1 ? "Se envió 1 mensaje." : `Se enviaron ${enviados} mensajes.`}
            {resultado.rechazados.length > 0 &&
              ` ${resultado.rechazados.length === 1 ? "1 persona no lo recibió" : `${resultado.rechazados.length} personas no lo recibieron`}.`}
          </DialogDescription>
        </DialogHeader>
        {resultado.rechazados.length > 0 && (
          <section aria-labelledby="rechazados-titulo" className="space-y-2">
            <h3 id="rechazados-titulo" className="text-sm font-medium">
              No enviados
            </h3>
            <ul className="max-h-60 divide-y overflow-y-auto rounded-lg border text-sm">
              {resultado.rechazados.map((r) => (
                <li key={r.destinatario} className="px-3 py-2">
                  <span className="block font-medium">{nombre(r.destinatario)}</span>
                  <span className="block text-red">{r.motivo}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <DialogFooter>
          <Button type="button" onClick={onCerrar}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
