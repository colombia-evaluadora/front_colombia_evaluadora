import { useState } from "react"
import { useStore } from "@tanstack/react-form"
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
import type { Audiencia, Comunicado } from "@/features/comunicaciones/chat/api/types"
import { AUDIENCIAS } from "@/features/comunicaciones/chat/api/ui-mappings"
import {
  useCrearComunicado,
  useEditarComunicado,
} from "@/features/comunicaciones/chat/api/mutations/use-crear-comunicado"
import { EditorTexto } from "@/features/comunicaciones/chat/components/editor-texto"
import { SelectorChips } from "@/features/comunicaciones/chat/components/selector-chips"
import { htmlSeguro, htmlVacio } from "@/features/comunicaciones/chat/lib/html-seguro"
import { ahoraLocal, isoALocal } from "@/features/comunicaciones/chat/lib/fechas-canal"
import {
  useAutoguardadoActividad,
  useEliminarBorradorActividad,
} from "@/features/comunicaciones/chat/api/mutations/use-borrador-actividad"
import { BarraBorrador } from "@/features/comunicaciones/chat/components/estado-autoguardado"
import { datosDe, hayContenido } from "@/features/comunicaciones/chat/lib/borrador-actividad"


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
  editar,
  borrador,
}: {
  open: boolean
  onClose: () => void
  onCreado: (conversacionId: number) => void
  // "Editar Comunicado" (diseño 4062:67938). Ya publicado, la audiencia y la fecha no cambian.
  // Quien lo abre lo monta con `key` para que los valores iniciales se lean una vez.
  editar?: Comunicado
  // Borrador retomado desde "Borradores y enviados" (montado con `key`). Con `editar`, son los
  // cambios sin guardar de esa edición (se aplican sobre lo publicado).
  borrador?: { id: number; datos: Record<string, unknown> | null }
}) {
  const { notify } = useNotify()
  const [paso, setPaso] = useState<1 | 2>(1)
  const [html, setHtml] = useState(
    typeof borrador?.datos?.html === "string" ? borrador.datos.html : (editar?.contenidoHtml ?? ""),
  )
  const [intentado, setIntentado] = useState(false)
  const [descartar, setDescartar] = useState(false)
  const crearNuevo = useCrearComunicado()
  const editarComunicado = useEditarComunicado(editar?.conversacionId ?? 0)
  const crear = editar ? editarComunicado : crearNuevo
  const contenidoVacio = htmlVacio(html)
  // Ya publicado: solo se corrigen título, descripción y contenido.
  const publicado = !!editar && new Date(editar.publicarEn) <= new Date()

  const datos = useAppForm({
    defaultValues: (editar
      ? datosDe(borrador?.datos, {
          titulo: editar.titulo,
          descripcion: editar.descripcion,
          audiencia: editar.audiencia as string[],
          publicarEn: isoALocal(editar.publicarEn) as string | null,
        })
      : datosDe(borrador?.datos, {
          titulo: "",
          descripcion: "",
          audiencia: [] as string[],
          publicarEn: ahoraLocal() as string | null,
        })) as Datos,
    validators: { onSubmit: datosSchema },
    onSubmit: () => setPaso(2),
  })

  // Lo escrito se autoguarda como borrador (comms-service); al editar uno publicado, atado a él.
  const valores = useStore(datos.store, (s) => s.values)
  const autoguardado = useAutoguardadoActividad({
    tipo: "COMUNICADO",
    habilitado: open,
    titulo: valores.titulo,
    datos: { ...valores, html },
    conContenido: hayContenido(valores.titulo, valores.descripcion, valores.audiencia, contenidoVacio ? "" : html),
    borradorInicial: borrador?.id,
    conversacionId: editar?.conversacionId,
  })
  const eliminarBorrador = useEliminarBorradorActividad()

  const reiniciar = () => {
    autoguardado.reiniciar()
    datos.reset({ titulo: "", descripcion: "", audiencia: [], publicarEn: ahoraLocal() })
    setHtml("")
    setIntentado(false)
    setPaso(1)
    crear.reset()
    onClose()
  }

  const intentarCerrar = async () => {
    if (crear.isPending) return
    // Cerrar no pierde nada: lo escrito queda en "Borradores y enviados".
    const id = await autoguardado.guardarYa()
    if (id) {
      notify(
        editar
          ? "Tus cambios sin guardar quedaron en Borradores y enviados."
          : "El comunicado quedó guardado en Borradores y enviados.",
      )
    }
    reiniciar()
  }

  const crearComunicado = async () => {
    setIntentado(true)
    if (contenidoVacio) return
    const v = datos.state.values
    const cuerpo = {
      titulo: v.titulo.trim(),
      descripcion: v.descripcion.trim(),
      audiencia: v.audiencia as Audiencia[],
      // Ya publicado se reenvía la fecha original exacta (el backend rechaza cambiarla).
      publicarEn: publicado && editar ? editar.publicarEn : new Date(v.publicarEn as string).toISOString(),
      contenidoHtml: htmlSeguro(html),
    }
    if (editar) {
      // Guardar desde el borrador de la edición lo elimina (?borrador).
      const borradorId = await autoguardado.guardarYa()
      editarComunicado.mutate({ ...cuerpo, borradorId }, {
        onSuccess: (c) => {
          notify(`Se guardaron los cambios de ${c.titulo}.`)
          reiniciar()
        },
      })
      return
    }
    const borradorId = await autoguardado.guardarYa()
    crearNuevo.mutate(
      { ...cuerpo, borradorId },
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
      <Dialog open={open} onOpenChange={(o) => !o && void intentarCerrar()}>
        <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editar ? "Editar Comunicado" : "Crear un Comunicado"}</DialogTitle>
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
                        deshabilitado={publicado ? () => true : undefined}
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
                    minDate={publicado ? undefined : new Date()}
                    disabled={publicado}
                    description={
                      publicado
                        ? "Ya se publicó: la audiencia y la fecha no se pueden cambiar."
                        : "Si eliges una fecha futura, el comunicado queda programado."
                    }
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

          <BarraBorrador
            estado={autoguardado.estado}
            hayBorrador={!!autoguardado.borradorId}
            onDescartar={() => setDescartar(true)}
            deshabilitado={crear.isPending}
            edicion={!!editar}
          />

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
                    onClick={() => void crearComunicado()}
                    disabled={crear.isPending}
                    aria-busy={crear.isPending}
                  >
                    {editar ? "Guardar" : "Crear"}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                  <Button
                    type="button"
                    color="neutral"
                    onClick={() => void intentarCerrar()}
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
          if (autoguardado.borradorId) {
            // Promesa y no callbacks de `mutate`: al descartar, el diálogo puede desmontarse (sale de
            // "Borradores y enviados" o cambia su `key`) y React Query no llama los callbacks por llamada.
            eliminarBorrador
              .mutateAsync(autoguardado.borradorId)
              .then(() => notify("Borrador descartado."))
              .catch((error: unknown) => notify(getErrorMessage(error), { variant: "error" }))
          }
          reiniciar()
        }}
      />
    </>
  )
}
