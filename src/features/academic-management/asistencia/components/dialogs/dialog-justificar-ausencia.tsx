import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FloppyDiskIcon, SpinnerIcon } from "@/components/ui/icons"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { maxLength, minLength, required } from "@/lib/forms/messages"

import { selectCategoryQueryOptions } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { useAsistenciaJustificarMutation } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-justificar-mutation"
import type { JustificacionLocal } from "@/features/academic-management/asistencia/api/types/asistencia"

const FORM_ID = "form-justificar-ausencia"

const schema = z.object({
  justificacion: z
    .string()
    .trim()
    .min(5, minLength(5, "La justificación"))
    .max(200, maxLength(200, "La justificación")),
  fuente: z.number({ message: required("La fuente", { femenino: true }) }).min(1, required("La fuente", { femenino: true })),
})

interface DialogJustificarAusenciaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  estudiante: string
  /** Registros de la fila (una corrida de bloques se justifica entera). */
  pks: number[]
  justificacion: string | null
  fuente: number | null
  onJustificada: (mensaje: string) => void
  /** Sin registro guardado: no llama al servidor, la justificación viaja al guardar la sesión. */
  onLocal?: (valor: JustificacionLocal) => void
}

/**
 * Regla 109: justificar una ausencia o un retraso sin archivo, con una
 * explicación breve y su fuente (p. ej. una llamada del acudiente). No cambia
 * el estado de asistencia; la puede registrar el Responsable de grupo.
 */
export function DialogJustificarAusencia({
  open,
  onOpenChange,
  estudiante,
  pks,
  justificacion,
  fuente,
  onJustificada,
  onLocal,
}: DialogJustificarAusenciaProps) {
  const { data: fuentes = [] } = useQuery({
    ...selectCategoryQueryOptions("FUENTE_JUSTIFICACION"),
    enabled: open,
  })
  const opciones = fuentes.map((f) => ({ value: f.pk_lista_valor, label: f.nombre }))
  const justificar = useAsistenciaJustificarMutation()
  const noticeIdRef = useRef(0)
  const [notice, setNotice] = useState<{ id: number; message: string; variant: NoticeVariant } | null>(null)

  const form = useAppForm({
    defaultValues: { justificacion: justificacion ?? "", fuente: fuente ?? 0 },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      if (onLocal) {
        onLocal({
          justificacion: value.justificacion.trim(),
          fuente: value.fuente,
          fuenteNombre: opciones.find((o) => o.value === value.fuente)?.label ?? null,
        })
        onOpenChange(false)
        return
      }
      try {
        await justificar.mutateAsync({ pks, justificacion: value.justificacion.trim(), fuente: value.fuente })
        onJustificada("Se registró la justificación.")
        onOpenChange(false)
      } catch (error) {
        noticeIdRef.current += 1
        setNotice({ id: noticeIdRef.current, message: getErrorMessage(error), variant: "error" })
      }
    },
  })

  const quitar = async () => {
    if (onLocal) {
      onLocal({ justificacion: null, fuente: null, fuenteNombre: null })
      onOpenChange(false)
      return
    }
    try {
      await justificar.mutateAsync({ pks, justificacion: null, fuente: null })
      onJustificada("Se quitó la justificación.")
      onOpenChange(false)
    } catch (error) {
      noticeIdRef.current += 1
      setNotice({ id: noticeIdRef.current, message: getErrorMessage(error), variant: "error" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !justificar.isPending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Justificar sin archivo</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{estudiante}</p>

        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant={notice?.variant} autoCloseMs={12000} />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid gap-5"
        >
          <form.AppField name="justificacion">
            {(f) => (
              <f.TextareaField
                label="Justificación"
                required
                maxLength={200}
                placeholder="Explicación breve de la ausencia"
              />
            )}
          </form.AppField>
          <form.AppField name="fuente">
            {(f) => <f.SelectField label="Fuente de la justificación" required options={opciones} emptyValue={0} />}
          </form.AppField>
        </form>

        <DialogFooter>
          {justificacion && (
            <Button size="sm" variant="ghost" color="destructive" disabled={justificar.isPending} onClick={quitar}>
              Quitar justificación
            </Button>
          )}
          <Button size="sm" variant="outline" color="neutral" disabled={justificar.isPending} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" type="submit" color="primary" form={FORM_ID} disabled={justificar.isPending} aria-busy={justificar.isPending}>
            {justificar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
