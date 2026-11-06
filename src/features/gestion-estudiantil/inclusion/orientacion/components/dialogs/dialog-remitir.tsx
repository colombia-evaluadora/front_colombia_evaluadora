import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SpinnerIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useAppForm } from "@/lib/forms"

import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { SeccionPlegable } from "@/features/gestion-estudiantil/convivencia/components/seccion-plegable"
import { useCrearRemision } from "@/features/gestion-estudiantil/inclusion/orientacion/api/mutations/atenciones"
import { REMISION_VACIA, SECCIONES_REMISION, esquemaRemision, remisionAlBackend } from "@/features/gestion-estudiantil/inclusion/orientacion/utils/remision-form"
import { AvisoPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"

interface Props {
  matricula: number
  estudiante: string
  onClose: () => void
  onRemitida: () => void
}

/** G.1.REP.2: remite desde el estudiante; queda Recibida y el backend avisa a orientación. */
export function DialogRemitir({ matricula, estudiante, onClose, onRemitida }: Props) {
  const motivos = useCatalogo("MOTIVO_ORIENTACION")
  const crear = useCrearRemision()
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null)
  const form = useAppForm({
    defaultValues: REMISION_VACIA,
    validators: { onSubmit: esquemaRemision },
    onSubmit: async ({ value }) => {
      try {
        await crear.mutateAsync(remisionAlBackend(value, matricula))
        onRemitida()
      } catch (e) {
        setNotice({ id: Date.now(), message: mensajePiar(e) })
      }
    },
  })
  return (
    <Dialog open onOpenChange={(o) => !o && !crear.isPending && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Remitir a orientación — {estudiante}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        <form.AppField name="motivo">{(f) => <f.SelectField label="Motivo" required options={motivos} placeholder="Seleccione" />}</form.AppField>
        <form.AppField name="descripcion">{(f) => <f.TextareaField label="Descripción breve" required maxLength={500} />}</form.AppField>
        <h3 className="text-sm font-medium">Secciones de la remisión</h3>
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {SECCIONES_REMISION.map((s) => (
            <form.Subscribe key={s.name} selector={(st) => Boolean(st.values[s.name].trim())}>
              {(lleno) => (
                <SeccionPlegable
                  defaultAbierta={false}
                  titulo={
                    <span className="font-normal">
                      {s.label}
                      {lleno && <span className="ml-2 text-xs text-muted-foreground">· diligenciada</span>}
                    </span>
                  }
                  contentClassName="p-4"
                >
                  <form.AppField name={s.name}>{(f) => <f.TextareaField label={s.label} maxLength={1500} placeholder={s.guia || undefined} />}</form.AppField>
                </SeccionPlegable>
              )}
            </form.Subscribe>
          ))}
        </div>
        <AvisoPiar>Si sospecha autolesión o ideación suicida, use el Reporte de salud mental.</AvisoPiar>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="muted" />}>Cancelar</DialogClose>
          <Button size="sm" disabled={crear.isPending} onClick={() => form.handleSubmit()}>
            {crear.isPending && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
            Remitir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
