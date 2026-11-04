import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PaperPlaneTiltIcon, SpinnerIcon } from "@/components/ui/icons"
import { useAppForm } from "@/lib/forms"
import { maxLength, required } from "@/lib/forms/messages"

const FORM_ID = "form-solicitar-aprobacion-asistencia"
const MAX_MOTIVO = 500

const schema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, required("El motivo de la corrección"))
    .max(MAX_MOTIVO, maxLength(MAX_MOTIVO, "El motivo de la corrección")),
})

/** Un estudiante cuyo registro guardado cambia: "Tomás Díaz (No asistió → Llegó tarde)". */
export interface CambioCorreccion {
  estudiante: string
  antes: string
  despues: string
}

export type SolicitudAprobacion =
  | { tipo: "correccion"; fecha: string; cambios: CambioCorreccion[] }
  | { tipo: "pendiente"; fecha: string; sesion: string }

interface DialogSolicitarAprobacionProps {
  solicitud: SolicitudAprobacion | null
  enviando: boolean
  onCancelar: () => void
  onEnviar: (motivo: string) => void
}

/**
 * Regla 77: con el período No calificable, corregir una sesión abre
 * _Corregir una sesión de asistencia_ y registrar una que quedó Pendiente abre
 * _Registrar una sesión pendiente_. Los dos piden el motivo y envían a
 * aprobación del Supervisor de sede; mientras tanto no cambia nada.
 */
export function DialogSolicitarAprobacion({ solicitud, enviando, onCancelar, onEnviar }: DialogSolicitarAprobacionProps) {
  const form = useAppForm({
    defaultValues: { motivo: "" },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => onEnviar(value.motivo.trim()),
  })

  const correccion = solicitud?.tipo === "correccion"

  return (
    <Dialog
      open={solicitud !== null}
      onOpenChange={(open) => {
        if (open || enviando) return
        form.reset()
        onCancelar()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{correccion ? "Corregir una sesión de asistencia" : "Registrar una sesión pendiente"}</DialogTitle>
        </DialogHeader>

        {solicitud && (
          <p className="text-sm">
            El período ya está No calificable.{" "}
            {solicitud.tipo === "correccion" ? (
              <>
                La corrección de la asistencia de <TextoCambios cambios={solicitud.cambios} /> del {solicitud.fecha}{" "}
                necesita la aprobación del Supervisor de sede. Mientras tanto, sigue vigente el registro anterior.
              </>
            ) : (
              <>
                El registro de la sesión del <b>{solicitud.fecha}</b> (<i>{solicitud.sesion}</i>) necesita la
                aprobación del Supervisor de sede. Mientras tanto, la sesión sigue Pendiente y no cuenta en los totales.
              </>
            )}
          </p>
        )}

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <form.AppField name="motivo">
            {(f) => (
              <f.TextareaField
                label="Motivo de la corrección"
                required
                maxLength={MAX_MOTIVO}
                placeholder="Explique por qué se corrige o se registra tarde"
              />
            )}
          </form.AppField>
        </form>

        <DialogFooter>
          <Button size="sm" variant="outline" color="neutral" disabled={enviando} onClick={onCancelar}>
            Cancelar
          </Button>
          <Button size="sm" type="submit" color="primary" form={FORM_ID} disabled={enviando} aria-busy={enviando}>
            {enviando ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <PaperPlaneTiltIcon data-icon="inline-start" />
            )}
            Enviar a aprobación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TextoCambios({ cambios }: { cambios: CambioCorreccion[] }) {
  if (cambios.length === 1) {
    const [c] = cambios
    return (
      <>
        <b>{c.estudiante}</b> (
        <i>
          {c.antes} → {c.despues}
        </i>
        )
      </>
    )
  }
  return <b>{cambios.length} estudiantes</b>
}
