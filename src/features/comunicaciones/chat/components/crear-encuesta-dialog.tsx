import { useState } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import type { VisibilidadResultados } from "@/features/comunicaciones/chat/api/types"
import { useCrearEncuesta } from "@/features/comunicaciones/chat/api/mutations/use-crear-encuesta"
import { OPCIONES_SI_NO } from "@/features/comunicaciones/chat/lib/encuesta"
import {
  errorPregunta,
  nuevaPregunta,
  type PreguntaLocal,
} from "@/features/comunicaciones/chat/lib/preguntas"
import { ListaPreguntas } from "@/features/comunicaciones/chat/components/editor-preguntas"
import { diaMinimo, errorCierre, validarRangoFechas } from "@/features/comunicaciones/chat/lib/fechas-canal"

const datosSchema = z
  .object({
    nombre: z.string().trim().min(1, required("El nombre")).max(80, maxLength(80, "El nombre")),
    descripcion: z.string().max(500, maxLength(500, "La descripción")),
    fechaInicio: z.string().nullable(),
    fechaCierre: z.string().nullable(),
  })
  .superRefine((v, ctx) => validarRangoFechas(v, ctx))

type Datos = z.infer<typeof datosSchema>

const DATOS_INICIALES: Datos = { nombre: "", descripcion: "", fechaInicio: null, fechaCierre: null }

const aIso = (v: string | null) => (v ? new Date(v).toISOString() : null)

export function CrearEncuestaDialog({
  open,
  onClose,
  onCreada,
}: {
  open: boolean
  onClose: () => void
  onCreada: (conversacionId: number) => void
}) {
  const { notify } = useNotify()
  const [paso, setPaso] = useState<1 | 2>(1)
  const [resultados, setResultados] = useState<VisibilidadResultados>("PUBLICOS")
  const [preguntas, setPreguntas] = useState<PreguntaLocal[]>([])
  const [intentado, setIntentado] = useState(false)
  const [descartar, setDescartar] = useState(false)
  const crear = useCrearEncuesta()

  const datos = useAppForm({
    defaultValues: DATOS_INICIALES,
    validators: { onSubmit: datosSchema },
    onSubmit: () => {
      if (preguntas.length === 0) setPreguntas([nuevaPregunta("MULTIPLE", "ENCUESTA")])
      setPaso(2)
    },
  })

  const reiniciar = () => {
    datos.reset()
    setResultados("PUBLICOS")
    setPreguntas([])
    setIntentado(false)
    setPaso(1)
    crear.reset()
    onClose()
  }

  const intentarCerrar = () => {
    if (crear.isPending) return
    if (datos.state.isDirty || preguntas.some((p) => p.texto.trim())) setDescartar(true)
    else reiniciar()
  }

  const crearEncuesta = () => {
    setIntentado(true)
    if (preguntas.length === 0 || preguntas.some((p) => errorPregunta(p, "ENCUESTA"))) return
    const v = datos.state.values
    crear.mutate(
      {
        nombre: v.nombre.trim(),
        descripcion: v.descripcion.trim(),
        fechaInicio: aIso(v.fechaInicio),
        fechaCierre: aIso(v.fechaCierre),
        resultados,
        preguntas: preguntas.map((p) => ({
          tipo: p.tipo,
          texto: p.texto.trim(),
          opciones: p.tipo === "SI_NO" ? OPCIONES_SI_NO : p.opciones.map((o) => o.texto.trim()),
        })),
      },
      {
        onSuccess: (canal) => {
          notify(`Se creó la encuesta ${canal.nombre}.`)
          reiniciar()
          onCreada(canal.id)
        },
      },
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && intentarCerrar()}>
        <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear una Encuesta</DialogTitle>
          </DialogHeader>

          {paso === 1 ? (
            <form
              id="encuesta-datos"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                void datos.handleSubmit()
              }}
              className="-mx-1 space-y-4 overflow-y-auto px-1 py-1"
            >
              <datos.AppField name="nombre">
                {(f) => (
                  <f.TextField
                    label="Nombre"
                    required
                    maxLength={80}
                    placeholder="Por ejemplo, Encuesta Satisfacción"
                  />
                )}
              </datos.AppField>
              <datos.AppField name="descripcion">
                {(f) => <f.TextareaField label="Descripción" maxLength={500} />}
              </datos.AppField>
              <div className="grid gap-4 sm:grid-cols-2">
                <datos.AppField name="fechaInicio">
                  {(f) => <f.DateField label="Fecha inicio" required mode="datetime" minDate={new Date()} />}
                </datos.AppField>
                {/* El día mínimo del cierre sigue a la fecha de inicio. */}
                <datos.Subscribe selector={(st) => st.values.fechaInicio}>
                  {(inicio) => (
                    <datos.AppField
                      name="fechaCierre"
                      // Se valida al momento, también cuando cambia el inicio.
                      validators={{
                        onChangeListenTo: ["fechaInicio"],
                        onChange: ({ value, fieldApi }) =>
                          errorCierre(fieldApi.form.getFieldValue("fechaInicio"), value),
                      }}
                    >
                      {(f) => (
                        <f.DateField
                          label="Fecha final" required
                          mode="datetime"
                          minDate={diaMinimo(inicio)}
                          description="Al llegar esta fecha se cierran las respuestas."
                        />
                      )}
                    </datos.AppField>
                  )}
                </datos.Subscribe>
              </div>
              <fieldset className="rounded-lg border px-3 pt-1 pb-3">
                <legend className="px-1 text-sm font-medium">Resultados</legend>
                <div role="radiogroup" className="flex flex-wrap gap-x-6 gap-y-2">
                  {(
                    [
                      ["PUBLICOS", "Públicos"],
                      ["ADMIN", "Solo administrador"],
                    ] as const
                  ).map(([valor, etiqueta]) => (
                    <label key={valor} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={resultados === valor}
                        onCheckedChange={(c) => c && setResultados(valor)}
                      />
                      {etiqueta}
                    </label>
                  ))}
                </div>
              </fieldset>
            </form>
          ) : (
            <ListaPreguntas
              modo="ENCUESTA"
              preguntas={preguntas}
              onCambio={setPreguntas}
              intentado={intentado}
            />
          )}

          {crear.isError && (
            <p role="alert" className="text-sm text-red">
              {getErrorMessage(crear.error)}
            </p>
          )}

          <DialogFooter className="sm:justify-between">
            {paso === 1 ? (
              <Button type="submit" form="encuesta-datos" className="sm:ml-auto">
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
                    onClick={crearEncuesta}
                    disabled={preguntas.length === 0 || crear.isPending}
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
