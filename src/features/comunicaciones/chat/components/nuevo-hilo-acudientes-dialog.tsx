import { useState } from "react"
import { useStore } from "@tanstack/react-form"
import { XIcon } from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { useNotify } from "@/components/notice/notice-context"
import { useAppForm } from "@/lib/forms"
import { getErrorMessage } from "@/lib/api-client"
import { useOpcionesHiloQuery } from "@/features/comunicaciones/chat/api/query/use-hilos-acudientes-query"
import { useCrearHiloAcudientes } from "@/features/comunicaciones/chat/api/mutations/use-hilo-acudientes"
import { MAX_ASUNTO, MAX_MENSAJE } from "@/features/comunicaciones/chat/lib/asunto"
import {
  acudientesTexto,
  nuevoHiloSchema,
  valorOpcionHilo,
  type ValoresNuevoHilo,
} from "@/features/comunicaciones/chat/lib/hilo-acudientes"

const FORM_ID = "nuevo-hilo-acudientes"

interface NuevoHiloAcudientesDialogProps {
  open: boolean
  onClose: () => void
  /** Hilo creado: la página lo abre. */
  onCreado: (id: number) => void
}

/**
 * "Nuevo hilo con acudientes" (Comunicaciones §4.5, M.2.HIL.2): el docente elige su grupo (responsable
 * de grupo) o una [Ejecución] suya (responsable de enseñanza), el asunto y el primer mensaje. Los
 * participantes los calcula el sistema: se muestra cuántos acudientes vigentes quedarían.
 */
export function NuevoHiloAcudientesDialog(props: NuevoHiloAcudientesDialogProps) {
  if (!props.open) return null
  return <NuevoHiloContenido {...props} />
}

function NuevoHiloContenido({ onClose, onCreado }: NuevoHiloAcudientesDialogProps) {
  const { notify } = useNotify()
  const opciones = useOpcionesHiloQuery()
  const crear = useCrearHiloAcudientes()
  const [descartar, setDescartar] = useState(false)
  const lista = opciones.data ?? []

  const form = useAppForm({
    defaultValues: { opcion: "", asunto: "", mensaje: "" } as ValoresNuevoHilo,
    validators: { onSubmit: nuevoHiloSchema },
    onSubmit: async ({ value }) => {
      const opcion = lista.find((o) => valorOpcionHilo(o) === value.opcion)
      if (!opcion) return
      // El error queda en el banner (crear.error); el diálogo sigue abierto.
      const hilo = await crear.mutateAsync({ opcion, asunto: value.asunto, mensaje: value.mensaje }).catch(() => null)
      if (!hilo) return
      notify(`Se creó el hilo con los acudientes de ${opcion.nombre}.`)
      onCreado(hilo.id)
      onClose()
    },
  })
  const elegida = useStore(form.store, (s) => lista.find((o) => valorOpcionHilo(o) === s.values.opcion))
  const sucio = useStore(form.store, (s) => s.isDirty)
  const pendiente = crear.isPending

  const cerrar = () => {
    if (pendiente) return
    if (sucio) setDescartar(true)
    else onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && cerrar()}>
      <DialogContent showCloseButton={false} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo hilo con acudientes</DialogTitle>
          <DialogDescription>
            Los participantes son los acudientes vigentes del grupo; el sistema los mantiene al día.
          </DialogDescription>
        </DialogHeader>
        <ErrorNoticeBanner
          error={crear.isError ? crear.error : opciones.isError ? opciones.error : null}
          fallback={crear.isError ? getErrorMessage(crear.error) : undefined}
        />
        <form
          id={FORM_ID}
          noValidate
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <form.AppField name="opcion">
            {(f) => (
              <f.SelectField
                label="Grupo o ejecución"
                required
                placeholder={opciones.isPending ? "Cargando…" : "Seleccione"}
                options={lista.map((o) => ({
                  value: valorOpcionHilo(o),
                  label: o.tipo === "GRUPO" ? `${o.nombre} (mi grupo)` : o.nombre,
                }))}
                description={
                  elegida
                    ? `${acudientesTexto(elegida.acudientes)} ${elegida.acudientes === 1 ? "vigente quedaría" : "vigentes quedarían"} en el hilo.`
                    : "Solo aparecen los grupos y ejecuciones a su cargo."
                }
              />
            )}
          </form.AppField>
          <form.AppField name="asunto">
            {(f) => <f.TextField label="Asunto" required maxLength={MAX_ASUNTO} showCounter placeholder="Escriba el asunto" />}
          </form.AppField>
          <form.AppField name="mensaje">
            {(f) => (
              <f.TextareaField label="Primer mensaje" required maxLength={MAX_MENSAJE} rows={5} placeholder="Escriba su mensaje" />
            )}
          </form.AppField>
        </form>
        <DialogFooter>
          <Button variant="outline" color="neutral" type="button" onClick={cerrar} disabled={pendiente}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={pendiente || elegida?.acudientes === 0}
            aria-busy={pendiente}
          >
            Crear hilo
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDiscardDialog open={descartar} onOpenChange={setDescartar} onConfirm={onClose} />
    </Dialog>
  )
}
