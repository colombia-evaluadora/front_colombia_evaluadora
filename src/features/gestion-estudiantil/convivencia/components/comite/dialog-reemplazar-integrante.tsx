import { DatePicker } from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ArrowsLeftRightIcon, SpinnerIcon } from "@/components/ui/icons"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { formatDateValue, parseDateValue } from "@/lib/date-value"

import type { IntegranteComite } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { CampoPersona } from "@/features/gestion-estudiantil/convivencia/components/comite/campo-persona"
import { useComiteReemplazar } from "@/features/gestion-estudiantil/convivencia/hooks/use-comite-reemplazar"
import { dia } from "@/features/gestion-estudiantil/convivencia/utils/comite"

interface Props {
  integrante: IntegranteComite | null
  periodo: number | null
  onClose: () => void
}

/** Reemplazar — <Cargo> (G.2.COM.INT.2): el anterior queda con Hasta = la fecha y las actas anteriores no cambian. */
export function DialogReemplazarIntegrante({ integrante, periodo, onClose }: Props) {
  const r = useComiteReemplazar(integrante, onClose)
  return (
    <Dialog open={integrante != null} onOpenChange={(open) => !open && !r.pending && r.cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reemplazar — {integrante?.cargo_nombre}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={r.notice} onClose={r.cerrarNotice} variant="error" />
        {integrante && (
          <p className="text-sm text-muted-foreground">
            Integrante actual: <span className="font-medium text-foreground">{integrante.nombre}</span>, desde{" "}
            {formatFecha(dia(integrante.desde))}.
          </p>
        )}
        <div className="flex flex-col gap-4">
          <CampoPersona
            id="reemplazo-persona"
            dato={r.dato}
            periodo={periodo}
            valor={r.persona}
            error={r.errores.persona}
            onChange={r.setPersona}
          />
          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(r.errores.fecha) || undefined}>
            <FieldLabel htmlFor="reemplazo-fecha">Fecha*</FieldLabel>
            <DatePicker
              id="reemplazo-fecha"
              value={parseDateValue(r.fecha)}
              onChange={(d) => r.setFecha(d ? formatDateValue(d) : "")}
            />
            {r.errores.fecha && <FieldError>{r.errores.fecha}</FieldError>}
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          El anterior queda con Hasta = la fecha; las actas anteriores conservan sus integrantes.
        </p>
        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        <DialogFooter>
          <DialogClose render={<Button size="sm" type="button" variant="outline" color="neutral" />}>Cancelar</DialogClose>
          <Button size="sm" type="button" disabled={r.pending} onClick={r.reemplazar}>
            {r.pending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <ArrowsLeftRightIcon data-icon="inline-start" />
            )}
            Reemplazar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
