import { useState } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { maxLength, required } from "@/lib/forms/messages"
import type { Audiencia } from "@/features/comunicaciones/chat/api/types"
import { AUDIENCIAS } from "@/features/comunicaciones/chat/api/ui-mappings"
import { useCrearComunicado } from "@/features/comunicaciones/chat/api/mutations/use-crear-comunicado"
import { EditorTexto } from "@/features/comunicaciones/chat/components/editor-texto"
import { SelectorChips } from "@/features/comunicaciones/chat/components/selector-chips"
import { htmlSeguro, htmlVacio } from "@/features/comunicaciones/chat/lib/html-seguro"
import { ahoraLocal } from "@/features/comunicaciones/chat/lib/fechas-canal"


const datosSchema = z.object({
  titulo: z.string().trim().min(1, required("El título")).max(120, maxLength(120, "El título")),
  descripcion: z.string().max(300, maxLength(300, "La descripción")),
  audiencia: z.array(z.string()).min(1, "Elige al menos un grupo."),
  publicarEn: z
    .string()
    .nullable()
    .refine((v) => !!v, required("La fecha de publicación", { femenino: true })),
})

type Datos = z.infer<typeof datosSchema>


export function CrearComunicadoDialog({
  open,
  onClose,
  onCreado,
}: {
  open: boolean
  onClose: () => void
  onCreado: (conversacionId: number) => void
}) {
  const { notify } = useNotify()
  const [paso, setPaso] = useState<1 | 2>(1)
  const [html, setHtml] = useState("")
  const [intentado, setIntentado] = useState(false)
  const [descartar, setDescartar] = useState(false)
  const crear = useCrearComunicado()
  const contenidoVacio = htmlVacio(html)

  const datos = useAppForm({
    defaultValues: {
      titulo: "",
      descripcion: "",
      audiencia: [],
      publicarEn: ahoraLocal(),
    } as Datos,
    validators: { onSubmit: datosSchema },
    onSubmit: () => setPaso(2),
  })

  const reiniciar = () => {
    datos.reset({ titulo: "", descripcion: "", audiencia: [], publicarEn: ahoraLocal() })
    setHtml("")
    setIntentado(false)
    setPaso(1)
    crear.reset()
    onClose()
  }

  const intentarCerrar = () => {
    if (crear.isPending) return
    if (datos.state.isDirty || !contenidoVacio) setDescartar(true)
    else reiniciar()
  }

  const crearComunicado = () => {
    setIntentado(true)
    if (contenidoVacio) return
    const v = datos.state.values
    crear.mutate(
      {
        titulo: v.titulo.trim(),
        descripcion: v.descripcion.trim(),
        audiencia: v.audiencia as Audiencia[],
        publicarEn: new Date(v.publicarEn as string).toISOString(),
        contenidoHtml: htmlSeguro(html),
      },
      {
        onSuccess: (canal) => {
          const programado = new Date(v.publicarEn as string) > new Date()
          notify(
            programado
              ? `Se programó el comunicado ${canal.nombre}.`
              : `Se publicó el comunicado ${canal.nombre}.`,
          )
          reiniciar()
          onCreado(canal.id)
        },
      },
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && intentarCerrar()}>
        <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Crear un Comunicado</DialogTitle>
          </DialogHeader>

          {paso === 1 ? (
            <form
              id="comunicado-datos"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                void datos.handleSubmit()
              }}
              className="-mx-1 space-y-4 overflow-y-auto px-1 py-1"
            >
              <datos.AppField name="titulo">
                {(f) => (
                  <f.TextField
                    label="Título del comunicado"
                    required
                    maxLength={120}
                    placeholder="Por ejemplo, Suspensión de clases por mantenimiento"
                  />
                )}
              </datos.AppField>
              <datos.AppField name="descripcion">
                {(f) => <f.TextareaField label="Descripción" maxLength={300} />}
              </datos.AppField>
              <datos.Field name="audiencia">
                {(f) => {
                  const invalido = f.state.meta.errors.length > 0
                  return (
                    <div className="relative">
                      <span className="absolute -top-2.5 left-3 z-10 bg-popover px-1 text-sm font-medium">
                        Audiencia<span className="text-red"> *</span>
                      </span>
                      <SelectorChips
                        items={AUDIENCIAS}
                        value={AUDIENCIAS.filter((a) => f.state.value.includes(a.value))}
                        onChange={(v) => f.handleChange(v.map((a) => a.value))}
                        getId={(a) => a.value}
                        getLabel={(a) => a.label}
                        visibles={3}
                        conFlecha
                        invalido={invalido}
                        ariaLabel="Audiencia"
                        placeholder="Elige quién recibe el comunicado"
                      />
                      {invalido && (
                        <p role="alert" className="mt-1 text-xs text-red">
                          Elige al menos un grupo.
                        </p>
                      )}
                    </div>
                  )
                }}
              </datos.Field>
              <datos.AppField name="publicarEn">
                {(f) => (
                  <f.DateField
                    label="Fecha y hora de publicación"
                    required
                    mode="datetime"
                    minDate={new Date()}
                    description="Si eliges una fecha futura, el comunicado queda programado."
                  />
                )}
              </datos.AppField>
            </form>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-1.5">
              <EditorTexto etiqueta="Contenido del comunicado" valor={html} onCambio={setHtml} invalido={intentado && contenidoVacio} />
              {intentado && contenidoVacio && (
                <p role="alert" className="text-xs text-red">
                  Escribe el contenido del comunicado.
                </p>
              )}
            </div>
          )}

          {crear.isError && (
            <p role="alert" className="text-sm text-red">
              {getErrorMessage(crear.error)}
            </p>
          )}

          <DialogFooter className="sm:justify-between">
            {paso === 1 ? (
              <Button type="submit" form="comunicado-datos" className="sm:ml-auto">
                Siguiente
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            ) : (
              <>
                <Button type="button" onClick={() => setPaso(1)} disabled={crear.isPending}>
                  <ArrowLeftIcon data-icon="inline-start" />
                  Atrás
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={crearComunicado}
                    disabled={crear.isPending}
                    aria-busy={crear.isPending}
                  >
                    Crear
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                  <Button
                    type="button"
                    color="neutral"
                    onClick={intentarCerrar}
                    disabled={crear.isPending}
                  >
                    <XIcon data-icon="inline-start" />
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDiscardDialog
        open={descartar}
        onOpenChange={setDescartar}
        onConfirm={() => {
          setDescartar(false)
          reiniciar()
        }}
      />
    </>
  )
}
